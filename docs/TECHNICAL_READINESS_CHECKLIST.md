# ADES Technical Readiness Checklist

_Last updated: 2026-05-16_

This checklist tracks release readiness for AI generation reliability, observability, deployment hygiene, and security guardrails.

## 1) Monitoring and Logging for Generation

### Goals
- Capture generation success/failure rates.
- Track end-to-end latency and stage latency.
- Track API usage cost and request volume.
- Make incidents diagnosable via structured logs.

### Checklist
- [ ] Add structured server logs in `app/api/generate/route.ts` and `app/api/critique/route.ts` with:
  - request ID
  - user ID (or hashed/anonymized identifier)
  - model name
  - prompt/version tag
  - success/failure outcome
  - latency (ms)
  - token usage and estimated cost
- [ ] Emit standardized error codes (auth, quota, validation, provider, timeout, unknown).
- [ ] Add metrics counters/histograms (e.g., `generation_success_total`, `generation_failure_total`, `generation_latency_ms`, `generation_cost_usd_total`).
- [ ] Configure dashboard + alerts:
  - failure rate spike alert
  - P95 latency threshold alert
  - daily cost threshold alert
- [ ] Add log redaction rules for secrets and user-sensitive content.

## 2) Environment Variables and Deployment Setup

### Goals
- Ensure reproducible deployment in Vercel/Firebase contexts.
- Prevent missing or mis-scoped secrets in production.

### Checklist
- [ ] Create/refresh a single source of truth doc for env vars (name, required/optional, environment scope, sample values).
- [ ] Verify required server-only secrets are not exposed to client bundles.
- [ ] Document deployment sequence:
  1. set env vars in Vercel,
  2. deploy preview,
  3. run smoke tests,
  4. promote to production.
- [ ] Document Firebase project IDs and service-account handling for local/dev/prod.
- [ ] Add a preflight startup check that reports missing critical env vars.

## 3) Rollback Plan for Prompt/Model Changes

### Goals
- Allow safe rollback when output quality, latency, or cost regresses.

### Checklist
- [ ] Version prompts in `lib/ai/prompts/` with explicit version IDs.
- [ ] Add a model/prompt configuration switch (feature flag or env-driven).
- [ ] Define rollback trigger thresholds (quality drop, failure increase, latency/cost regression).
- [ ] Document one-step rollback procedure:
  - revert prompt/model config,
  - redeploy,
  - validate on canary prompts,
  - announce status.
- [ ] Keep a changelog of prompt/model revisions with date, owner, and observed impact.

## 4) Schema and Rendering Regression Tests

### Goals
- Prevent breaking generated board schema and UI rendering.

### Checklist
- [ ] Add schema contract tests for generation output shape (required fields, node arrays, edges, eval/business-metric sections).
- [ ] Add rendering regression tests for representative boards in `components/board/`.
- [ ] Add golden/snapshot fixtures for stable scenarios (small, medium, edge-case prompts).
- [ ] Add CI gate to fail builds on schema/render regression.
- [ ] Add test docs describing how to update fixtures intentionally.

## 5) Firestore Access Isolation (Per-User Project Security)

### Status
- [x] **Confirmed:** Firestore rules restrict project read/write/delete to the authenticated owner only.

### Evidence
- In `firestore.rules`, project reads require `resource.data.ownerUid == request.auth.uid`.
- Project updates additionally enforce immutable ownership via `immutableUnchanged("ownerUid")` and require both existing and incoming owner UID to match the authenticated user.
- Project deletes also require `resource.data.ownerUid == request.auth.uid`.

### Follow-up hardening checks
- [ ] Add emulator security rule tests for cross-user access attempts.
- [ ] Include rule tests in CI before production deploy.
