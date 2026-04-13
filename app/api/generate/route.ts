import { FieldValue } from "firebase-admin/firestore";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import {
  type AdesBoardSnapshot,
  type AdesEdge,
  type AdesNode,
  type AdesNodeType,
  CORE_NODE_TYPES,
  createNodeData,
  type EvalCategory,
} from "@/lib/board/types";
import { analyzeBoardChecklists, analyzeBoardQuality } from "@/lib/board/quality";
import { recordOpenAIEvent } from "@/lib/server/openai-events";

type OpenAIDebug = {
  called: boolean;
  responseId: string | null;
  model: string | null;
  usage: unknown | null;
  hasApiKey: boolean;
  route: "/api/generate";
};

type GenerateRequest = {
  projectId?: string;
  ideaPrompt?: string;
  audience?: string;
  constraints?: string;
};

type GeneratedStep = {
  id: string;
  title: string;
  shortLabel: string;
  purpose: string;
  whyThisStepExists: string;
  stepType: string;
  inputs: string[];
  outputs: string[];
  toolsNeeded: string[];
  reasoningRequired: string;
  completionCriteria: string;
  commonFailureModes: string[];
  risks: string[];
  dependencies: string[];
  reflectionHooks: Array<{
    trigger: string;
    purpose: string;
    critiqueQuestion: string;
    revisionAction: string;
    stopCondition: string;
  }>;
  feedbackHooks: Array<{
    source: string;
    whenFeedbackIsRequested: string;
    whatIsReviewed: string;
    afterFeedbackAction: string;
    updateScope: "current_run" | "prompt" | "both";
  }>;
  evals: Array<{
    id: string;
    name: string;
    question: string;
    category: EvalCategory;
    scope: "step" | "flow";
    relatedStepIds: string[];
    whyItMatters: string;
    gradingMethod: string;
    passCriteria: string;
    threshold: string;
    datasetNotes: string;
    failureExamples: string;
    priority: "high" | "medium" | "low";
  }>;
};

type GeneratedDesign = {
  title: string;
  summary: string;
  mainTask: string;
  userContext: string;
  expectedBusinessOutcome: string;
  assumptions: string[];
  risks: string[];
  critiqueSeed: string[];
  steps: GeneratedStep[];
  endToEndEvals: GeneratedStep["evals"];
};

const AI_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    mainTask: { type: "string" },
    userContext: { type: "string" },
    expectedBusinessOutcome: { type: "string" },
    assumptions: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    critiqueSeed: { type: "array", items: { type: "string" } },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          shortLabel: { type: "string" },
          purpose: { type: "string" },
          whyThisStepExists: { type: "string" },
          stepType: { type: "string" },
          inputs: { type: "array", items: { type: "string" } },
          outputs: { type: "array", items: { type: "string" } },
          toolsNeeded: { type: "array", items: { type: "string" } },
          reasoningRequired: { type: "string" },
          completionCriteria: { type: "string" },
          commonFailureModes: { type: "array", items: { type: "string" } },
          risks: { type: "array", items: { type: "string" } },
          dependencies: { type: "array", items: { type: "string" } },
          reflectionHooks: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                trigger: { type: "string" },
                purpose: { type: "string" },
                critiqueQuestion: { type: "string" },
                revisionAction: { type: "string" },
                stopCondition: { type: "string" },
              },
              required: ["trigger", "purpose", "critiqueQuestion", "revisionAction", "stopCondition"],
            },
          },
          feedbackHooks: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                source: { type: "string" },
                whenFeedbackIsRequested: { type: "string" },
                whatIsReviewed: { type: "string" },
                afterFeedbackAction: { type: "string" },
                updateScope: { type: "string", enum: ["current_run", "prompt", "both"] },
              },
              required: ["source", "whenFeedbackIsRequested", "whatIsReviewed", "afterFeedbackAction", "updateScope"],
            },
          },
          evals: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                question: { type: "string" },
                category: {
                  type: "string",
                  enum: ["task_success", "reasoning_quality", "tool_accuracy", "output_quality", "efficiency", "safety", "escalation", "reflection_effectiveness", "feedback_usefulness", "robustness"],
                },
                scope: { type: "string", enum: ["step", "flow"] },
                relatedStepIds: { type: "array", items: { type: "string" } },
                whyItMatters: { type: "string" },
                gradingMethod: { type: "string" },
                passCriteria: { type: "string" },
                threshold: { type: "string" },
                datasetNotes: { type: "string" },
                failureExamples: { type: "string" },
                priority: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["id", "name", "question", "category", "scope", "relatedStepIds", "whyItMatters", "gradingMethod", "passCriteria", "threshold", "datasetNotes", "failureExamples", "priority"],
            },
          },
        },
        required: [
          "id",
          "title",
          "shortLabel",
          "purpose",
          "whyThisStepExists",
          "stepType",
          "inputs",
          "outputs",
          "toolsNeeded",
          "reasoningRequired",
          "completionCriteria",
          "commonFailureModes",
          "risks",
          "dependencies",
          "reflectionHooks",
          "feedbackHooks",
          "evals",
        ],
      },
    },
    endToEndEvals: { type: "array", items: { "$ref": "#/properties/steps/items/properties/evals/items" } },
  },
  required: ["title", "summary", "mainTask", "userContext", "expectedBusinessOutcome", "assumptions", "risks", "critiqueSeed", "steps", "endToEndEvals"],
} as const;

const ALLOWED_NODE_TYPES = new Set<string>(CORE_NODE_TYPES);

function parseAuthToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
}

function clampText(value: string | undefined, maxChars: number): string {
  if (!value) return "";
  return value.trim().slice(0, maxChars);
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");
  return new OpenAI({ apiKey });
}

function createOpenAIDebug(hasApiKey: boolean): OpenAIDebug {
  return {
    called: false,
    responseId: null,
    model: null,
    usage: null,
    hasApiKey,
    route: "/api/generate",
  };
}

function toEvalCategory(value: string): EvalCategory {
  const known: EvalCategory[] = ["task_success", "reasoning_quality", "tool_accuracy", "output_quality", "efficiency", "safety", "escalation", "reflection_effectiveness", "feedback_usefulness", "robustness"];
  return known.includes(value as EvalCategory) ? (value as EvalCategory) : "task_success";
}

function toNodeType(step: GeneratedStep): AdesNodeType {
  if (/goal|objective|success condition/i.test(step.stepType)) return "goal";
  if (/handoff|escalation|human/i.test(step.stepType)) return "handoff";
  return ALLOWED_NODE_TYPES.has(step.stepType) ? (step.stepType as AdesNodeType) : "task";
}

function sanitizeLabel(label: string, fallback: string) {
  const trimmed = label.trim();
  if (!trimmed || /^new\b/i.test(trimmed) || /^step\s*\d+/i.test(trimmed)) return fallback;
  return trimmed;
}

function normalizeDesign(design: GeneratedDesign): AdesBoardSnapshot {
  const nodes: AdesNode[] = [];
  const edges: AdesEdge[] = [];
  const stepIdToNodeId = new Map<string, string>();

  design.steps.forEach((step, index) => {
    const type = toNodeType(step);
    const nodeId = `${type}-${index + 1}-${crypto.randomUUID().slice(0, 4)}`;
    stepIdToNodeId.set(step.id, nodeId);

    const data = createNodeData(type, sanitizeLabel(step.title, `Define concrete ${type.replace("_", " ")} operation`));
    data.shortLabel = step.shortLabel || step.title;
    data.body = step.purpose;
    data.purpose = step.purpose;
    data.whyThisStepExists = step.whyThisStepExists;
    data.stepType = step.stepType === "tool_use" ? "tool_use" : data.stepType;
    data.inputs = step.inputs.join("; ");
    data.outputs = step.outputs.join("; ");
    data.tools = step.toolsNeeded;
    data.reasoningRequired = step.reasoningRequired;
    data.completionCriteria = step.completionCriteria;
    data.commonFailureModes = step.commonFailureModes;
    data.risks = step.risks;
    data.dependencies = step.dependencies;
    data.reflectionHooks = step.reflectionHooks.map((hook) => ({
      trigger: hook.trigger,
      purpose: hook.purpose,
      critiqueQuestion: hook.critiqueQuestion,
      revisionAction: hook.revisionAction,
      stopCondition: hook.stopCondition,
    }));
    data.feedbackHooks = step.feedbackHooks.map((hook) => ({
      source: hook.source,
      whenToRequest: hook.whenFeedbackIsRequested,
      whatIsReviewed: hook.whatIsReviewed,
      afterFeedbackAction: hook.afterFeedbackAction,
      updatesScope: hook.updateScope,
    }));
    data.evals = step.evals.map((evalItem) => ({
      id: evalItem.id,
      name: evalItem.name,
      question: evalItem.question,
      category: toEvalCategory(evalItem.category),
      scope: evalItem.scope,
      relatedStepIds: evalItem.relatedStepIds,
      whyItMatters: evalItem.whyItMatters,
      gradingMethod: evalItem.gradingMethod,
      passCriteria: evalItem.passCriteria,
      threshold: evalItem.threshold,
      testCases: evalItem.datasetNotes,
      failureExamples: evalItem.failureExamples,
      priority: evalItem.priority,
    }));

    nodes.push({ id: nodeId, type, position: { x: 180 + index * 320, y: 150 }, data });

    if (index > 0) {
      edges.push({ id: `e-main-${index}`, source: nodes[index - 1].id, target: nodeId, data: { semanticType: "execution" } });
    }

    step.reflectionHooks.forEach((hook, hookIdx) => {
      const rId = `reflection-${index + 1}-${hookIdx + 1}-${crypto.randomUUID().slice(0, 4)}`;
      const reflectionData = createNodeData("reflection", `${step.shortLabel || step.title}: self-critique`);
      reflectionData.body = hook.purpose;
      reflectionData.reflectionTrigger = hook.trigger;
      reflectionData.reflectionPrompt = hook.critiqueQuestion;
      reflectionData.completionCriteria = hook.stopCondition;
      reflectionData.feedbackAction = hook.revisionAction;
      nodes.push({ id: rId, type: "reflection", position: { x: 200 + index * 320, y: 360 }, data: reflectionData });
      edges.push({ id: `e-reflect-${index}-${hookIdx}`, source: nodeId, target: rId, type: "smoothstep", data: { semanticType: "reflection" } });
    });

    step.feedbackHooks.forEach((hook, hookIdx) => {
      const fId = `feedback-${index + 1}-${hookIdx + 1}-${crypto.randomUUID().slice(0, 4)}`;
      const feedbackData = createNodeData("feedback", `${step.shortLabel || step.title}: external review`);
      feedbackData.body = hook.whatIsReviewed;
      feedbackData.feedbackSource = hook.source;
      feedbackData.feedbackCondition = hook.whenFeedbackIsRequested;
      feedbackData.feedbackAction = hook.afterFeedbackAction;
      feedbackData.feedbackUpdatesScope = hook.updateScope;
      nodes.push({ id: fId, type: "feedback", position: { x: 320 + index * 320, y: 460 }, data: feedbackData });
      edges.push({ id: `e-feedback-${index}-${hookIdx}`, source: nodeId, target: fId, type: "smoothstep", data: { semanticType: "feedback" } });
    });

    step.evals.forEach((evalItem, evalIdx) => {
      const evalId = `eval-${index + 1}-${evalIdx + 1}-${crypto.randomUUID().slice(0, 4)}`;
      const evalData = createNodeData("eval", evalItem.name);
      evalData.body = evalItem.whyItMatters;
      evalData.evalName = evalItem.name;
      evalData.evalQuestion = evalItem.question;
      evalData.evalCategory = toEvalCategory(evalItem.category);
      evalData.evalScope = evalItem.scope;
      evalData.evalCriteria = evalItem.passCriteria;
      evalData.evalThreshold = evalItem.threshold;
      evalData.evalMethod = evalItem.gradingMethod;
      evalData.evalDataset = evalItem.datasetNotes;
      evalData.evalMetric = evalItem.failureExamples;
      nodes.push({ id: evalId, type: "eval", position: { x: 420 + index * 320, y: 260 }, data: evalData });
      edges.push({ id: `e-eval-${index}-${evalIdx}`, source: nodeId, target: evalId, data: { semanticType: "eval" } });
    });
  });

  design.endToEndEvals.forEach((evalItem, idx) => {
    const evalId = `eval-flow-${idx + 1}-${crypto.randomUUID().slice(0, 4)}`;
    const evalData = createNodeData("eval", evalItem.name);
    evalData.body = evalItem.whyItMatters;
    evalData.evalName = evalItem.name;
    evalData.evalQuestion = evalItem.question;
    evalData.evalCategory = toEvalCategory(evalItem.category);
    evalData.evalScope = "flow";
    evalData.evalCriteria = evalItem.passCriteria;
    evalData.evalThreshold = evalItem.threshold;
    evalData.evalMethod = evalItem.gradingMethod;
    evalData.evalDataset = evalItem.datasetNotes;
    evalData.evalMetric = evalItem.failureExamples;
    nodes.push({ id: evalId, type: "eval", position: { x: 180 + idx * 320, y: 620 }, data: evalData });

    (evalItem.relatedStepIds || []).forEach((stepId, stepIdx) => {
      const sourceId = stepIdToNodeId.get(stepId) ?? nodes[0]?.id;
      if (sourceId) edges.push({ id: `e-flow-eval-${idx}-${stepIdx}`, source: sourceId, target: evalId, data: { semanticType: "eval" } });
    });
  });

  const metricNodeId = `business-metric-${crypto.randomUUID().slice(0, 6)}`;
  const metricData = createNodeData("business_metric", "Expected business outcome");
  metricData.body = design.expectedBusinessOutcome;
  metricData.businessMetric = design.expectedBusinessOutcome;
  nodes.push({ id: metricNodeId, type: "business_metric", position: { x: 220, y: 760 }, data: metricData });

  design.risks.slice(0, 3).forEach((risk, idx) => {
    const riskId = `risk-${idx + 1}-${crypto.randomUUID().slice(0, 4)}`;
    const riskData = createNodeData("risk", `Risk: ${risk.slice(0, 40)}`);
    riskData.body = risk;
    riskData.confidenceCheck = "Escalate if this risk is detected with medium confidence or above.";
    nodes.push({ id: riskId, type: "risk", position: { x: 560 + idx * 280, y: 760 }, data: riskData });
  });

  design.assumptions.slice(0, 3).forEach((assumption, idx) => {
    const assumptionId = `assumption-${idx + 1}-${crypto.randomUUID().slice(0, 4)}`;
    const assumptionData = createNodeData("assumption", `Assumption: ${assumption.slice(0, 42)}`);
    assumptionData.body = assumption;
    nodes.push({ id: assumptionId, type: "assumption", position: { x: 560 + idx * 280, y: 860 }, data: assumptionData });
  });

  return { nodes, edges };
}

function getGeneratedDesign(outputText: string): GeneratedDesign {
  const parsed = JSON.parse(outputText) as Partial<GeneratedDesign>;
  if (!parsed.title || !parsed.summary || !Array.isArray(parsed.steps) || !Array.isArray(parsed.endToEndEvals)) {
    throw new Error("Model output did not match the generation schema.");
  }

  return {
    title: parsed.title,
    summary: parsed.summary,
    mainTask: parsed.mainTask || "",
    userContext: parsed.userContext || "",
    expectedBusinessOutcome: parsed.expectedBusinessOutcome || "",
    assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.filter((item): item is string => typeof item === "string") : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks.filter((item): item is string => typeof item === "string") : [],
    critiqueSeed: Array.isArray(parsed.critiqueSeed) ? parsed.critiqueSeed.filter((item): item is string => typeof item === "string") : [],
    steps: parsed.steps as GeneratedStep[],
    endToEndEvals: parsed.endToEndEvals as GeneratedStep["evals"],
  };
}

export async function POST(request: Request) {
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
  const openaiDebug = createOpenAIDebug(hasApiKey);
  let requestProjectId: string | null = null;

  console.info("[/api/generate] Route entry", { hasApiKey });

  try {
    const token = parseAuthToken(request);
    if (!token) return NextResponse.json({ error: "Missing Firebase auth token." }, { status: 401 });

    const auth = getFirebaseAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const body = (await request.json()) as GenerateRequest;
    const projectId = clampText(body.projectId, 120);
    requestProjectId = projectId || null;
    console.info("[/api/generate] Request context", { projectId });
    const ideaPrompt = clampText(body.ideaPrompt, 1800);
    const audience = clampText(body.audience, 240);
    const constraints = clampText(body.constraints, 400);

    if (!projectId || !ideaPrompt) return NextResponse.json({ error: "projectId and ideaPrompt are required." }, { status: 400 });

    const db = getFirebaseAdminDb();
    const projectRef = db.collection("projects").doc(projectId);
    const snapshot = await projectRef.get();

    if (!snapshot.exists) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const projectData = snapshot.data() as { ownerUid?: string };
    if (projectData.ownerUid !== uid) return NextResponse.json({ error: "You do not have access to this project." }, { status: 403 });

    const openai = getOpenAIClient();

    console.info("[/api/generate] Calling OpenAI Responses API", { projectId });
    openaiDebug.called = true;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are ADES design engine. Build a concrete agent design spec from fuzzy prompts using this pipeline: interpret job/context; decompose into ordered concrete steps; refine broad steps; add reflection/feedback/escalation mechanisms only when useful; generate exhaustive evals (step + end-to-end) across task_success, reasoning_quality, tool_accuracy, output_quality, efficiency, safety, escalation, reflection_effectiveness, feedback_usefulness, robustness; run design quality checks mentally and fill gaps before output. Never emit placeholder step names like New task, New goal, Step 1, Analyze request unless expanded into specific operational language.",
        },
        {
          role: "user",
          content: `Idea: ${ideaPrompt}\nAudience: ${audience || "General users"}\nConstraints: ${constraints || "None"}\nReturn concrete operational steps with clear inputs/outputs and quality checks.`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "ades_generate_board_v2",
          schema: AI_SCHEMA,
          strict: true,
        },
      },
    });

    openaiDebug.responseId = response.id ?? null;
    openaiDebug.model = response.model ?? null;
    openaiDebug.usage = response.usage ?? null;
    console.info("[/api/generate] OpenAI response received", {
      responseId: openaiDebug.responseId,
      model: openaiDebug.model,
      usage: openaiDebug.usage,
    });

    const outputText = response.output_text;
    if (!outputText) throw new Error("OpenAI returned an empty generation response.");

    const generatedDesign = getGeneratedDesign(outputText);
    const board = normalizeDesign(generatedDesign);
    const quality = analyzeBoardQuality(board);
    const qualityChecklist = analyzeBoardChecklists(board);

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

    try {
      await recordOpenAIEvent({
        route: "/api/generate",
        projectId,
        uid,
        success: true,
        responseId: openaiDebug.responseId,
        model: openaiDebug.model,
        usage: openaiDebug.usage,
        hasApiKey: openaiDebug.hasApiKey,
      });
    } catch (eventError) {
      console.error("[/api/generate] Failed to persist OpenAI event", eventError);
    }

    return NextResponse.json({
      project: { id: projectId, title: generatedDesign.title, summary: generatedDesign.summary, status: "generated" },
      board,
      assumptions: generatedDesign.assumptions,
      critiqueSeed: generatedDesign.critiqueSeed,
      quality,
      qualityChecklist,
      openaiDebug,
    });
  } catch (error) {
    console.error("[/api/generate] Failed", {
      projectId: requestProjectId,
      hasApiKey: openaiDebug.hasApiKey,
      openaiCalled: openaiDebug.called,
      responseId: openaiDebug.responseId,
      model: openaiDebug.model,
      usage: openaiDebug.usage,
      error,
    });
    const message = error instanceof Error ? error.message : "Failed to generate board.";
    if (requestProjectId) {
      try {
        await recordOpenAIEvent({
          route: "/api/generate",
          projectId: requestProjectId,
          uid: null,
          success: false,
          responseId: openaiDebug.responseId,
          model: openaiDebug.model,
          usage: openaiDebug.usage,
          hasApiKey: openaiDebug.hasApiKey,
          errorMessage: message,
        });
      } catch (eventError) {
        console.error("[/api/generate] Failed to persist OpenAI event", eventError);
      }
    }
    return NextResponse.json({ error: message, openaiDebug }, { status: 500 });
  }
}
