import { FieldValue } from "firebase-admin/firestore";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import type { AdesBoardSnapshot } from "@/lib/board/types";
import type { CritiqueResult } from "@/lib/critique/types";
import { assertCanUseAi, getAuthenticatedUser, getGateResponse, incrementUsage, logGateDeny } from "@/lib/usageGate";

type CritiqueRequest = {
  projectId?: string;
  summary?: string;
  board?: AdesBoardSnapshot;
};

type OpenAIDebug = {
  called: boolean;
  responseId: string | null;
  model: string | null;
  usage: unknown | null;
  hasApiKey: boolean;
  route: "/api/critique";
};

const AI_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    categoryReviews: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string", enum: ["workflowClarity", "decompositionQuality", "toolLogic", "reflectionFeedback", "evalReadiness"] },
          verdict: { type: "string", enum: ["pass", "needs_work"] },
          finding: { type: "string" },
          recommendation: { type: "string" }
        },
        required: ["category", "verdict", "finding", "recommendation"]
      }
    },
    critiqueItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          message: { type: "string" },
          recommendation: { type: "string" }
        },
        required: ["id", "severity", "message", "recommendation"]
      }
    },
    missingReflections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["reflection"] },
          title: { type: "string" },
          body: { type: "string" }
        },
        required: ["id", "type", "title", "body"]
      }
    },
    missingEvals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["eval"] },
          title: { type: "string" },
          body: { type: "string" }
        },
        required: ["id", "type", "title", "body"]
      }
    },
    missingBusinessMetrics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["business_metric"] },
          title: { type: "string" },
          body: { type: "string" }
        },
        required: ["id", "type", "title", "body"]
      }
    }
  },
  required: ["summary", "categoryReviews", "critiqueItems", "missingReflections", "missingEvals", "missingBusinessMetrics"]
} as const;

function isSafeBoard(value: unknown): value is AdesBoardSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const board = value as Record<string, unknown>;
  return Array.isArray(board.nodes) && Array.isArray(board.edges);
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  return new OpenAI({ apiKey });
}

function createOpenAIDebug(hasApiKey: boolean): OpenAIDebug {
  return {
    called: false,
    responseId: null,
    model: null,
    usage: null,
    hasApiKey,
    route: "/api/critique"
  };
}

function getCritiqueResult(outputText: string): CritiqueResult {
  const parsed = JSON.parse(outputText) as Partial<CritiqueResult>;

  if (
    !parsed.summary ||
    !Array.isArray(parsed.categoryReviews) ||
    !Array.isArray(parsed.critiqueItems) ||
    !Array.isArray(parsed.missingReflections) ||
    !Array.isArray(parsed.missingEvals) ||
    !Array.isArray(parsed.missingBusinessMetrics)
  ) {
    throw new Error("Model output did not match the critique schema.");
  }

  return {
    summary: parsed.summary,
    categoryReviews: parsed.categoryReviews,
    critiqueItems: parsed.critiqueItems,
    missingReflections: parsed.missingReflections,
    missingEvals: parsed.missingEvals,
    missingBusinessMetrics: parsed.missingBusinessMetrics
  };
}

export async function POST(request: Request) {
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
  const openaiDebug = createOpenAIDebug(hasApiKey);
  let requestProjectId: string | null = null;

  console.info("[/api/critique] Route entry", { hasApiKey });

  try {
    const { uid, email } = await getAuthenticatedUser(request);

    const body = (await request.json()) as CritiqueRequest;
    const projectId = typeof body.projectId === "string" ? body.projectId.trim().slice(0, 120) : "";
    requestProjectId = projectId || null;
    console.info("[/api/critique] Request context", { projectId });

    if (!projectId || !isSafeBoard(body.board)) {
      return NextResponse.json({ error: "projectId and board are required." }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    const projectRef = db.collection("projects").doc(projectId);
    const snapshot = await projectRef.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const projectData = snapshot.data() as { ownerUid?: string; title?: string; summary?: string };

    if (projectData.ownerUid !== uid) {
      return NextResponse.json({ error: "You do not have access to this project." }, { status: 403 });
    }

    const gate = await assertCanUseAi(uid, email, "ai_review");
    if (!gate.allowed) {
      logGateDeny({ uid, email, action: "ai_review", reason: gate.reason });
      return NextResponse.json(getGateResponse(gate.reason, gate.trigger), { status: 403 });
    }

    const boardSummaryForPrompt = body.board.nodes.slice(0, 18).map((node) => ({
      id: node.id,
      type: node.type,
      label: node.data.label,
      body: node.data.body,
      purpose: node.data.purpose,
      whyThisStepExists: node.data.whyThisStepExists,
      inputs: node.data.inputs,
      outputs: node.data.outputs,
      tools: node.data.tools,
      completionCriteria: node.data.completionCriteria,
      commonFailureModes: node.data.commonFailureModes,
      reflectionHooks: node.data.reflectionHooks,
      feedbackHooks: node.data.feedbackHooks,
      stepEvals: node.data.evals,
      reflectionPrompt: node.data.reflectionPrompt,
      evalMetric: node.data.evalMetric,
      businessMetric: node.data.businessMetric,
      confidenceCheck: node.data.confidenceCheck,
      owner: node.data.owner
    }));

    const openai = getOpenAIClient();
    console.info("[/api/critique] Calling OpenAI Responses API", { projectId });
    openaiDebug.called = true;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You critique ADES boards for PM users. Return JSON only. Review with this five-question framework: workflow clarity, decomposition quality, tool logic, reflection/feedback placement, eval readiness. For each category, mark pass or needs_work and provide one concrete recommendation. Focus critique items on highest-impact failures and keep suggestions actionable."
        },
        {
          role: "user",
          content: JSON.stringify({
            projectTitle: projectData.title ?? "Untitled design",
            summary: (typeof body.summary === "string" ? body.summary : projectData.summary ?? "").slice(0, 600),
            board: boardSummaryForPrompt
          })
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "ades_critique_board",
          schema: AI_SCHEMA,
          strict: true
        }
      }
    });

    openaiDebug.responseId = response.id ?? null;
    openaiDebug.model = response.model ?? null;
    openaiDebug.usage = response.usage ?? null;
    console.info("[/api/critique] OpenAI response received", {
      responseId: openaiDebug.responseId,
      model: openaiDebug.model,
      usage: openaiDebug.usage
    });

    const outputText = response.output_text;

    if (!outputText) {
      throw new Error("OpenAI returned an empty critique response.");
    }

    const critique = getCritiqueResult(outputText);

    await projectRef.update({
      critique,
      updatedAt: FieldValue.serverTimestamp()
    });
    if (gate.plan === "free") {
      await incrementUsage(uid, "ai_review");
    }

    return NextResponse.json({ critique, openaiDebug });
  } catch (error) {
    console.error("[/api/critique] Failed", {
      projectId: requestProjectId,
      hasApiKey: openaiDebug.hasApiKey,
      openaiCalled: openaiDebug.called,
      responseId: openaiDebug.responseId,
      model: openaiDebug.model,
      usage: openaiDebug.usage,
      error
    });
    const message = error instanceof Error ? error.message : "Failed to critique board.";
    if (message.includes("Missing Firebase auth token")) {
      return NextResponse.json({ error: message, openaiDebug }, { status: 401 });
    }
    return NextResponse.json({ error: message, openaiDebug }, { status: 500 });
  }
}
