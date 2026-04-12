# ADES Status Overview (Post-M3 Review)

_Last updated: 2026-04-12_

This document gives a lean but comprehensive snapshot of where ADES is now, what works, and what to build next.

---

## 1) Current status by milestone

- Milestone 0 — **done**
- Milestone 1 — **done**
- Milestone 2 — **done in code** (still depends on Firebase/Vercel real env verification)
- Milestone 3 — **done in code** (dashboard create/list/rename/open flow implemented)
- Milestone 4+ — **not started / todo**

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

### Project route ownership guard
- Project page fetches by project ID.
- Returns access/not-found state when unavailable.

---

## 3) What is intentionally still missing

These are intentionally deferred to keep implementation lean:
- React Flow board editing UX (Milestone 4)
- Board autosave and persistence (Milestone 5)
- Generate and critique APIs (Milestones 6 and 7)
- Export stack (Milestone 8)
- Usage caps and cost controls (Milestone 9)

---

## 4) Key risks / checks before moving forward

1. **Firestore security rules must enforce ownership** for `projects` and `usage`.
2. **Firebase + Vercel env variables** must be set in real deployment.
3. **Project query indexes** may be requested by Firestore console for some query combinations; create them only if prompted.
4. Keep M4 focused on editing basics only (no overengineering).

---

## 5) Detailed next steps (lean, ordered)

### Step 1 — M4.1: Render minimal React Flow board in project page
**Goal:** replace canvas placeholder with an actual visual board.

- Install and wire React Flow.
- Render a tiny starter board for an empty project (goal/task/reflection/eval/business metric nodes).
- Keep styling simple and Miro-like.
- Do not add autosave yet.

**Done when:** user can pan/zoom and see starter nodes on `/project/[id]`.

### Step 2 — M4.2: Local board state with Zustand
**Goal:** editable board state without backend coupling.

- Add a small project board store (nodes + edges + selected node).
- Load starter board into store.
- Wire drag/move/connect updates in local state.

**Done when:** node movement and edge edits remain stable during session.

### Step 3 — M4.3: Inspector edits
**Goal:** make node content editable in a PM-friendly flow.

- Add right-side inspector bound to selected node.
- Support editing title/body/tags (lean schema).
- Keep explicit fields for reflection/eval/business metric node clarity.

**Done when:** user can select a node and edit core text fields instantly.

### Step 4 — M4.4: Add/delete nodes
**Goal:** complete minimum manual design loop.

- Add “Add block” actions for core ADES node types.
- Add delete action for selected node.
- Keep node types limited to spec essentials.

**Done when:** user can create and remove blocks without breaking canvas.

### Step 5 — M4.5: Visual polish pass (small)
**Goal:** keep UX coherent before persistence work.

- Add minimap and controls.
- Improve spacing/colors for node readability.
- Ensure reflection/evals/business metrics are visually obvious.

**Done when:** board feels usable enough for first real test sessions.

### Step 6 — M5 kickoff prep
**Goal:** prepare clean handoff into Firestore persistence.

- Define board JSON shape used in Zustand.
- Confirm it matches export/import needs later.
- Document autosave strategy (debounced writes, owner-safe reads).

**Done when:** M5 can start with zero schema ambiguity.

---

## 6) What “everything works” means at this stage

At this stage (through M3), “works” means:
- Auth flow and protected routes run with valid Firebase config.
- Dashboard project CRUD works for authenticated owner.
- Project route opens and handles unavailable access cleanly.
- App builds cleanly (`npm run lint`, `npm run build`).

This is enough to proceed safely to M4 board editing.
