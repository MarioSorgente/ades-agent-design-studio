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

function hasGeneratedGraders(packageValue: Record<string, unknown> | undefined): packageValue is Record<string, unknown> & { graders: unknown[] } {
  return Array.isArray(packageValue?.graders) && packageValue.graders.length > 0;
}

function hasPlaceholderGeneratedGraders(packageValue: Record<string, unknown> | undefined) {
  const graders = Array.isArray(packageValue?.graders) ? packageValue.graders : [];
  return graders.some((grader) => {
    const record = grader && typeof grader === "object" ? (grader as Record<string, unknown>) : {};
    const title = compactString(record.title);
    const evalSourceTitle = compactString(record.evalSourceTitle);
    return (title && isPlaceholderEvalTitle(title)) || (evalSourceTitle && isPlaceholderEvalTitle(evalSourceTitle));
  });
}

function isCompleteMasterPromptPackage(packageValue: Record<string, unknown> | undefined) {
  if (!hasGeneratedGraders(packageValue) || hasPlaceholderGeneratedGraders(packageValue)) return false;
  return packageValue.generationStage === undefined || packageValue.generationStage === "complete";
}

function compactString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "grader";
}

function trimTitle(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ").replace(/[?.!]+$/g, "");
  return trimmed.length > 92 ? `${trimmed.slice(0, 89).trim()}…` : trimmed;
}

function isPlaceholderEvalTitle(value: string) {
  return /^(untitled eval|evaluation coverage \d+)$/i.test(value.trim());
}

function listFromMaybe(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          return compactString(record.title) || compactString(record.name) || compactString(record.label) || compactString(record.description) || compactString(record.text);
        }
        return "";
      })
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function getStringField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    const direct = compactString(value);
    if (direct) return direct;
    const listed = listFromMaybe(value)[0];
    if (listed) return listed;
  }
  return "";
}

function getMeaningfulTitleField(record: Record<string, unknown>, keys: string[]) {
  const value = getStringField(record, keys);
  return value && !isPlaceholderEvalTitle(value) ? value : "";
}

function deriveEvalTitle(value: unknown, index: number) {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const evalRecord = record.eval && typeof record.eval === "object" ? (record.eval as Record<string, unknown>) : record;
  const directTitle = getMeaningfulTitleField(record, ["title", "name", "label", "evalName"]) || getMeaningfulTitleField(evalRecord, ["title", "name", "label", "evalName"]);
  if (directTitle) return trimTitle(directTitle);

  const descriptiveText =
    getStringField(evalRecord, ["question", "evalQuestion", "criteria", "passCriteria", "metric", "whyItMatters"]) ||
    getStringField(record, ["question", "evalQuestion", "criteria", "passCriteria", "metric", "completionCriteria"]);
  if (descriptiveText) return trimTitle(descriptiveText);

  const stepTitle = getMeaningfulTitleField(record, ["stepTitle"]);
  if (stepTitle) return trimTitle(`${stepTitle} quality check`);

  return `Evaluation coverage ${index + 1}`;
}

type FallbackEvalInput = {
  id: string;
  title: string;
  stepId: unknown;
  stepTitle: unknown;
  eval: unknown;
  completionCriteria: unknown;
  safeguards: unknown;
  failureModes: unknown;
};

function normalizeEvalInput(value: unknown, index: number): FallbackEvalInput {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    id: compactString(record.id, `inferred-eval-${index + 1}`),
    title: deriveEvalTitle(record, index),
    stepId: record.stepId,
    stepTitle: record.stepTitle,
    eval: record.eval,
    completionCriteria: record.completionCriteria,
    safeguards: record.safeguards,
    failureModes: record.failureModes,
  };
}

function buildFallbackPythonSource(passTerms: string[], failTerms: string[]) {
  return `import re\n\nPASS_TERMS = ${JSON.stringify(passTerms)}\nFAIL_TERMS = ${JSON.stringify(failTerms)}\n\ndef grade(output):\n    text = output if isinstance(output, str) else str(output)\n    normalized = text.lower()\n    pass_hits = sum(1 for term in PASS_TERMS if term and term.lower() in normalized)\n    fail_hits = sum(1 for term in FAIL_TERMS if term and term.lower() in normalized)\n    score = max(0.0, min(1.0, (pass_hits / max(1, len(PASS_TERMS))) - (0.25 * fail_hits)))\n    return {"score": score, "pass": score >= 0.8, "reason": f"Matched {pass_hits}/{len(PASS_TERMS)} expected signals and {fail_hits} failure signals."}\n`;
}

function buildDeterministicGraders(compactEvalInputs: unknown[], canonicalData: Record<string, unknown>) {
  const workflowSteps = Array.isArray(canonicalData.workflowSteps) ? canonicalData.workflowSteps : [];
  const sourceInputs = compactEvalInputs.length > 0
    ? compactEvalInputs.map(normalizeEvalInput)
    : workflowSteps.slice(0, 5).map((step, index) => {
        const stepRecord = step && typeof step === "object" ? (step as Record<string, unknown>) : {};
        return normalizeEvalInput({
          id: `inferred-${compactString(stepRecord.id, `step-${index + 1}`)}`,
          title: `${compactString(stepRecord.title, `Step ${index + 1}`)} completion quality`,
          stepId: stepRecord.id,
          stepTitle: stepRecord.title,
          eval: { question: compactString(stepRecord.completionCriteria, "Does the output satisfy this workflow step's completion criteria?") },
          completionCriteria: stepRecord.completionCriteria,
          safeguards: stepRecord.safeguards,
          failureModes: stepRecord.failureModes,
        }, index);
      });

  const inputs = sourceInputs.length > 0
    ? sourceInputs
    : [normalizeEvalInput({ id: "inferred-project-quality", title: "Overall project output quality", eval: { question: "Does the agent output satisfy the project goal?" } }, 0)];

  return inputs.slice(0, 8).map((input, index) => {
    const evalRecord = input.eval && typeof input.eval === "object" ? (input.eval as Record<string, unknown>) : {};
    const question = compactString(evalRecord.question) || compactString(evalRecord.criteria) || compactString(evalRecord.metric) || input.title;
    const stepTitle = compactString(input.stepTitle, "the relevant workflow step");
    const passCriteria = [
      `The output directly satisfies: ${question}`,
      `The output includes evidence that ${stepTitle} met its completion criteria.`,
      "The output is specific, actionable, and grounded in the provided project context.",
    ];
    const safeguardSignals = listFromMaybe(input.safeguards);
    const failureSignals = listFromMaybe(input.failureModes);
    const failCriteria = [
      `The output does not answer or satisfy: ${question}`,
      "The output is vague, generic, or lacks project-specific evidence.",
      ...(failureSignals.length ? failureSignals.slice(0, 3).map((item) => `The output shows this failure mode: ${item}`) : ["The output omits required constraints, risks, or escalation details."]),
    ];
    const checksToPerform = [
      `Inspect whether the response addresses ${question}.`,
      `Verify evidence that ${stepTitle} was completed according to the board criteria.`,
      ...(safeguardSignals.length ? safeguardSignals.slice(0, 3).map((item) => `Check safeguard coverage: ${item}`) : ["Check that relevant risks and constraints are handled explicitly."]),
    ];
    const id = `fallback-${slugify(input.id || input.title)}-${index + 1}`;
    const guidelines = `Grade the candidate output for ${input.title}. Award a passing score only when it satisfies the evaluation question (${question}), demonstrates completion of ${stepTitle}, and avoids the listed failure criteria. Use the rubric from 0 to 5 and require at least 4/5 to pass.`;

    return {
      id,
      title: input.title,
      evalSourceId: input.id,
      evalSourceTitle: input.title,
      purpose: `Evaluate whether the agent output meets the expected quality bar for ${stepTitle}.`,
      whyNeeded: "This board-derived grader keeps evaluation coverage available when the AI grader-writing step is temporarily unavailable.",
      whatItEvaluates: question,
      whenToUse: "Run after the agent produces an output for the associated workflow step or before release as part of regression evaluation.",
      graderOverview: {
        summary: `Checks ${input.title} using the board's evaluation question, completion criteria, safeguards, and failure modes.`,
        riskIfMissing: "Without this grader, teams may ship outputs that look plausible but fail the intended workflow criteria.",
        evaluatedBehavior: question,
        checksToPerform,
        evidenceToInspect: ["Agent output", "Step completion evidence", "Relevant safeguards and failure modes"],
        passDecisionRule: "Pass only when all core pass criteria are met and no critical fail criteria are present.",
        borderlineHandling: "If evidence is partial, mark as fail and request more explicit support in the output.",
        runTiming: "Run on each candidate output and during regression checks.",
      },
      graderType: "hybrid",
      instructions: guidelines,
      passCriteria,
      failCriteria,
      scoringRubric: {
        score0: "No meaningful attempt or unrelated output.",
        score1: "Mentions the topic but misses the core evaluation requirement.",
        score2: "Partially addresses the requirement with major gaps or unsupported claims.",
        score3: "Mostly addresses the requirement but leaves important ambiguity or missing evidence.",
        score4: "Satisfies the requirement with clear, project-specific evidence and only minor gaps.",
        score5: "Fully satisfies the requirement, handles safeguards, and provides strong evidence for the decision.",
      },
      expectedOutputShape: compactString(evalRecord.expectedOutputShape, "A scored pass/fail judgment with concise evidence and remediation notes."),
      openaiSimpleGrader: { name: `${slugify(input.title)}_simple`, model: "gpt-5-mini", scoringGuidelines: guidelines, passThreshold: 0.8 },
      openaiPythonGrader: { name: `${slugify(input.title)}_python`, sourceCode: buildFallbackPythonSource(passCriteria, failCriteria), passThreshold: 0.8, imageTag: null },
    };
  });
}
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
    if (isCompleteMasterPromptPackage(existingPackage)) {
      fallbackCachedPackage = existingPackage ?? null;
    }
    const existingStage = typeof existingPackage?.generationStage === "string" ? existingPackage.generationStage : null;
    if (isCompleteMasterPromptPackage(existingPackage) && !forceRegenerate) {
      return NextResponse.json({ masterPromptPackage: existingPackage, cached: true, stage: "complete" });
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
      title: deriveEvalTitle({ eval: evalItem, stepTitle: step.title, completionCriteria: step.completionCriteria }, index),
      stepId: step.id,
      stepTitle: step.title,
      eval: evalItem,
      completionCriteria: step.completionCriteria,
      safeguards: step.safeguards,
      failureModes: step.failureModes,
    })));
    const legacyEvalNodeInputs = boardNodes
      .filter((node) => node.type === "eval")
      .map((node, index) => {
        const data = (node.data as Record<string, unknown>) ?? {};
        return {
          id: typeof node.id === "string" && node.id.trim() ? node.id : `eval-node-${index + 1}`,
          title: deriveEvalTitle({ title: data.evalName, label: data.label, eval: { question: data.evalQuestion, criteria: data.evalCriteria, metric: data.evalMetric }, stepTitle: data.label, completionCriteria: data.completionCriteria }, index),
          stepId: typeof node.id === "string" ? node.id : `eval-node-${index + 1}`,
          stepTitle: typeof data.label === "string" ? data.label : "Eval node",
          eval: {
            question: typeof data.evalQuestion === "string" ? data.evalQuestion : "",
            metric: typeof data.evalMetric === "string" ? data.evalMetric : "",
            category: typeof data.evalCategory === "string" ? data.evalCategory : "task_success",
            scope: typeof data.evalScope === "string" ? data.evalScope : "step",
            criteria: typeof data.evalCriteria === "string" ? data.evalCriteria : "",
            method: typeof data.evalMethod === "string" ? data.evalMethod : "",
            threshold: typeof data.evalThreshold === "string" ? data.evalThreshold : "",
            dataset: typeof data.evalDataset === "string" ? data.evalDataset : "",
          },
          completionCriteria: typeof data.completionCriteria === "string" ? data.completionCriteria : "",
          safeguards: Array.isArray(data.risks) ? data.risks : [],
          failureModes: Array.isArray(data.commonFailureModes) ? data.commonFailureModes : [],
        };
      });
    const compactEvalInputs = evalInputs.length > 0 ? evalInputs : legacyEvalNodeInputs;

    const openai = getOpenAIClient();

    const shouldResumeStageB =
      (existingStage === "stage_a_complete" && Array.isArray(existingPackage?.graders) && (existingPackage?.graders as unknown[]).length === 0) ||
      hasPlaceholderGeneratedGraders(existingPackage);

    let stageAPackage: Record<string, unknown>;
    if (shouldResumeStageB) {
      stageAPackage = { ...existingPackage, graders: [] } as Record<string, unknown>;
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
    let graders: unknown[];
    let stageBModel: unknown = stageAPackage.model;
    let usedFallbackGraders = false;
    try {
      const stageBResponse = await withRetries(() => openai.responses.create({
        model: ADES_OPENAI_MODEL,
        input: [
          { role: "system", content: STAGE_B_SYSTEM },
          { role: "user", content: `Stage A context:
${JSON.stringify(stageAPackage)}

Compact eval inputs:
${JSON.stringify(compactEvalInputs)}` },
        ],
        text: { format: { type: "json_schema", name: "ades_stage_b_graders", schema: GRADER_SCHEMA, strict: true } },
      }));
      stageBModel = stageBResponse.model ?? stageAPackage.model;
      const stageBText = extractResponseText(stageBResponse);
      if (!stageBText) throw new Error("Stage B returned empty output.");
      graders = JSON.parse(stageBText) as unknown[];
      if (!Array.isArray(graders) || graders.length === 0) throw new Error("Stage B returned no graders.");
    } catch (stageBError) {
      usedFallbackGraders = true;
      console.warn("[/api/master-prompt-package] Stage B grader generation failed; saving deterministic fallback graders.", {
        projectId,
        message: stageBError instanceof Error ? stageBError.message : "Unknown Stage B failure",
      });
      graders = buildDeterministicGraders(compactEvalInputs, canonicalData);
    }

    const masterPromptPackage = {
      ...stageAPackage,
      graders,
      generationStage: "complete",
      graderGenerationSource: usedFallbackGraders ? "deterministic_fallback" : "openai",
      model: typeof stageBModel === "string" ? stageBModel : stageAPackage.model,
    };
    await projectRef.update({ masterPromptPackage, updatedAt: FieldValue.serverTimestamp() });

    return NextResponse.json({ masterPromptPackage, cached: false, stage: "complete", usedFallbackGraders, totalMs: Date.now() - t0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate master prompt package.";
    if (message.includes("Missing Firebase auth token")) return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: "Couldn’t generate the master prompt package. Please try again.", stage, cachedPackage: fallbackCachedPackage, cached: Boolean(fallbackCachedPackage) }, { status: 500 });
  }
}
