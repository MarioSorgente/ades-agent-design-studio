import { FieldValue } from "firebase-admin/firestore";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { getAuthenticatedUser, isAdminBypass } from "@/lib/usageGate";

const MASTER_PROMPT_SYSTEM = `You are ADES, an expert AI product design strategist specialized in turning agent designs into production-ready system prompts and evaluation graders.

Your job is to convert an ADES agent design into a “master prompt package”.

The package must help a builder take the ADES canvas and actually implement the agent.

You will receive structured project data containing some or all of:
- blueprint
- initiative
- target user
- context/problem
- desired outcome
- constraints
- assumptions
- workflow steps
- step inputs
- step outputs
- completion criteria
- reflection points
- evals
- safeguards
- risks
- escalation expectations

Use only the provided information.
Do not invent unsupported business facts.
Do not pretend missing information is known.
If important information is missing, state it clearly as an operating assumption.

Be specific, practical, and implementation-ready.
Avoid generic AI advice.
Avoid vague phrases like “ensure quality” unless you explain exactly how.
Avoid product marketing language.
Avoid long unnecessary explanation.

Your output must be valid JSON only and must exactly match the expected shape.`;

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
          evalSourceId: { type: "string" },
          evalSourceTitle: { type: "string" },
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
          expectedOutputShape: { type: "string" },
        },
        required: ["id", "title", "purpose", "graderType", "instructions", "passCriteria", "failCriteria", "scoringRubric"],
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
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: MASTER_PROMPT_SYSTEM },
        {
          role: "user",
          content: `Create the master prompt package from this canonical ADES project data.\n\nReturn exactly this JSON shape: {"promptTitle":"string","masterSystemPrompt":"string","graders":[{"id":"string","title":"string","evalSourceId":"string optional","evalSourceTitle":"string optional","purpose":"string","graderType":"model_graded | rule_based | hybrid","instructions":"string","passCriteria":["string"],"failCriteria":["string"],"scoringRubric":{"score0":"string","score1":"string","score2":"string","score3":"string","score4":"string","score5":"string"},"expectedOutputShape":"string optional"}],"qualityScore":0,"qualitySummary":"string","assumptionsUsed":["string"]}\n\nData:\n${JSON.stringify(canonicalData)}`,
        },
      ],
      text: { format: { type: "json_schema", name: "ades_master_prompt_package", schema: PACKAGE_SCHEMA, strict: true } },
    });

    if (!response.output_text) {
      throw new Error("OpenAI returned an empty response.");
    }

    const parsed = JSON.parse(response.output_text) as Record<string, unknown>;
    const qualityScore = Math.max(0, Math.min(100, Number(parsed.qualityScore ?? 0)));
    const masterPromptPackage = {
      ...parsed,
      qualityScore,
      generatedAt: new Date().toISOString(),
      generatedByUid: uid,
      model: response.model ?? "gpt-4.1-mini",
    };

    await projectRef.update({ masterPromptPackage, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ masterPromptPackage, cached: false });
  } catch (error) {
    console.error("[/api/master-prompt-package] Failed", error);
    const message = error instanceof Error ? error.message : "Failed to generate master prompt package.";
    if (message.includes("Missing Firebase auth token")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to generate master prompt package." }, { status: 500 });
  }
}
