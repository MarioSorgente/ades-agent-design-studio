import assert from "node:assert/strict";
import test from "node:test";

import fixtures from "../fixtures/grader-case-studies.json";
import {
  buildDeterministicGraders,
  buildStageBInput,
  STAGE_B_SYSTEM,
} from "../../app/api/master-prompt-package/route";

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
