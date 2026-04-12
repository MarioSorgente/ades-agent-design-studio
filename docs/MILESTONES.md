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
- [ ] Docs committed to `main`

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
**Status:** `in_progress`

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
This milestone becomes `done` once these files are committed into `main`.

---

## Milestone 1 — App foundation
**Status:** `todo`

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

---

## Milestone 2 — Firebase auth
**Status:** `todo`

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

---

## Milestone 3 — Dashboard and project CRUD
**Status:** `todo`

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

---

## Milestone 4 — Studio board and editing
**Status:** `todo`

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

---

## Milestone 5 — Firestore persistence for board state
**Status:** `todo`

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

---

## Milestone 6 — AI generation
**Status:** `todo`

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

---

## Milestone 7 — Critique flow
**Status:** `todo`

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

---

## Milestone 8 — Exports
**Status:** `todo`

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

---

## Milestone 9 — Usage caps and cost control
**Status:** `todo`

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

1. Commit the docs and repo operating files.
2. Connect the repo to Vercel.
3. Create the Firebase project and web app.
4. Enable Google auth and create Firestore.
5. Ask Codex to implement Milestone 1.

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
