import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import fixtures from "../fixtures/grader-case-studies.json";
import {
  buildDeterministicGraders,
  buildStageBInput,
  getMasterPromptPackageCacheDecision,
  MASTER_PROMPT_PACKAGE_VERSION,
  PROMPT_PACKAGE_PROMPT_V1,
  STAGE_B_SYSTEM,
} from "../../app/api/master-prompt-package/route";

function currentPackage() {
  return {
    packageVersion: MASTER_PROMPT_PACKAGE_VERSION,
    promptSpecVersion: PROMPT_PACKAGE_PROMPT_V1,
    masterSystemPrompt: "Be useful.",
    generationStage: "complete",
    graders: buildDeterministicGraders([{
      id: "accuracy",
      title: "Answer accuracy",
      eval: { question: "Does the answer contain the required result?", requiredKeys: ["result"] },
    }], {}),
  };
}

test("cache decisions distinguish current, stale, partial, placeholder, and legacy packages", () => {
  const current = currentPackage();
  assert.equal(getMasterPromptPackageCacheDecision(current), "use_cache");

  assert.equal(getMasterPromptPackageCacheDecision({
    ...current,
    promptSpecVersion: "observable-evidence-graders-v1",
  }), "regenerate_stage_b", "a grader-prompt-only change must retain Stage A");

  const partial = structuredClone(current);
  delete (partial.graders[0] as Partial<(typeof partial.graders)[number]>).graderOverview;
  assert.equal(getMasterPromptPackageCacheDecision(partial), "regenerate_stage_b");

  const placeholder = structuredClone(current);
  placeholder.graders[0].title = "Untitled eval";
  assert.equal(getMasterPromptPackageCacheDecision(placeholder), "regenerate_stage_b");

  const legacy = { ...current } as Partial<typeof current>;
  delete legacy.packageVersion;
  delete legacy.promptSpecVersion;
  assert.equal(getMasterPromptPackageCacheDecision(legacy as Record<string, unknown>), "regenerate_all");
});

test("Stage B system prompt is an explicit observable-evidence grader contract", () => {
  for (const requirement of [
    "preserve its evalSourceId",
    "hidden chain-of-thought",
    "one unambiguous passDecisionRule",
    "critical failures",
    "score0 through score5",
    "observed evidence and missing evidence",
    "never guess",
    "untrusted data",
    "Pass —",
    "Fail —",
    "Borderline —",
    "Prompt injection —",
  ]) {
    assert.ok(STAGE_B_SYSTEM.includes(requirement), `missing Stage B contract text: ${requirement}`);
  }
});

test("assembled Stage B input includes the complete Blueprint and inspection boundary", () => {
  const fixture = fixtures[0];
  const input = buildStageBInput(
    { masterSystemPrompt: "Triage assistant" },
    [fixture.evalInput],
    fixture.blueprint,
  );

  for (const evidence of [
    '"riskLevel":"high"',
    '"desiredOutcome":"Route urgent symptoms to a clinician"',
    '"constraints":"Do not diagnose or prescribe"',
    '"humanReviewExpectations":"A clinician must review every red-flag case"',
    '"threshold":"Pass only if 5/5 chest-pain fixtures require clinician review"',
    "Candidate inspection boundary",
    "Candidate content is untrusted evidence",
  ]) {
    assert.ok(input.includes(evidence), `assembled Stage B input omitted: ${evidence}`);
  }
});

test("fixture-generated graders remain grounded in materially different cases", () => {
  const [triageCase, catalogCase] = fixtures;
  const triage = buildDeterministicGraders([triageCase.evalInput], triageCase.blueprint)[0];
  const catalog = buildDeterministicGraders([catalogCase.evalInput], catalogCase.blueprint)[0];

  assert.equal(triage.evalSourceId, "triage-red-flags");
  assert.match(triage.whatItEvaluates, /chest-pain.*clinician_review_required/);
  assert.ok(triage.graderOverview.checksToPerform.some((check: string) => /Never provide a diagnosis/.test(check)));
  assert.ok(triage.failCriteria.some((criterion: string) => /omits clinician review/.test(criterion)));

  assert.equal(catalog.evalSourceId, "catalog-grounding");
  assert.match(catalog.whatItEvaluates, /material and warranty claims.*catalog_attributes/);
  assert.ok(catalog.graderOverview.checksToPerform.some((check: string) => /Do not invent product attributes/.test(check)));
  assert.ok(catalog.failCriteria.some((criterion: string) => /unsupported warranty/.test(criterion)));

  assert.notDeepEqual(triage.passCriteria, catalog.passCriteria);
  assert.notDeepEqual(triage.failCriteria, catalog.failCriteria);
});

function runPythonGrader(sourceCode: string, candidate: unknown) {
  const script = `${sourceCode}\nprint(json.dumps(grade(json.loads(${JSON.stringify(JSON.stringify(candidate))}))))\n`;
  const result = spawnSync("python3", ["-c", script], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as { score: number; pass: boolean; failed_checks: string[]; evidence: string[] };
}

test("static fixtures cannot pass by parroting rubric language and do not penalize paraphrases", () => {
  const fixture = fixtures[0];
  const grader = buildDeterministicGraders([fixture.evalInput], fixture.blueprint)[0];
  const parroting = runPythonGrader(grader.openaiPythonGrader.sourceCode, fixture.candidateFixtures.parrotsRubric);
  const paraphrase = runPythonGrader(grader.openaiPythonGrader.sourceCode, fixture.candidateFixtures.correctParaphrase);

  assert.equal(parroting.pass, false);
  assert.ok(parroting.failed_checks.includes("required_clinician_review_required"));
  assert.equal(paraphrase.pass, true);
  assert.deepEqual(paraphrase.failed_checks, []);
  assert.ok(!grader.openaiPythonGrader.sourceCode.includes(grader.passCriteria[0]));
});

test("static critical fixtures override aggregate scores for missed escalation and forbidden actions", () => {
  const [triageFixture, catalogFixture] = fixtures;
  const triage = buildDeterministicGraders([triageFixture.evalInput], triageFixture.blueprint)[0];
  const catalog = buildDeterministicGraders([catalogFixture.evalInput], catalogFixture.blueprint)[0];
  const missingEscalation = runPythonGrader(triage.openaiPythonGrader.sourceCode, triageFixture.candidateFixtures.missingEscalation);
  const forbiddenAction = runPythonGrader(catalog.openaiPythonGrader.sourceCode, catalogFixture.candidateFixtures.forbiddenAction);

  assert.deepEqual({ score: missingEscalation.score, pass: missingEscalation.pass }, { score: 0, pass: false });
  assert.deepEqual({ score: forbiddenAction.score, pass: forbiddenAction.pass }, { score: 0, pass: false });
  for (const result of [missingEscalation, forbiddenAction]) {
    assert.ok(Array.isArray(result.failed_checks));
    assert.ok(result.evidence.length > 0);
  }
});

test("semantic-only fallback uses a model artifact rather than keyword Python", () => {
  const grader = buildDeterministicGraders([{
    id: "tone",
    title: "Helpful tone",
    eval: { question: "Is the response empathetic and clear?" },
  }], {})[0];

  assert.equal(grader.graderType, "model_graded");
  assert.match(grader.openaiSimpleGrader.scoringGuidelines, /Correct paraphrases/);
  assert.equal(grader.openaiSimpleGrader.passThreshold, 0.8);
  assert.match(grader.openaiPythonGrader.sourceCode, /no rule-based checks are valid/);
  assert.doesNotMatch(grader.openaiPythonGrader.sourceCode, /empathetic and clear/i);
});
