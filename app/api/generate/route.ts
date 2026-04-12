import { FieldValue } from "firebase-admin/firestore";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { checkUsageCap, incrementUsageCount } from "@/lib/server/usage-caps";
import { type AdesBoardSnapshot, type AdesNode, type AdesNodeType, CORE_NODE_TYPES, createNodeData } from "@/lib/board/types";

type GenerateRequest = {
  projectId?: string;
  ideaPrompt?: string;
  audience?: string;
  constraints?: string;
};

type GeneratedNode = {
  id: string;
  type: string;
  title: string;
  body: string;
  lane: string;
  reflectionPrompt: string;
  evalMetric: string;
  businessMetric: string;
  confidenceCheck: string;
  owner: string;
  tags: string[];
};

type GeneratedEdge = {
  source: string;
  target: string;
  label: string;
};

type GeneratedDesign = {
  title: string;
  summary: string;
  assumptions: string[];
  critiqueSeed: string[];
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
};

const AI_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    assumptions: {
      type: "array",
      items: { type: "string" },
    },
    critiqueSeed: {
      type: "array",
      items: { type: "string" },
    },
    nodes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          type: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          lane: { type: "string" },
          reflectionPrompt: { type: "string" },
          evalMetric: { type: "string" },
          businessMetric: { type: "string" },
          confidenceCheck: { type: "string" },
          owner: { type: "string" },
          tags: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "id",
          "type",
          "title",
          "body",
          "lane",
          "reflectionPrompt",
          "evalMetric",
          "businessMetric",
          "confidenceCheck",
          "owner",
          "tags",
        ],
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          source: { type: "string" },
          target: { type: "string" },
          label: { type: "string" },
        },
        required: ["source", "target", "label"],
      },
    },
  },
  required: ["title", "summary", "assumptions", "critiqueSeed", "nodes", "edges"],
} as const;

const ALLOWED_NODE_TYPES = new Set<string>(CORE_NODE_TYPES);

function parseAuthToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

function clampText(value: string | undefined, maxChars: number): string {
  if (!value) {
    return "";
  }

  return value.trim().slice(0, maxChars);
}

function toNodeType(value: string): AdesNodeType {
  if (ALLOWED_NODE_TYPES.has(value)) {
    return value as AdesNodeType;
  }

  if (value === "business-metric") {
    return "business_metric";
  }

  return "task";
}

function normalizeDesign(design: GeneratedDesign): AdesBoardSnapshot {
  const nodes: AdesNode[] = design.nodes.map((node, index) => {
    const type = toNodeType(node.type);
    const x = 150 + (index % 4) * 280;
    const y = 120 + Math.floor(index / 4) * 220;

    return {
      id: node.id || `${type}-${index + 1}`,
      type,
      position: { x, y },
      data: {
        ...createNodeData(type, node.title || "Untitled block"),
        label: node.title || "Untitled block",
        body: node.body,
        reflectionPrompt: node.reflectionPrompt,
        evalMetric: node.evalMetric,
        businessMetric: node.businessMetric,
        confidenceCheck: node.confidenceCheck,
        owner: node.owner || "AI system",
        tags: node.tags?.slice(0, 5) ?? [],
      },
    };
  });

  const existingTypes = new Set(nodes.map((node) => node.type));
  const requiredTypes: AdesNodeType[] = ["reflection", "eval", "business_metric", "assumption"];

  requiredTypes.forEach((requiredType) => {
    if (existingTypes.has(requiredType)) {
      return;
    }

    const id = `${requiredType}-${crypto.randomUUID().slice(0, 8)}`;
    const baseData = createNodeData(requiredType, `Added ${requiredType.replace("_", " ")}`);

    nodes.push({
      id,
      type: requiredType,
      position: {
        x: 180 + (nodes.length % 4) * 280,
        y: 120 + Math.floor(nodes.length / 4) * 220,
      },
      data: {
        ...baseData,
        body:
          requiredType === "assumption"
            ? "Assumption to validate before implementation."
            : "Added automatically to keep ADES quality coverage complete.",
      },
    });
  });

  const nodeIds = new Set(nodes.map((node) => node.id));

  const edges = design.edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge, index) => ({
      id: `e-${index + 1}-${crypto.randomUUID().slice(0, 6)}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
    }));

  return { nodes, edges };
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  return new OpenAI({ apiKey });
}

function getGeneratedDesign(outputText: string): GeneratedDesign {
  const parsed = JSON.parse(outputText) as Partial<GeneratedDesign>;

  if (!parsed.title || !parsed.summary || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error("Model output did not match the generation schema.");
  }

  return {
    title: parsed.title,
    summary: parsed.summary,
    assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.filter((item): item is string => typeof item === "string") : [],
    critiqueSeed: Array.isArray(parsed.critiqueSeed) ? parsed.critiqueSeed.filter((item): item is string => typeof item === "string") : [],
    nodes: parsed.nodes as GeneratedNode[],
    edges: parsed.edges as GeneratedEdge[],
  };
}

export async function POST(request: Request) {
  try {
    const token = parseAuthToken(request);

    if (!token) {
      return NextResponse.json({ error: "Missing Firebase auth token." }, { status: 401 });
    }

    const auth = getFirebaseAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const body = (await request.json()) as GenerateRequest;
    const projectId = clampText(body.projectId, 120);
    const ideaPrompt = clampText(body.ideaPrompt, 1800);
    const audience = clampText(body.audience, 240);
    const constraints = clampText(body.constraints, 400);

    if (!projectId || !ideaPrompt) {
      return NextResponse.json({ error: "projectId and ideaPrompt are required." }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    const projectRef = db.collection("projects").doc(projectId);
    const snapshot = await projectRef.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const projectData = snapshot.data() as { ownerUid?: string };

    if (projectData.ownerUid !== uid) {
      return NextResponse.json({ error: "You do not have access to this project." }, { status: 403 });
    }

    const usage = await checkUsageCap(db, uid, "generate");

    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: `Daily generate limit reached (${usage.limit}/day). Try again tomorrow.`,
          usage: {
            action: "generate",
            limit: usage.limit,
            used: usage.used,
            remaining: usage.remaining,
            dateKey: usage.dateKey,
          },
        },
        { status: 429 }
      );
    }

    const openai = getOpenAIClient();

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You generate ADES agent-design boards for PMs. Return JSON only. Always include reflection, eval, business metric, and assumption coverage.",
        },
        {
          role: "user",
          content: `Idea: ${ideaPrompt}\nAudience: ${audience || "General users"}\nConstraints: ${constraints || "None"}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "ades_generate_board",
          schema: AI_SCHEMA,
          strict: true,
        },
      },
    });

    const outputText = response.output_text;

    if (!outputText) {
      throw new Error("OpenAI returned an empty generation response.");
    }

    const generatedDesign = getGeneratedDesign(outputText);
    const board = normalizeDesign(generatedDesign);
    const estimatedInputTokens =
      typeof response.usage?.input_tokens === "number" && Number.isFinite(response.usage.input_tokens) ? response.usage.input_tokens : 0;
    const estimatedOutputTokens =
      typeof response.usage?.output_tokens === "number" && Number.isFinite(response.usage.output_tokens) ? response.usage.output_tokens : 0;

    await incrementUsageCount(db, uid, "generate", estimatedInputTokens, estimatedOutputTokens);

    await projectRef.update({
      title: generatedDesign.title,
      summary: generatedDesign.summary,
      assumptions: generatedDesign.assumptions,
      critiqueSeed: generatedDesign.critiqueSeed,
      ideaPrompt,
      audience,
      constraints,
      status: "generated",
      board,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      project: {
        id: projectId,
        title: generatedDesign.title,
        summary: generatedDesign.summary,
        status: "generated",
      },
      board,
      assumptions: generatedDesign.assumptions,
      critiqueSeed: generatedDesign.critiqueSeed,
    });
  } catch (error) {
    console.error("/api/generate failed", error);
    const message = error instanceof Error ? error.message : "Failed to generate board.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
