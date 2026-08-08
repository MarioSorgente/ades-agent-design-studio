import assert from "node:assert/strict";
import test from "node:test";

import { analyzeBoardQuality } from "../../lib/board/quality";
import { createNodeData } from "../../lib/board/types";
import type { AdesBoardSnapshot, AdesNode, AdesNodeType } from "../../lib/board/types";

function node(id: string, type: AdesNodeType, label: string, overrides: Partial<AdesNode["data"]> = {}): AdesNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { ...createNodeData(type, label), ...overrides },
  };
}

function hasMissingStepEval(board: AdesBoardSnapshot) {
  return analyzeBoardQuality(board).actionableIssues.find((issue) => issue.id === "critical-step-eval-missing");
}

test("new eval guidance avoids invented targets while legacy saved wording remains intact", () => {
  const defaults = createNodeData("eval", "New eval");
  assert.match(defaults.evalQuestion, /expected output.*observable/i);
  assert.match(defaults.evalCriteria, /specific fact, structure, or decision/i);
  assert.match(defaults.evalDataset, /evaluation set/i);
  assert.match(defaults.evalThreshold, /failures are acceptable/i);
  assert.doesNotMatch(defaults.evalThreshold, /90%/);

  const legacy = node("legacy-eval-copy", "eval", "Old eval", {
    evalQuestion: "Did this step achieve its intended output?",
    evalCriteria: "Accurate, complete, policy-safe",
    evalThreshold: "Pass rate ≥ 90%",
  });
  assert.equal(legacy.data.evalQuestion, "Did this step achieve its intended output?");
  assert.equal(legacy.data.evalCriteria, "Accurate, complete, policy-safe");
  assert.equal(legacy.data.evalThreshold, "Pass rate ≥ 90%");
});

test("generated-board eval edges cover steps without relying on eval-title substrings", () => {
  const toolStep = node("step-tool", "task", "Collect sources", {
    stepType: "tool_use",
    tags: ["critical"],
    tools: ["Search"],
    inputs: "A query",
    outputs: "Sources",
    reasoningRequired: "Choose trustworthy sources",
    completionCriteria: "Sources are relevant",
    commonFailureModes: ["No results"],
  });
  const reviewStep = node("step-review", "task", "Review evidence", { tags: ["important"] });
  const toolEval = node("eval-tool", "eval", "Citation correctness", {
    evalName: "Citation correctness",
    evalQuestion: "Were reliable sources selected?",
    evalCategory: "tool_accuracy",
  });
  const flowEval = node("eval-flow", "eval", "Overall outcome", {
    evalName: "Overall outcome",
    evalQuestion: "Did the workflow achieve its objective?",
    evalCategory: "task_success",
    evalScope: "flow",
  });
  const unrelatedEval = node("eval-unrelated", "eval", "Review evidence wording only", {
    evalName: "Review evidence wording only",
    evalQuestion: "Review evidence",
  });
  const board: AdesBoardSnapshot = {
    nodes: [toolStep, reviewStep, toolEval, flowEval, unrelatedEval],
    edges: [
      // A target eval is an attachment even when an older generator omitted the semantic type.
      { id: "tool-eval", source: toolStep.id, target: toolEval.id },
      // A step can have multiple evals, and a flow-level eval can attach to several steps.
      { id: "tool-flow-eval", source: toolStep.id, target: flowEval.id, data: { semanticType: "eval" } },
      { id: "review-flow-eval", source: reviewStep.id, target: flowEval.id, data: { semanticType: "eval" } },
    ],
  };

  assert.equal(hasMissingStepEval(board), undefined);
  assert.equal(analyzeBoardQuality(board).issues.includes("Tool-use steps are missing tool-accuracy evals."), false);

  board.edges = board.edges.filter((edge) => edge.source !== reviewStep.id);
  assert.equal(hasMissingStepEval(board)?.target?.nodeId, reviewStep.id, "an unrelated eval whose text contains the step title must not provide coverage");

  unrelatedEval.data.evals = [{ relatedStepIds: [reviewStep.id] } as AdesNode["data"]["evals"][number]];
  board.edges.push({ id: "unrelated-other-step", source: toolStep.id, target: unrelatedEval.id, data: { semanticType: "eval" } });
  assert.equal(hasMissingStepEval(board)?.target?.nodeId, reviewStep.id, "edge attachments take precedence over stale relatedStepIds");
});

test("relatedStepIds remain a fallback for boards saved before eval edges", () => {
  const legacyStep = node("legacy-step", "task", "Legacy critical operation", { tags: ["critical"] });
  const legacyEval = node("legacy-eval", "eval", "Historical check", {
    evals: [
      {
        id: "definition",
        name: "Historical check",
        question: "Is the result acceptable?",
        category: "output_quality",
        scope: "step",
        relatedStepIds: [legacyStep.id],
        whyItMatters: "Prevents regressions",
        gradingMethod: "Rubric",
        passCriteria: "Meets rubric",
        threshold: "Pass",
        testCases: "Representative cases",
        failureExamples: "Fails rubric",
        priority: "high",
      },
    ],
  });

  assert.equal(hasMissingStepEval({ nodes: [legacyStep, legacyEval], edges: [] }), undefined);
});
