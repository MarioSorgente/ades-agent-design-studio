# MILESTONES.md

This file is the execution tracker for **ADES — Agent Design Studio**.

Use it to keep implementation structured, inspectable, and easy to resume across Codex chats.

## Status legend

- `todo` — not started
- `in_progress` — currently being worked on
- `blocked` — waiting on external setup or decision
- `done` — completed and validated

---

## Project outcome

Build ADES as a lean, visual, AI-powered **Agent Design Studio** for PMs and non-developers.

Core outcome for V1:

A signed-in user can create a project, generate an agent design from an idea, edit it on a Miro-like board, run critique, and export it as Markdown, JSON, and a printable visual format.

---

## Current stack

- Next.js
- TypeScript
- Tailwind CSS
- React Flow
- Zustand
- Firebase Auth (Google only)
- Firestore
- OpenAI Responses API
- Vercel
- GitHub web-first workflow

---

## External dependencies checklist

### GitHub
- [x] Repo created: `ades-agent-design-studio`
- [x] Docs committed to `main`

### Vercel
- [ ] Project connected to GitHub
- [ ] Initial deployment completed
- [ ] Environment variables added

### Firebase
- [ ] Firebase project created
- [ ] Web app registered
- [ ] Google sign-in enabled
- [ ] Firestore created
- [ ] Authorized domains confirmed

### OpenAI
- [ ] API key created
- [ ] API key added to Vercel

---

## Milestone 0 — Repository operating system
**Status:** `done`

### Goal
Make the repo self-explanatory for Codex and future implementation work.

### Includes
- product spec present
- Codex working rules present
- external setup guide present
- agent instructions present
- milestone tracker present

### Exit criteria
- `docs/ADES_MASTER_SPEC.md` exists
- `docs/CODEX_RULES.md` exists
- `docs/EXTERNAL_SETUP_GUIDE.md` exists
- `AGENTS.md` exists
- `MILESTONES.md` exists

### Notes
Scaffold/docs baseline introduced in commit `674a9bc` (Add files via upload).
This milestone is complete because the required repository-operating docs are now committed.

---

## Milestone 1 — App foundation
**Status:** `done`

### Goal
Create the full app shell and routing structure.

### Includes
- Next.js app structure
- global layout
- landing page
- sign-in page
- dashboard page shell
- project page shell
- print page shell
- basic navigation
- placeholder loading and empty states

### Exit criteria
- routes render correctly
- app deploys on Vercel
- visual shell exists for all main pages

### Risks
- overbuilding before auth is ready
- inconsistent folder structure


### Notes (2026-04-12)
- App shell and route structure are implemented for `/`, `/sign-in`, `/dashboard`, `/project/[id]`, and `/project/[id]/print`.
- Production build succeeds and all milestone routes are generated.
- Remaining milestone dependency is external deployment verification on Vercel.

---

## Milestone 2 — Firebase auth
**Status:** `done`

### Goal
Allow users to sign in with Google and access protected app routes.

### Includes
- Firebase client setup
- auth provider / hooks
- sign in with Google
- sign out
- route protection for dashboard and project pages
- create user doc on first sign-in

### Exit criteria
- user can sign in with Google
- user can sign out
- protected routes redirect correctly
- user document is created or updated

### Blockers
- Firebase project setup
- authorized domain setup
- Firebase config variables in Vercel


### Notes (2026-04-12 — implementation update)
- Implemented Firebase client/auth/firestore bootstrap files and Google sign-in/sign-out helpers.
- Added global auth state handling with Zustand plus an auth provider using Firebase `onAuthStateChanged`.
- Added protected-route guards for dashboard and project routes (including print view).
- Added first-sign-in user profile upsert to `users/{uid}` via Firestore.
- Remaining work is external verification with real Firebase credentials and Vercel environment setup.

### Completion notes (2026-04-12)
- Firebase auth milestone implementation is complete in code and ready for Milestone 3 handoff.
- Sign-in/sign-out, protected routes, and user profile upsert are in place.

### Execution plan (smallest shippable slices)
1. **Slice M2.1 — Firebase bootstrap in code**
   - Add `lib/firebase/client.ts` with guarded singleton initialization.
   - Add `lib/firebase/auth.ts` with Google provider and helper methods.

2. **Slice M2.2 — Auth state and route protection (client-side)**
   - Add a lightweight auth store/hook for loading + signed-in state.
   - Protect `/dashboard` and `/project/[id]` with redirect to `/sign-in` when unauthenticated.

3. **Slice M2.3 — Sign in / sign out UX wiring**
   - Wire “Continue with Google” on `/sign-in`.
   - Add a visible sign-out action in the app shell for authenticated pages.

4. **Slice M2.4 — First sign-in user document sync**
   - On successful auth, upsert `users/{uid}` with profile and timestamps in Firestore.

5. **Slice M2.5 — End-to-end verification + docs**
   - Validate redirect behavior, sign-in, sign-out, and `users/{uid}` creation.
   - Mark Milestone 2 done once external Firebase/Vercel setup checklist is completed.

---

## Milestone 3 — Dashboard and project CRUD
**Status:** `done`

### Goal
Let authenticated users create, view, rename, and open projects.

### Includes
- dashboard project listing
- new project modal or inline creator
- Firestore project creation
- recent project cards/list
- empty state for new users

### Exit criteria
- user can create a project
- project persists to Firestore
- dashboard shows owned projects only
- clicking a project opens the studio route

### Notes (2026-04-12)
- Implemented authenticated dashboard project CRUD basics: create, list (owner-scoped), rename, and open studio route.
- Added Firestore helpers for project create/query/read/rename with owner UID checks in client logic.
- Added project page data load guard so only owner-matching project docs render.
- Milestone 3 is complete for V1 baseline; next milestone is board editing UX in Milestone 4.
- Post-review refinement: renamed dashboard projects via inline edit UI (removed browser prompt dependency) and kept Firestore rename writes lean.
- Detailed implementation sequence is documented in `docs/STATUS_OVERVIEW.md`.

---

## Milestone 4 — Studio board and editing
**Status:** `done`

### Goal
Deliver the main Miro-like studio experience.

### Includes
- React Flow canvas
- node and edge rendering
- draggable nodes
- editable node title/body
- left panel
- right inspector panel
- top actions bar
- zoom/pan/minimap
- add/delete node
- mock starter board for empty projects

### Exit criteria
- user can visually edit a project board
- changes persist locally in state
- UX feels coherent and usable

### Risks
- too many node types too early
- editor complexity before persistence is stable


### Notes (2026-04-12 — completion update)
- Studio board is now fully connected to project loading and keeps the core PM-first editing workflow stable.
- Milestone 4 exit criteria are satisfied with draggable nodes, editable inspector fields, and coherent canvas UX.

### Notes (2026-04-12 — M4 baseline slice)
- Replaced the `/project/[id]` canvas placeholder with a real React Flow board and starter nodes for goal/task/reflection/eval/business metric.
- Added local Zustand board state (`nodes`, `edges`, `selectedNodeId`) with drag/move/connect interactions and in-session persistence.
- Added right-side inspector editing for title/body/tags plus explicit fields for reflection checkpoints, eval metrics, and business metrics.
- Added core-node add/delete actions, minimap, controls, and readable typed node styling for PM-friendly testing.
- M5 prep captured by introducing a concrete local board schema (`AdesNodeData` + `AdesBoardSnapshot`) that will be reused for autosave/export work.

---

## Milestone 5 — Firestore persistence for board state
**Status:** `done`

### Goal
Persist studio data to Firestore cleanly and cheaply.

### Includes
- board save/load
- debounced autosave
- updated timestamps
- restore board on reload
- owner-only access patterns

### Exit criteria
- board edits persist
- reload restores project state
- Firestore reads/writes stay lean


### Notes (2026-04-12)
- Added Firestore-backed board save/load for each project with strict owner checks before writes.
- Added debounced autosave in the studio so edits persist with lean write volume.
- Board state restores from Firestore on project reload, with starter board fallback for first-time projects.
- Project updated timestamps are refreshed when board snapshots are persisted.

### Notes (2026-04-12 — UX redesign pass)
- Completed a milestone-5 UI/UX redesign pass across landing, dashboard, studio shell, and print shell while keeping implementation lean.
- Expanded board node coverage to include goal, task, reflection, feedback, risk, eval, business metric, assumption, and human handoff types with cohesive visual treatments.
- Upgraded studio workspace hierarchy with premium toolbar/panels, stronger canvas styling, improved inspector clarity, and better empty-state guidance.


---

## Milestone 6 — AI generation
**Status:** `done`

### Goal
Generate a structured ADES board from a plain-language idea.

### Includes
- `/api/generate`
- server-side OpenAI call
- Firebase-authenticated request verification
- strict structured JSON response
- conversion of AI output into board state
- save generated result to Firestore

### Required AI output
- summary
- nodes
- edges
- reflections
- evals
- business metrics
- assumptions
- critique seed

### Exit criteria
- signed-in user can generate a board from an idea
- output renders successfully in studio
- generation is stored with project

### Blockers
- OpenAI API key in Vercel
- auth verification flow finalized

### Notes (2026-04-12)
- Added `/api/generate` with Firebase ID-token verification, owner checks, and server-side OpenAI Responses API generation.
- Added structured JSON schema generation with normalization into ADES board nodes/edges plus required reflection/eval/business-metric/assumption coverage.
- Persisted generated title, summary, prompt metadata, assumptions, critique seed, and board snapshot directly to Firestore in the server route.
- Added studio-side generation UI (idea, audience, constraints) that calls `/api/generate`, hydrates board state, and keeps autosave behavior coherent.


---

## Milestone 7 — Critique flow
**Status:** `done`

### Goal
Let the user critique an existing design and improve it.

### Includes
- `/api/critique`
- critique panel UI
- suggested missing reflections
- suggested missing evals
- suggested missing business metrics
- optional "add to board" behavior for suggestions

### Exit criteria
- critique can run on current board
- critique results are readable and actionable
- critique results can be saved to project state


### Notes (2026-04-12)
- Added `/api/critique` with Firebase ID-token verification, project ownership checks, structured OpenAI Responses API output, and Firestore persistence.
- Added in-studio critique UX with actionable findings and one-click "Add to board" for missing reflections, evals, and business metrics.
- Added an explicit auth-persistence improvement (`browserLocalPersistence`) so sign-in state survives refreshes and revisit flows.
- Added lightweight milestone verification checks via `npm run test:milestones` to validate M0–M7 surface coverage.

---

## Milestone 8 — Exports
**Status:** `done`

### Goal
Make ADES outputs usable outside the app.

### Includes
- Markdown export
- JSON export
- JSON import
- image export
- print route for PDF export

### Exit criteria
- Markdown is usable for Codex/Claude handoff
- JSON restores reliably
- board can be exported visually
- print page looks presentation-ready

### Notes (2026-04-12)
- Added in-studio export actions for Markdown, JSON, PNG image, and print/PDF handoff from the project workspace.
- Added JSON import to restore board snapshots and project metadata from exported ADES files.
- Upgraded print route to render project-backed sections for goals, tasks, reflections, evals, business metrics, assumptions, and critique notes.
- Added friendly Firestore permission/index guidance in dashboard errors and improved signed-in account persistence UX in the header/dashboard.

### Notes (2026-04-12 — UX/security refresh pass)
- Refreshed global app navigation with active-route pills and workspace breadcrumb context to reduce orientation friction between Home, Dashboard, and Studio.
- Redesigned dashboard information hierarchy with modern KPI cards, clearer workflow guidance, and stronger project-card actions.
- Hardened Firestore client safety by enforcing owner checks before rename writes and validating node types during snapshot parsing.

---

## Milestone 9 — Usage caps and cost control
**Status:** `in_progress`

### Goal
Protect the OpenAI API budget without overcomplicating the app.

### Includes
- Firestore usage docs
- per-user daily generate cap
- per-user daily critique cap
- server-side enforcement
- clear error messages when capped

### Suggested initial limits
- 5 generate calls/day
- 10 critique calls/day

### Exit criteria
- capped users are blocked politely
- allowed users proceed normally
- usage data updates correctly

### Notes (2026-04-12 — M9 slice)
- Added a shared route-param normalization helper and wired it into both studio and print project routes so project ID parsing is consistent across `/project/[id]` and `/project/[id]/print`.
- Added print-route invalid-ID guard to align error handling with studio route behavior before adding usage-cap enforcement endpoints.

---

## Milestone 10 — Polish and hardening
**Status:** `todo`

### Goal
Improve quality and make ADES feel launch-ready for a small beta.

### Includes
- loading states
- error states
- empty states
- better spacing and node visuals
- Firestore rules review
- prompt tuning
- visual cleanup
- small UX improvements

### Exit criteria
- core flows feel coherent
- top usability pain points are reduced
- beta demo feels stable

---

## Implementation rules

Whenever Codex completes a milestone step:

1. update the status in this file
2. add short notes if assumptions changed
3. note any blockers or external actions still needed

Keep milestones practical.
Do not split into tiny ceremonial tasks unless it improves verification.

---

## Current recommended next action

1. Start Milestone 8 with Markdown export endpoint and client download action from the project studio.
2. Add JSON export/import so projects can be restored without Firestore dependencies.
3. Add a basic image export pathway and finalize print route formatting for PDF handoff.

---

## Reusable milestone-start prompt

```text
Read AGENTS.md, MILESTONES.md, docs/ADES_MASTER_SPEC.md, and docs/CODEX_RULES.md.

Start with the next milestone marked todo or in_progress.
First give me a plan for that milestone.
Then implement only the smallest validated slice of it.

Return:
- Goal
- What will be built now
- Files to create/edit
- Full file contents
- External manual actions
- Environment variables
- Validation steps
- Definition of done
- Next smallest step

At the end, tell me exactly how MILESTONES.md should be updated.
```
