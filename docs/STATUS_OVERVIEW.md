# ADES Status Overview (Post-M4 Baseline)

_Last updated: 2026-04-12_

This document gives a lean but comprehensive snapshot of where ADES is now, what works, and what to build next.

---

## 1) Current status by milestone

- Milestone 0 — **done**
- Milestone 1 — **done**
- Milestone 2 — **done in code** (still depends on Firebase/Vercel real env verification)
- Milestone 3 — **done in code** (dashboard create/list/rename/open flow implemented)
- Milestone 4 — **in progress** (React Flow board + local editing baseline complete)
- Milestone 5+ — **not started / todo**

Source of truth remains `docs/MILESTONES.md`.

---

## 2) What works right now

### Auth and route protection
- Google sign-in flow exists.
- Signed-out users are redirected away from protected pages.
- First sign-in user profile sync to Firestore is implemented.

### Dashboard project CRUD (Milestone 3)
- Create project with title.
- Owner-scoped project list query.
- Rename project from dashboard (inline edit UI).
- Open project route from dashboard cards.
- Empty/loading/error states present.

### Studio board baseline (Milestone 4)
- `/project/[id]` now renders a real React Flow canvas.
- Starter node set includes: goal, task, reflection, eval, business metric.
- Pan/zoom, minimap, controls, dragging, and connecting are wired.
- Local Zustand store handles nodes, edges, selected node, add/delete actions.
- Right inspector edits title/body/tags with explicit fields for:
  - reflection checkpoint
  - eval metric
  - business metric
- Board edits persist in-session (local state only; no backend writes yet).

---

## 3) What is intentionally still missing

These are intentionally deferred to keep implementation lean:
- Firestore board autosave and reload persistence (Milestone 5)
- Generate and critique APIs (Milestones 6 and 7)
- Export stack (Milestone 8)
- Usage caps and cost controls (Milestone 9)

---

## 4) M5 prep completed in this slice

### Locked local board schema (for M5 handoff)
- `AdesNodeData` (label/body/tags + explicit reflection/eval/business metric fields)
- `AdesNode` typed to core node set
- `AdesBoardSnapshot` (`nodes` + `edges`)

This schema is now stable enough to become the persisted Firestore `board` shape.

### Debounced autosave strategy (to implement in M5)
1. Load board from Firestore if present; otherwise initialize starter board.
2. Track `lastSavedAt` and `isDirty` in the board store.
3. On changes to nodes/edges, debounce save (e.g., 800–1200ms).
4. Save only the `AdesBoardSnapshot` payload.
5. Use owner-scoped project writes only (`ownerUid` already enforced in read flow).
6. Flush save on route leave/unmount when there are unsaved changes.

---

## 5) Detailed next steps (lean, ordered)

### Step 1 — M5.1: Firestore load/restore for board snapshot
**Goal:** hydrate board from project document while preserving starter fallback.

- Add board read mapping from Firestore `project.board` into store snapshot.
- Keep starter board path for projects with empty or missing board.

**Done when:** reload restores previous board for persisted projects.

### Step 2 — M5.2: Debounced autosave for board edits
**Goal:** persist board without chatty writes.

- Add debounce utility/hook for write scheduling.
- Save `nodes` and `edges` to `project.board` with `updatedAt`.

**Done when:** edits save automatically with low write frequency.

### Step 3 — M5.3: Ownership-safe write pattern and UX state
**Goal:** ensure saves are reliable and transparent.

- Keep writes owner-scoped via existing user/project identity checks.
- Add lightweight saving indicator (`Saving…`, `Saved`).
- Handle save errors with retry-safe messaging.

**Done when:** board persistence feels trustworthy for PM usage.

---

## 6) What “everything works” means at this stage

At this stage (through M4 baseline), “works” means:
- Auth flow and protected routes run with valid Firebase config.
- Dashboard project CRUD works for authenticated owner.
- Project studio renders a usable React Flow board.
- Core manual design loop works locally (move/connect/edit/add/delete).
- App builds cleanly (`npm run lint`, `npm run build`).

This is enough to proceed safely to M5 persistence.
