# Codex Working Rules for ADES

This file defines exactly how Codex should collaborate on ADES.

Use this file as a standing instruction source whenever working on the repo.

---

## 1. Project context

Project name: **ADES — Agent Design Studio**

ADES is a visual AI-powered product for PMs and non-developers.
It turns a plain-language agent idea into an editable Miro-like board with:

- tasks
- reflections
- feedback loops
- risks
- evals
- business metrics
- critique

The app is not an agent runtime in V1.
It is a design and planning studio.

Refer to `docs/ADES_MASTER_SPEC.md` for product direction.

---

## 2. Stack constraints

Use the following stack unless explicitly changed:

- Next.js
- TypeScript
- Tailwind CSS
- React Flow
- Zustand
- Firebase Auth with Google sign-in only
- Firestore
- OpenAI Responses API
- Vercel hosting
- GitHub web-only workflow

Important constraints:
- no local terminal should be assumed unless absolutely unavoidable
- no Firebase Storage
- no extra backend outside Next.js route handlers
- keep the architecture lean
- keep everything on `main` branch for now

---

## 3. How Codex must answer

For every meaningful implementation request, return the answer in this exact structure:

### A. Goal
What this step is trying to achieve.

### B. What will be built now
The smallest shippable scope for this step.

### C. Files to create or edit
Provide a flat list of files.

### D. Full file contents
Return the complete contents for every file that must be created or changed.
Do not return fragments unless explicitly asked.

### E. External manual actions
List every manual action separately.
These include:
- GitHub actions
- Vercel actions
- Firebase console actions
- Google/Firebase auth setup steps

Make these click-by-click whenever possible.

### F. Environment variables
List exactly which environment variables must be added and where.

### G. Validation steps
Explain exactly how to verify the step worked.
Prefer browser-based validation.

### H. Definition of done
A short checklist for completion.

### I. Next smallest step
Recommend the next implementation step only after the current one is complete.

---

## 4. Planning behavior

When the request is broad or multi-step, start in planning mode.
Break the work into small milestones.

Preferred behavior:
1. plan first
2. implement one milestone at a time
3. keep changes small enough to verify easily

Do not try to build the whole app in one uncontrolled jump.
Even if the user asks for full overview, keep implementation steps modular.

---

## 5. External setup behavior

Whenever setup in Firebase, Vercel, or GitHub is needed:

- separate it from the code
- explain what the user must click
- do not assume prior setup exists unless confirmed
- warn clearly before any irreversible action

Examples of external setup tasks:
- create Firebase project
- enable Google auth provider
- create Firestore database
- add Vercel environment variables
- deploy from GitHub to Vercel

---

## 6. Coding style rules

- use TypeScript everywhere practical
- keep code readable and minimal
- avoid unnecessary abstractions
- prefer server routes for OpenAI calls
- keep the UI clean and product-like
- prefer small utilities over heavy frameworks
- only add libraries when clearly justified
- comment only where it improves understanding

---

## 7. Product behavior rules

When implementing ADES, always preserve these priorities:

1. visual editable board is central
2. reflections are required
3. evals are required
4. business metrics are required
5. critique is required
6. exports must remain practical
7. PM-friendly language matters

If tradeoffs are needed, prefer:
- clarity over complexity
- usability over architectural perfection
- fast iteration over overengineering

---

## 8. AI feature rules

When implementing the generate and critique flows:

- use structured outputs
- keep prompts practical and concise
- avoid verbose essay-style outputs
- produce data suitable for board rendering
- always include reflections
- always include assumptions
- always include evals
- always include business metrics
- always include critique signals when relevant

Do not make the model generate long prose when structured board content is enough.

---

## 9. Firestore and auth rules

- require authenticated users for project access
- ensure project ownership is respected
- keep Firestore reads/writes lean
- do not expose secrets in client code
- keep usage caps enforced on server-side routes

When implementing limits:
- read usage record from Firestore
- check whether the user exceeded quota
- reject politely if over quota
- update usage counters after allowed calls

---

## 10. Export rules

ADES must support:
- Markdown export
- JSON export
- image export
- print-friendly PDF route

Markdown export should be useful for Codex or Claude handoff.
JSON export should be stable enough for restore/import.

---

## 11. UX rules

The app should feel:
- visual
- light
- modern
- friendly
- closer to Miro than to enterprise dashboards

Important UI priorities:
- obvious call to action
- easy project creation
- easy board editing
- clear critique and eval viewing
- strong export visibility

---

## 12. What to avoid

Avoid these unless explicitly requested:
- complex design systems
- multi-tenant workspaces
- live collaboration
- billing systems
- role-based permission systems
- unnecessary backend layers
- overly abstract folder structures
- too many node types

---

## 13. Preferred implementation sequence

1. project shell and routing
2. auth flow
3. dashboard
4. board with mock data
5. Firestore persistence
6. generate route
7. critique route
8. exports
9. usage caps
10. polish

If the user asks for a full overview, provide the full overview but still implement in this order.

---

## 14. How to handle uncertainty

If something is ambiguous:
- make the leanest reasonable choice
- state the assumption clearly
- move forward

Do not block progress over minor ambiguity.

---

## 15. Repo discipline

For now:
- everything can go into `main`
- keep files coherent
- prefer full-file updates
- when changing an existing file, return the complete updated file

---

## 16. Reusable kickoff prompt

Use this when starting a new build step:

```text
Read docs/ADES_MASTER_SPEC.md and docs/CODEX_RULES.md.
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

Keep the stack lean and do not assume local terminal usage.
```
