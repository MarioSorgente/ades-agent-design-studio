import { FieldValue } from "firebase-admin/firestore";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { getAuthenticatedUser, isAdminBypass } from "@/lib/usageGate";

const STAGE_A_SYSTEM = `You are ADES, an expert AI product design strategist.
Return JSON only.
Use ONLY provided ADES canonical data.
If data is missing, use conservative assumptions and list them in assumptionsUsed.
Create:
- promptTitle
- masterSystemPrompt (implementation-ready; with clear headers)
- qualitySummary
- assumptionsUsed
- qualityScore (0-100)
Do not include graders.`;

const STAGE_B_SYSTEM = `You are ADES, an evaluator architect.
Return JSON only.
Create graders from compact structured inputs.
Use only provided data and stage A context.
If eval source IDs are missing for inferred graders, use inferred-* ids.
Each grader must include all required fields and both simple + python grader artifacts.`;

const PROMPT_PACKAGE_PROMPT_V1 = "prompt-package-v1";

const STAGE_A_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    promptTitle: { type: "string" },
    masterSystemPrompt: { type: "string" },
    qualityScore: { type: "number" },
    qualitySummary: { type: "string" },
    assumptionsUsed: { type: "array", items: { type: "string" } },
  },
  required: ["promptTitle", "masterSystemPrompt", "qualityScore", "qualitySummary", "assumptionsUsed"],
} as const;

const GRADER_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      evalSourceId: { type: ["string", "null"] },
      evalSourceTitle: { type: ["string", "null"] },
      purpose: { type: "string" },
      whyNeeded: { type: "string" },
      whatItEvaluates: { type: "string" },
      whenToUse: { type: "string" },
      graderOverview: {
        type: "object",
        additionalProperties: false,
        properties: {
          summary: { type: "string" }, riskIfMissing: { type: "string" }, evaluatedBehavior: { type: "string" },
          checksToPerform: { type: "array", items: { type: "string" } }, evidenceToInspect: { type: "array", items: { type: "string" } },
          passDecisionRule: { type: "string" }, borderlineHandling: { type: "string" }, runTiming: { type: "string" },
        },
        required: ["summary", "riskIfMissing", "evaluatedBehavior", "checksToPerform", "evidenceToInspect", "passDecisionRule", "borderlineHandling", "runTiming"],
      },
      graderType: { type: "string", enum: ["model_graded", "rule_based", "hybrid"] },
      instructions: { type: "string" }, passCriteria: { type: "array", items: { type: "string" } }, failCriteria: { type: "array", items: { type: "string" } },
      scoringRubric: { type: "object", additionalProperties: false, properties: { score0: { type: "string" }, score1: { type: "string" }, score2: { type: "string" }, score3: { type: "string" }, score4: { type: "string" }, score5: { type: "string" } }, required: ["score0", "score1", "score2", "score3", "score4", "score5"] },
      expectedOutputShape: { type: ["string", "null"] },
      openaiSimpleGrader: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, model: { type: "string" }, scoringGuidelines: { type: "string" }, passThreshold: { type: "number" } }, required: ["name", "model", "scoringGuidelines", "passThreshold"] },
      openaiPythonGrader: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, sourceCode: { type: "string" }, passThreshold: { type: "number" }, imageTag: { type: ["string", "null"] } }, required: ["name", "sourceCode", "passThreshold", "imageTag"] },
    },
    required: ["id", "title", "evalSourceId", "evalSourceTitle", "purpose", "whyNeeded", "whatItEvaluates", "whenToUse", "graderOverview", "graderType", "instructions", "passCriteria", "failCriteria", "scoringRubric", "expectedOutputShape", "openaiSimpleGrader", "openaiPythonGrader"],
  },
} as const;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");
  return new OpenAI({ apiKey, timeout: 240_000, maxRetries: 3 });
}

const ADES_OPENAI_MODEL = "gpt-5-mini";
type PackageRequest = { projectId?: string; forceRegenerate?: boolean };

async function withRetries<T>(fn: () => Promise<T>, attempts = 3) {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i += 1) {
    try { return await fn(); } catch (error) { lastError = error; if (i < attempts) await new Promise((r) => setTimeout(r, i * 400)); }
  }
  throw lastError;
}

function extractResponseText(response: unknown): string {
  if (response && typeof response === "object" && typeof (response as { output_text?: unknown }).output_text === "string" && (response as { output_text: string }).output_text.trim()) {
    return (response as { output_text: string }).output_text;
  }
  const output = response && typeof response === "object" ? (response as { output?: unknown[] }).output : null;
  if (!Array.isArray(output)) return "";
  const textParts: string[] = [];
  for (const item of output) {
    const content = item && typeof item === "object" ? (item as { content?: unknown[] }).content : null;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part && typeof part === "object" && (part as { type?: unknown }).type === "output_text") {
        const value = (part as { text?: unknown }).text;
        if (typeof value === "string" && value.trim()) textParts.push(value);
      }
    }
  }
  return textParts.join("\n").trim();
}

export async function POST(request: Request) {
  const t0 = Date.now();
  let stage = "start";
  let fallbackCachedPackage: Record<string, unknown> | null = null;
  try {
    const { uid, email } = await getAuthenticatedUser(request);
    const body = (await request.json()) as PackageRequest;
    const projectId = typeof body.projectId === "string" ? body.projectId.trim().slice(0, 120) : "";
    if (!projectId) return NextResponse.json({ error: "projectId is required." }, { status: 400 });

    const db = getFirebaseAdminDb();
    const projectRef = db.collection("projects").doc(projectId);
    const snapshot = await projectRef.get();
    if (!snapshot.exists) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const project = snapshot.data() as Record<string, unknown>;
    if (project.ownerUid !== uid) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const forceRegenerate = body.forceRegenerate === true && isAdminBypass(email);
    const existingPackage = project.masterPromptPackage as Record<string, unknown> | undefined;
    if (existingPackage && typeof existingPackage === "object" && (existingPackage.generationStage === "complete" || Array.isArray(existingPackage.graders))) {
      fallbackCachedPackage = existingPackage;
    }
    const existingStage = typeof existingPackage?.generationStage === "string" ? existingPackage.generationStage : null;
    if (existingPackage && typeof existingPackage === "object" && !forceRegenerate && existingStage !== "stage_a_complete") {
      return NextResponse.json({ masterPromptPackage: existingPackage, cached: true, stage: existingStage ?? "complete" });
    }

    const board = project.board && typeof project.board === "object" ? project.board : null;
    const boardNodes = Array.isArray((board as { nodes?: unknown[] } | null)?.nodes) ? ((board as { nodes: Array<Record<string, unknown>> }).nodes ?? []) : [];
    const canonicalData = {
      promptSpecVersion: PROMPT_PACKAGE_PROMPT_V1,
      projectTitle: project.title ?? "Untitled design",
      blueprint: {
        initiative: project.ideaPrompt ?? "", targetUser: project.audience ?? "", contextProblem: project.contextProblem ?? "",
        desiredOutcome: project.desiredOutcome ?? "", constraints: project.constraints ?? "", assumptions: Array.isArray(project.assumptions) ? project.assumptions : [], escalationExpectations: project.humanInvolvement ?? "",
      },
      workflowSteps: boardNodes.map((node) => {
        const data = (node.data as Record<string, unknown>) ?? {};
        return { id: node.id, title: data.label ?? "", purpose: data.purpose ?? "", completionCriteria: data.completionCriteria ?? "", reflectionPoints: data.reflectionHooks ?? [], evals: data.evals ?? [], safeguards: data.risks ?? [], failureModes: data.commonFailureModes ?? [] };
      }),
      projectRisks: Array.isArray(project.risks) ? project.risks : [],
    };

    const evalInputs = canonicalData.workflowSteps.flatMap((step) => (Array.isArray(step.evals) ? step.evals : []).map((evalItem, index) => ({
      id: typeof (evalItem as { id?: unknown })?.id === "string" ? (evalItem as { id: string }).id : `${step.id}-eval-${index + 1}`,
      title: typeof (evalItem as { title?: unknown })?.title === "string" ? (evalItem as { title: string }).title : "Untitled eval",
      stepId: step.id,
      stepTitle: step.title,
      eval: evalItem,
      completionCriteria: step.completionCriteria,
      safeguards: step.safeguards,
      failureModes: step.failureModes,
    })));

    const openai = getOpenAIClient();

    const shouldResumeStageB = existingStage === "stage_a_complete" && Array.isArray(existingPackage?.graders) && (existingPackage?.graders as unknown[]).length === 0;

    let stageAPackage: Record<string, unknown>;
    if (shouldResumeStageB) {
      stageAPackage = { ...existingPackage } as Record<string, unknown>;
    } else {
      stage = "stage_a";
      const stageAResponse = await withRetries(() => openai.responses.create({
      model: ADES_OPENAI_MODEL,
      input: [{ role: "system", content: STAGE_A_SYSTEM }, { role: "user", content: `Canonical data:\n${JSON.stringify(canonicalData)}` }],
      text: { format: { type: "json_schema", name: "ades_stage_a", schema: STAGE_A_SCHEMA, strict: true } },
    }));
      const stageAText = extractResponseText(stageAResponse);
      if (!stageAText) throw new Error("Stage A returned empty output.");
      const stageAParsed = JSON.parse(stageAText) as Record<string, unknown>;

      stageAPackage = {
      packageVersion: 5,
      promptTitle: String(stageAParsed.promptTitle ?? "Master Prompt Package"),
      masterSystemPrompt: String(stageAParsed.masterSystemPrompt ?? ""),
      qualityScore: Math.max(0, Math.min(100, Number(stageAParsed.qualityScore ?? 0))),
      qualitySummary: String(stageAParsed.qualitySummary ?? ""),
      assumptionsUsed: Array.isArray(stageAParsed.assumptionsUsed) ? stageAParsed.assumptionsUsed : [],
      graders: [],
      generatedAt: new Date().toISOString(),
      generatedByUid: uid,
      model: stageAResponse.model ?? ADES_OPENAI_MODEL,
      generationStage: "stage_a_complete",
    };

      await projectRef.update({ masterPromptPackage: stageAPackage, updatedAt: FieldValue.serverTimestamp() });
    }

    stage = "stage_b";
    const stageBResponse = await withRetries(() => openai.responses.create({
      model: ADES_OPENAI_MODEL,
      input: [
        { role: "system", content: STAGE_B_SYSTEM },
        { role: "user", content: `Stage A context:\n${JSON.stringify(stageAPackage)}\n\nCompact eval inputs:\n${JSON.stringify(evalInputs)}` },
      ],
      text: { format: { type: "json_schema", name: "ades_stage_b_graders", schema: GRADER_SCHEMA, strict: true } },
    }));
    const stageBText = extractResponseText(stageBResponse);
    if (!stageBText) throw new Error("Stage B returned empty output.");
    const graders = JSON.parse(stageBText) as unknown[];

    const masterPromptPackage = { ...stageAPackage, graders, generationStage: "complete", model: stageBResponse.model ?? stageAPackage.model };
    await projectRef.update({ masterPromptPackage, updatedAt: FieldValue.serverTimestamp() });

    return NextResponse.json({ masterPromptPackage, cached: false, stage: "complete", totalMs: Date.now() - t0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate master prompt package.";
    if (message.includes("Missing Firebase auth token")) return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: "Couldn’t generate the master prompt package. Please try again.", stage, cachedPackage: fallbackCachedPackage, cached: Boolean(fallbackCachedPackage) }, { status: 500 });
  }
}
