# AGENTS.md

This repository uses Codex as a build partner for **ADES — Agent Design Studio**.

Read this file before doing any implementation work.

## 1. Project purpose

ADES is a visual AI-powered **Agent Design Studio** for PMs and non-developers.

It turns a plain-language agent idea into an editable Miro-like board with:

- tasks
- reflections
- feedback loops
- risks
- evals
- business metrics
- critique

V1 is **not** an agent runtime.
It is a **design, planning, critique, and eval-definition tool**.

For product direction, read:

- `docs/ADES_MASTER_SPEC.md`
- `docs/EXTERNAL_SETUP_GUIDE.md`

## 2. Stack and constraints

Use this stack unless the user explicitly changes it:

- Next.js
- TypeScript
- Tailwind CSS
- React Flow
- Zustand
- Firebase Auth with Google sign-in only
- Firestore
- OpenAI Responses API
- Vercel
- GitHub web-first workflow

Constraints:

- keep everything on `main` for now
- do not assume a local terminal unless unavoidable
- no Firebase Storage
- no extra backend outside Next.js route handlers
- keep architecture lean
- keep the UI visual and Miro-like
- keep exports practical: Markdown, JSON, image, print/PDF

## 3. Working style for Codex

For every meaningful implementation step, respond in this exact structure:

### A. Goal
What this step is trying to achieve.

### B. What will be built now
The smallest shippable scope for this step.

### C. Files to create or edit
Provide a flat list of files.

### D. Full file contents
Return the complete contents for every file that must be created or changed.

### E. External manual actions
List every manual action separately.
Examples:
- Firebase console clicks
- Vercel environment variables
- GitHub repo actions

### F. Environment variables
List exactly which environment variables are needed and where they must be added.

### G. Validation steps
Explain exactly how to verify the step worked.

### H. Definition of done
A short checklist.

### I. Next smallest step
Recommend only the next step after the current one.

## 4. Planning behavior

If the task is broad, ambiguous, or multi-step:

1. start in planning mode
2. break the work into milestones
3. implement one milestone at a time
4. keep steps small enough to verify easily

Use `MILESTONES.md` as the implementation tracker.
Update it whenever a milestone starts, changes materially, or is completed.

Do not jump into a giant uncontrolled implementation, even if the user asks for the whole app at once.

## 5. Repo-level priorities

Always preserve these product priorities:

1. visual editable board is central
2. reflections are required
3. evals are required
4. business metrics are required
5. critique is required
6. PM-friendly language matters
7. export quality matters

If tradeoffs are needed, prefer:

- clarity over complexity
- usability over architectural perfection
- lean code over overengineering
- shipping a coherent slice over building every edge case

## 6. AI feature rules

When implementing `/api/generate` and `/api/critique`:

- use structured outputs
- keep prompts concise and practical
- produce data suitable for board rendering
- always include reflections
- always include assumptions
- always include evals
- always include business metrics
- always include critique signals when relevant

Avoid long essay-style outputs when structured content is enough.

## 7. Auth, Firestore, and quota rules

- authenticated users only for dashboard and project access
- users may only access their own projects
- generation and critique only happen server-side
- usage caps must be enforced in server routes
- secrets must never be exposed in client code

When implementing quota checks:

1. verify auth identity
2. read usage document
3. reject politely if over quota
4. increment counters in Firestore

## 8. Export rules

ADES must support:

- Markdown export
- JSON export
- image export
- print-friendly PDF route

Markdown must be good enough to hand off into Codex or Claude.

## 9. UX rules

The product should feel:

- visual
- modern
- light
- friendly
- more like Miro than like a dense enterprise admin panel

Important UX priorities:

- obvious primary actions
- easy project creation
- easy board editing
- clear critique and eval viewing
- visible export actions

## 10. What to avoid

Avoid these unless explicitly requested:

- live collaboration
- billing systems
- role-based permission systems
- unnecessary backend layers
- complex design systems
- too many node types
- premature template marketplaces
- agent execution infrastructure

## 11. Preferred implementation order

Follow this order unless a good reason is documented in `MILESTONES.md`:

1. app shell and routing
2. Firebase auth flow
3. dashboard
4. board with editing and mock data
5. Firestore persistence
6. generate route
7. critique route
8. exports
9. usage caps
10. polish

## 12. How to handle uncertainty

If something is ambiguous:

- make the leanest reasonable choice
- state the assumption clearly
- continue moving

Do not block progress over minor ambiguity.

## 13. Done means verified

A step is not done just because code exists.
It is done when:

- code is added
- required external setup is documented
- validation steps are provided
- success criteria are met
- `MILESTONES.md` is updated

## 14. Reusable kickoff prompt

Use this when starting a new Codex chat:

```text
Read AGENTS.md, docs/ADES_MASTER_SPEC.md, docs/CODEX_RULES.md, and MILESTONES.md.
Plan and implement the next smallest shippable step for ADES.

Return:
1. Goal
2. What will be built now
3. Files to create/edit
4. Full file contents
5. External manual actions
6. Environment variables
7. Validation steps
8. Definition of done
9. Next smallest step

Keep the implementation lean.
Do not assume local terminal usage unless unavoidable.
Update MILESTONES.md when the step is completed.
```
