import { FieldValue } from "firebase-admin/firestore";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { getAuthenticatedUser, isAdminBypass } from "@/lib/usageGate";

const MASTER_PROMPT_SYSTEM = `You are ADES, an expert AI product design strategist that converts ADES board designs into implementation-ready prompt packages.

You must output a JSON package with:
1) a builder-ready masterSystemPrompt
2) concrete graders tied to ADES evidence

CRITICAL REQUIREMENTS
- Use ONLY information present in the provided ADES project data.
- Never invent unsupported business facts, policies, tools, or metrics.
- If data is missing, explicitly list assumptions in assumptionsUsed and keep them conservative.
- Be concrete, operational, and testable. Avoid generic advice.
- Keep language practical for engineers and PMs implementing an agent.

MASTER SYSTEM PROMPT REQUIREMENTS
The generated masterSystemPrompt MUST include clear section headers and complete instructions for all of:
- Role / Persona
- Goal
- Audience / User
- Operating Context
- Inputs the Agent Receives
- Workflow Instructions
- Reasoning and Reflection Instructions
- Tool / Data Use Instructions
- Safeguards and Failure Modes
- Human Escalation Rules
- Constraints
- Output Requirements
- Voice and Tone
- Assumptions
- Final Quality Checklist

For each section, provide specific instructions grounded in the ADES data. If tools are missing, explicitly say no tool access is assumed.

GRADER REQUIREMENTS
- Create a grader for each explicit eval when available (step-level and workflow-level).
- Incorporate safeguards, risks, reflection points, completion criteria, and escalation expectations into grader logic.
- If explicit eval coverage is missing, create a SMALL set of recommended graders inferred from risks/completion criteria and state this in purpose/instructions.
- Do NOT fabricate fake source eval IDs. Use inferred-* IDs for recommended graders.

Each grader must include:
- id, title, evalSourceId, evalSourceTitle, purpose, graderType, instructions,
  passCriteria, failCriteria, scoringRubric, expectedOutputShape

Each grader's instructions must clearly define:
- behavior being evaluated
- evidence to inspect
- pass/fail thresholds
- borderline-case handling
- practical 0-5 scoring usage

SCORING RUBRIC MEANINGS
- score0: completely fails / unsafe / irrelevant
- score1: mostly fails with tiny partial relevance
- score2: partially addresses but misses important requirements
- score3: acceptable but incomplete or weak
- score4: strong with minor gaps
- score5: excellent, complete, safe, implementation-ready

QUALITY SCORE
- qualityScore is 0-100 for package usefulness for implementation handoff.
- qualitySummary must briefly justify score with concrete strengths/gaps.

Return valid JSON only, matching the schema exactly.`;

const PACKAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    promptTitle: { type: "string" },
    masterSystemPrompt: { type: "string" },
    graders: {
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
          graderType: { type: "string", enum: ["model_graded", "rule_based", "hybrid"] },
          instructions: { type: "string" },
          passCriteria: { type: "array", items: { type: "string" } },
          failCriteria: { type: "array", items: { type: "string" } },
          scoringRubric: {
            type: "object",
            additionalProperties: false,
            properties: {
              score0: { type: "string" },
              score1: { type: "string" },
              score2: { type: "string" },
              score3: { type: "string" },
              score4: { type: "string" },
              score5: { type: "string" },
            },
            required: ["score0", "score1", "score2", "score3", "score4", "score5"],
          },
          expectedOutputShape: { type: ["string", "null"] },
        },
        required: ["id", "title", "evalSourceId", "evalSourceTitle", "purpose", "graderType", "instructions", "passCriteria", "failCriteria", "scoringRubric", "expectedOutputShape"],
      },
    },
    qualityScore: { type: "number" },
    qualitySummary: { type: "string" },
    assumptionsUsed: { type: "array", items: { type: "string" } },
  },
  required: ["promptTitle", "masterSystemPrompt", "graders", "qualityScore", "qualitySummary", "assumptionsUsed"],
} as const;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");
  return new OpenAI({ apiKey });
}

const ADES_OPENAI_MODEL = "gpt.5.nano";

type PackageRequest = { projectId?: string };

export async function POST(request: Request) {
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

    const existingPackage = project.masterPromptPackage;
    if (existingPackage && typeof existingPackage === "object") {
      return NextResponse.json({ masterPromptPackage: existingPackage, cached: true });
    }

    if (projectId.startsWith("demo-") && !isAdminBypass(email)) {
      return NextResponse.json({ error: "Master prompt generation is unavailable for demo projects." }, { status: 403 });
    }

    if (project.status === "generating") {
      return NextResponse.json({ error: "Project is still generating." }, { status: 409 });
    }

    const board = project.board && typeof project.board === "object" ? project.board : null;
    const boardNodes = Array.isArray((board as { nodes?: unknown[] } | null)?.nodes) ? ((board as { nodes: Array<Record<string, unknown>> }).nodes ?? []) : [];
    const canonicalData = {
      projectTitle: project.title ?? "Untitled design",
      blueprint: {
        initiative: project.ideaPrompt ?? "",
        targetUser: project.audience ?? "",
        contextProblem: project.contextProblem ?? "",
        desiredOutcome: project.desiredOutcome ?? "",
        constraints: project.constraints ?? "",
        assumptions: Array.isArray(project.assumptions) ? project.assumptions : [],
        escalationExpectations: project.humanInvolvement ?? "",
      },
      workflowSteps: boardNodes.map((node) => {
        const data = (node.data as Record<string, unknown>) ?? {};
        return {
          id: node.id,
          title: data.label ?? "",
          type: node.type,
          purpose: data.purpose ?? "",
          inputs: data.inputs ?? "",
          outputs: data.outputs ?? "",
          completionCriteria: data.completionCriteria ?? "",
          reflectionPoints: data.reflectionHooks ?? [],
          evals: data.evals ?? [],
          safeguards: data.risks ?? [],
          failureModes: data.commonFailureModes ?? [],
        };
      }),
      projectRisks: Array.isArray(project.risks) ? project.risks : [],
    };

    const openai = getOpenAIClient();
    const response = await openai.responses.create({
      model: ADES_OPENAI_MODEL,
      input: [
        { role: "system", content: MASTER_PROMPT_SYSTEM },
        {
          role: "user",
          content: `Create the master prompt package from this canonical ADES project data. Build an implementation-ready masterSystemPrompt and concrete, testable graders with traceability to ADES workflow/evals/risks/safeguards/escalation rules.\n\nReturn exactly this JSON shape: {"promptTitle":"string","masterSystemPrompt":"string","graders":[{"id":"string","title":"string","evalSourceId":"string optional","evalSourceTitle":"string optional","purpose":"string","graderType":"model_graded | rule_based | hybrid","instructions":"string","passCriteria":["string"],"failCriteria":["string"],"scoringRubric":{"score0":"string","score1":"string","score2":"string","score3":"string","score4":"string","score5":"string"},"expectedOutputShape":"string optional"}],"qualityScore":0,"qualitySummary":"string","assumptionsUsed":["string"]}\n\nData:\n${JSON.stringify(canonicalData)}`,
        },
      ],
      text: { format: { type: "json_schema", name: "ades_master_prompt_package", schema: PACKAGE_SCHEMA, strict: true } },
    });

    if (!response.output_text) {
      throw new Error("OpenAI returned an empty response.");
    }

    const parsed = JSON.parse(response.output_text) as Record<string, unknown>;
    const normalizedGraders = Array.isArray(parsed.graders)
      ? parsed.graders.map((grader) => {
          if (!grader || typeof grader !== "object") return grader;
          const graderRecord = grader as Record<string, unknown>;
          return {
            ...graderRecord,
            evalSourceId: graderRecord.evalSourceId ?? undefined,
            evalSourceTitle: graderRecord.evalSourceTitle ?? undefined,
            expectedOutputShape: graderRecord.expectedOutputShape ?? undefined,
          };
        })
      : [];
    const qualityScore = Math.max(0, Math.min(100, Number(parsed.qualityScore ?? 0)));
    const masterPromptPackage = {
      ...parsed,
      graders: normalizedGraders,
      qualityScore,
      generatedAt: new Date().toISOString(),
      generatedByUid: uid,
      model: response.model ?? ADES_OPENAI_MODEL,
    };

    await projectRef.update({ masterPromptPackage, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ masterPromptPackage, cached: false });
  } catch (error) {
    const detailedMessage = error instanceof Error ? error.message : String(error);
    console.error("[/api/master-prompt-package] Failed to generate master prompt package", {
      message: detailedMessage,
      error,
    });
    const message = error instanceof Error ? error.message : "Failed to generate master prompt package.";
    if (message.includes("Missing Firebase auth token")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: "Couldn’t generate the master prompt package. Please try again." }, { status: 500 });
  }
}
