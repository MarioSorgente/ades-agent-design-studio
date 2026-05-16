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
- If explicit eval coverage is missing, create a SMALL set of recommended graders inferred from risks/completion criteria and state this in instructions.
- Do NOT fabricate fake source eval IDs. Use inferred-* IDs for recommended graders.

Each grader must include:
- id, title, evalSourceId, evalSourceTitle, purpose, whyNeeded, whatItEvaluates, whenToUse, graderOverview, graderType, instructions,
  passCriteria, failCriteria, scoringRubric, expectedOutputShape, openaiSimpleGrader, openaiPythonGrader

GRADER OVERVIEW REQUIREMENTS
For each grader, create a graderOverview object.
Do not use long repeated prose.
Each field has a different job:
1. summary
- One short sentence.
- Max 140 characters.
- Describes the grader in plain language.
- Must not mention evidence, timing, or risk.
2. riskIfMissing
- Explains the consequence if this behavior is not checked.
- Focus on product, user, business, safety, escalation, or implementation risk.
- Must not describe the checks themselves.
3. evaluatedBehavior
- Short fluent explanation of what is being checked at a high level.
- Maximum 2 sentences.
- Must not include evidence lists, thresholds, borderline handling, scoring instructions, or long checklists.
4. checksToPerform
- Array of concrete, short, actionable checklist items.
- Each item should start with action verbs like Confirm, Check, Verify, Ensure when practical.
5. evidenceToInspect
- Array of concrete fields/artifacts to inspect.
- Use short noun phrases only.
- Examples: "agent final output", "ICP persona section", "tool result summary", "escalation note", "JSON response fields".
6. passDecisionRule
- One concise decision rule for pass/fail.
- Must not duplicate the full passCriteria array.
- It should summarize how to decide whether the output passes.
8. runTiming
- States exactly when to run this grader.
- Mention workflow step, output, handoff, release gate, regression test, or eval suite moment.
- Avoid generic text like "whenever this behavior is part of the eval set".

7. borderlineHandling
- One concise explanation for partial or ambiguous cases.

WHAT THIS GRADER CHECKS FORMAT
- Do not write dense paragraphs that combine behavior, evidence, pass thresholds, and borderline handling.
- Never put evidence lists, thresholds, borderline cases, or scoring instructions inside evaluatedBehavior.
- Do not write labels like "Behavior evaluated:", "Evidence to inspect:", "Pass/fail thresholds:", or "Borderline:" inside evaluatedBehavior.
- The human-readable Overview tab should be easy to render as a short paragraph, bullet checks, bullet evidence, decision rule, borderline handling, and run timing.

ANTI-REPETITION RULES
- Do not reuse the same clause across graderOverview fields.
- Do not copy passCriteria or failCriteria into graderOverview.
- Do not make riskIfMissing and evaluatedBehavior say the same thing.
- Do not use vague generic timing.
- If information is missing, create conservative generic timing based on the workflow step.

Each grader's instructions must clearly define:
- behavior being evaluated
- evidence to inspect
- pass/fail thresholds
- borderline-case handling
- practical 0-5 scoring usage

Do not only describe the grader. Produce the actual grader artifacts that a builder can copy into an eval platform.

Simple grader requirements:
- Best for subjective/semantic grading and operator-friendly scoring guidelines.
- Include: what good looks like, evidence to inspect, pass conditions, fail conditions, borderline handling, and 0.0-1.0 guidance.
- Reference {{ sample.output_text }} and relevant {{ item.* }} fields where useful.
- If item fields are unknown, keep guidance generic and suggest fields like item.expected_behavior or item.reference_answer.

Python grader requirements:
- Best for objective checks (structure, keywords, format, thresholds, safety triggers).
- Return complete runnable function: def grade(sample: dict, item: dict) -> float
- Read model output from sample.get("output_text", "") and expected data from item.
- Return float in [0.0, 1.0].
- Never call network APIs.
- Keep robust to missing keys and include comments for customization.
- If semantic judgment is needed, still check objective signals and clearly document limitations.

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
          whyNeeded: { type: "string" },
          whatItEvaluates: { type: "string" },
          whenToUse: { type: "string" },
          graderOverview: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              riskIfMissing: { type: "string" },
              evaluatedBehavior: { type: "string" },
              checksToPerform: { type: "array", items: { type: "string" } },
              evidenceToInspect: { type: "array", items: { type: "string" } },
              passDecisionRule: { type: "string" },
              borderlineHandling: { type: "string" },
              runTiming: { type: "string" },
            },
            required: ["summary", "riskIfMissing", "evaluatedBehavior", "checksToPerform", "evidenceToInspect", "passDecisionRule", "borderlineHandling", "runTiming"],
          },
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
          openaiSimpleGrader: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              model: { type: "string" },
              scoringGuidelines: { type: "string" },
              passThreshold: { type: "number" },
            },
            required: ["name", "model", "scoringGuidelines", "passThreshold"],
          },
          openaiPythonGrader: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              sourceCode: { type: "string" },
              passThreshold: { type: "number" },
              imageTag: { type: ["string", "null"] },
            },
            required: ["name", "sourceCode", "passThreshold", "imageTag"],
          },
        },
        required: ["id", "title", "evalSourceId", "evalSourceTitle", "purpose", "whyNeeded", "whatItEvaluates", "whenToUse", "graderOverview", "graderType", "instructions", "passCriteria", "failCriteria", "scoringRubric", "expectedOutputShape", "openaiSimpleGrader", "openaiPythonGrader"],
      },
    },
    packageVersion: { type: "number" },
    qualityScore: { type: "number" },
    qualitySummary: { type: "string" },
    assumptionsUsed: { type: "array", items: { type: "string" } },
  },
  required: ["promptTitle", "masterSystemPrompt", "graders", "qualityScore", "qualitySummary", "assumptionsUsed", "packageVersion"],
} as const;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");
  // Bound the request and retry transient failures (429/5xx/timeout) with the
  // SDK's exponential backoff. Timeout is set well above the success-path p99
  // so slow-but-successful calls are unaffected; only the failure path changes.
  // The JSON response contract is unchanged.
  return new OpenAI({ apiKey, timeout: 120_000, maxRetries: 2 });
}

const ADES_OPENAI_MODEL = "gpt-5-mini";

type PackageRequest = { projectId?: string; forceRegenerate?: boolean };

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

    const forceRegenerate = body.forceRegenerate === true && isAdminBypass(email);
    const existingPackage = project.masterPromptPackage;
    if (existingPackage && typeof existingPackage === "object" && !forceRegenerate) {
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
          content: `Create the master prompt package from this canonical ADES project data. Build an implementation-ready masterSystemPrompt and concrete, testable graders with traceability to ADES workflow/evals/risks/safeguards/escalation rules.

For every grader, use graderOverview as the primary human-readable overview. Do not make broad prose fields repeat each other.
- summary = one-line label
- riskIfMissing = consequence if not checked
- evaluatedBehavior = observable behavior
- evaluatedBehavior = short explanation only (max 2 sentences)
- checksToPerform = concrete checklist items
- evidenceToInspect = artifacts/fields to inspect
- passDecisionRule = concise pass/fail decision rule
- borderlineHandling = partial/ambiguous cases
- runTiming = when to run this grader
Avoid long paragraph fields and do not compress all graderOverview information into evaluatedBehavior.
Do not copy passCriteria or failCriteria into graderOverview.

Return exactly this JSON shape: {"packageVersion":4,"promptTitle":"string","masterSystemPrompt":"string","graders":[{"id":"string","title":"string","evalSourceId":"string | null","evalSourceTitle":"string | null","purpose":"string","whyNeeded":"string","whatItEvaluates":"string","whenToUse":"string","graderOverview":{"summary":"string","riskIfMissing":"string","evaluatedBehavior":"string","checksToPerform":["string"],"evidenceToInspect":["string"],"passDecisionRule":"string","borderlineHandling":"string","runTiming":"string"},"graderType":"model_graded | rule_based | hybrid","instructions":"string","passCriteria":["string"],"failCriteria":["string"],"scoringRubric":{"score0":"string","score1":"string","score2":"string","score3":"string","score4":"string","score5":"string"},"expectedOutputShape":"string | null","openaiSimpleGrader":{"name":"string","model":"gpt-5-mini","scoringGuidelines":"string","passThreshold":0.0},"openaiPythonGrader":{"name":"string","sourceCode":"string with def grade(sample: dict, item: dict) -> float","passThreshold":0.0,"imageTag":null}}],"qualityScore":0,"qualitySummary":"string","assumptionsUsed":["string"]}\n\nData:\n${JSON.stringify(canonicalData)}`,
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
      packageVersion: Number(parsed.packageVersion ?? 4) || 4,
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
