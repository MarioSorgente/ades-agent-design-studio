# ADES — Agent Design Studio

## 1. Product overview

ADES is a visual **Agent Design Studio** for product managers, founders, and non-developers who want to turn a vague agent idea into a concrete, editable design.

A user describes an agent idea in plain language. ADES generates an interactive Miro-like board with:

- goal and scope
- task breakdown
- reflections and self-checks
- feedback loops
- failure modes and risks
- agent-quality evals
- business/product evals
- assumptions and open questions

The board is editable. Users can drag blocks, edit copy, add or remove nodes, connect ideas, and export the result.

ADES is **not** an agent runtime in V1.
It is a **design, planning, critique, and eval-definition tool** for agents.

---

## 2. Core value proposition

Most people can describe an agent idea.
Very few can design one well.

ADES helps users go from:

> "I want an agent that does X"

To:

> "Here is the design, flow, reflection logic, feedback process, and eval plan for building it well."

This makes ADES valuable for:

- PMs exploring agentic products
- founders validating AI product ideas
- teams aligning on how an agent should work
- builders preparing clean handoff material for Codex or Claude

---

## 3. Audience

### Primary audience
- Product managers
- AI-curious PMs
- founders
- strategy / innovation people
- technical generalists

### Secondary audience
- designers
- engineers needing structured scoping material
- consultants working on AI workflows

### Not the first target
- hardcore ML researchers
- teams seeking fully autonomous agent orchestration from day one

---

## 4. Product goals

### Main goals
1. Turn an agent idea into a structured editable design.
2. Make reflection and critique a first-class part of the output.
3. Generate evals that measure both output quality and business value.
4. Produce outputs that can be handed off to coding tools like Codex or Claude.
5. Keep the first version lean, visual, and easy to use.

### Non-goals for V1
- executing agents
- live multi-user collaboration
- complex permissions
- real-time comments
- version history
- marketplace / templates ecosystem
- analytics dashboards beyond basic usage caps

---

## 5. Product principles

1. **Visual first** — the board matters more than a text wall.
2. **Editable, not frozen** — generation is the starting point, not the final truth.
3. **Reflection matters** — a good agent design includes self-checks and uncertainty handling.
4. **Evals matter** — every design should say how success is measured.
5. **Lean architecture** — minimize infra, minimize moving parts.
6. **PM-friendly language** — do not require deep technical knowledge to understand the result.
7. **Builder-ready export** — everything important can be exported into Markdown and JSON.

---

## 6. V1 scope

### In scope
- Google sign-in only
- user-specific saved projects
- Miro-like editable board
- generate full design from a prompt
- generate critique / reflection suggestions
- generate evals and business metrics
- export to Markdown
- export to JSON
- export board as image
- print-friendly page for PDF export
- usage caps per authenticated user

### Out of scope
- team workspaces
- live collaboration
- comments
- share links with permissions
- agent execution
- third-party app integrations
- billing system
- custom template marketplace

---

## 7. Core user stories

### Creation
- As a PM, I want to describe an agent idea and get back a structured editable board.
- As a founder, I want the board to include missing pieces I forgot to think about.

### Editing
- As a user, I want to move blocks around like in Miro.
- As a user, I want to edit titles and descriptions of blocks.
- As a user, I want to add my own blocks and connect them.

### Reflection and critique
- As a user, I want the system to suggest reflection loops and confidence checks.
- As a user, I want critique of the generated design so I can improve it.

### Evals
- As a user, I want evals for output quality.
- As a user, I want business evals like time saved, human escalation rate, or trust.

### Export
- As a user, I want to export the design as Markdown for Codex or Claude.
- As a user, I want JSON for reloading in ADES.
- As a user, I want an image/PDF to share with stakeholders.

---

## 8. Main product flows

### Flow 1 — Sign in
1. User visits ADES.
2. User signs in with Google.
3. User lands on dashboard.

### Flow 2 — Create a design
1. User clicks “New design”.
2. User enters idea, audience, optional constraints, optional preferred output style.
3. User clicks Generate.
4. Backend checks usage limits.
5. ADES generates the design.
6. User sees the board and related panels.

### Flow 3 — Critique the design
1. User clicks Critique.
2. Backend checks usage limits.
3. ADES returns weaknesses, missing reflection points, missing evals, and business metric blind spots.
4. User can accept or ignore suggestions.

### Flow 4 — Edit manually
1. User drags nodes around.
2. User edits text inline or in inspector panel.
3. User adds or deletes nodes and edges.
4. Changes autosave.

### Flow 5 — Export
1. User exports Markdown.
2. User exports JSON.
3. User exports image.
4. User prints a print view to PDF.

---

## 9. Information architecture

### Main pages
- `/` — landing page
- `/sign-in` — sign-in page or sign-in modal route
- `/dashboard` — list of projects
- `/project/[id]` — main studio canvas
- `/project/[id]/print` — print-friendly export page
- `/api/generate` — AI design generation
- `/api/critique` — AI critique generation
- `/api/export/markdown` — optional server markdown endpoint if needed

### Main layout areas inside project view
- top toolbar
- left side panel: project metadata / block types / export
- center canvas: board
- right side panel: inspector / details / critique / evals
- bottom or side tabs: overview, evals, critique, export

---

## 10. Board structure

The generated design should visually organize blocks into lanes or clusters.

### Suggested block groups
- Goal
- Inputs / context
- Tasks
- Tools / dependencies
- Reflection
- Feedback
- Risks / failure modes
- Evals
- Business metrics
- Human handoff
- Assumptions / open questions

### Supported block types
- `goal`
- `input`
- `task`
- `tool`
- `reflection`
- `feedback`
- `risk`
- `eval`
- `business_metric`
- `handoff`
- `assumption`
- `note`

### Node behavior
- draggable
- editable title
- editable body
- editable tags
- editable severity/priority/importance where relevant
- connectable with edges
- deletable
- duplicable

---

## 11. AI-generated output requirements

Each generation should return:

### Summary
- project title
- one-sentence design summary
- intended user / use case

### Core design
- goal
- task sequence
- dependencies and tools
- assumptions
- risks

### Reflection layer
- checkpoints where the agent should pause and verify
- uncertainty triggers
- confidence checks
- ask-for-clarification conditions
- human escalation conditions

### Feedback layer
- where output should be reviewed
- what feedback should be collected
- how the system should revise itself

### Evals layer
- output-quality evals
- process evals
- business evals
- failure and stress cases
- measurable success criteria

### Critique layer
- missing pieces
- unclear responsibilities
- possible overengineering
- weak eval coverage
- business blind spots

---

## 12. Prompting strategy

Use a multi-pass generation strategy instead of one overloaded prompt.

### Pass A — Generate design
Output a structured design with nodes and edges.

### Pass B — Critique design
Analyze the generated design and identify gaps, weak spots, and improvements.

### Optional pass C — Improve design
Take critique output and suggest enhancements or apply them on request.

### Important prompt rules
- outputs should be structured JSON
- reflections are mandatory
- business metrics are mandatory
- assumptions must be explicit
- human handoff must be explicit when appropriate
- avoid execution-level technical rabbit holes unless necessary

---

## 13. Export requirements

### Markdown export
Should be readable by humans and usable as handoff input for Codex or Claude.

Sections:
- Title
- Summary
- Goal
- Target user
- Task breakdown
- Reflection logic
- Feedback logic
- Risks / failure modes
- Evals
- Business metrics
- Critique summary
- Assumptions

### JSON export
Used by ADES to re-import and restore the board.
Must include nodes, edges, metadata, timestamps, and optional critique.

### Image export
Export visible board as PNG.

### PDF export
Use a print-friendly route so the browser’s print dialog can save to PDF.

---

## 14. Tech stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- React Flow for the board
- Zustand for client state

### Backend / API
- Next.js route handlers
- OpenAI API via Responses API

### Auth
- Firebase Authentication
- Google sign-in only

### Database
- Firestore

### Hosting
- Vercel

### Repo / dev workflow
- GitHub web only
- main branch only for now
- Codex used as coding partner

### Lean constraints
- no Firebase Storage
- no custom backend server
- no local terminal dependency in the main workflow

---

## 15. Why Firebase + Firestore

Chosen for V1 because it gives:
- Google sign-in
- simple persistence
- lightweight per-user quotas
- easy client SDKs
- minimal setup compared with pairing MongoDB to separate auth

### Data to persist
- user profile
- projects
- project metadata
- board JSON
- usage counters

---

## 16. Data model

### Collection: `users`
Document id: `uid`

Fields:
- `uid`
- `email`
- `name`
- `photoURL`
- `createdAt`
- `lastSeenAt`
- `plan` = `free`

### Collection: `projects`
Document id: generated id

Fields:
- `id`
- `ownerUid`
- `title`
- `description`
- `ideaPrompt`
- `audience`
- `status` (`draft`, `generated`)
- `board`
- `summary`
- `critique`
- `createdAt`
- `updatedAt`

### Collection: `usage`
Document id suggestion: `${uid}_${yyyyMMdd}`

Fields:
- `uid`
- `dateKey`
- `generateCount`
- `critiqueCount`
- `estimatedInputTokens`
- `estimatedOutputTokens`
- `updatedAt`

### Optional collection later: `templates`
Not needed in V1.

---

## 17. Firestore rules goals

V1 rules should ensure:
- users can only read their own user document
- users can only read/write their own projects
- usage docs are limited to the same user
- no public read/write

Server-side API calls should be responsible for generation and usage enforcement.

---

## 18. Auth flow

### Google-only auth flow
1. User clicks sign in with Google.
2. Firebase auth signs user in.
3. Frontend stores auth state.
4. On first sign in, app creates user document if missing.
5. Protected pages require auth.

### Protected routes
- dashboard
- project pages
- generate route
- critique route

---

## 19. Usage cap strategy

V1 should keep costs low by enforcing quotas.

### Free-plan cap example
- 5 generate calls per day
- 10 critique calls per day
- prompt size limit
- response size limit if needed

### Enforcement rules
- generation and critique happen only on server routes
- server verifies Firebase user identity
- server reads usage doc from Firestore
- server blocks requests that exceed quota
- server increments usage only after attempt starts or succeeds, depending on policy

### Why this matters
This is the minimum viable defense against API overuse.

---

## 20. Main screens in detail

### Landing page
Purpose:
- explain ADES clearly
- visually show what it creates
- invite user to sign in

Sections:
- headline
- short explanation
- visual mock board preview
- bullet value props
- sign in button

### Dashboard
Purpose:
- show projects
- create new project

Elements:
- new design button
- recent projects grid/list
- usage summary
- account dropdown/sign out

### Studio page
Purpose:
- create, view, edit, critique, export

Elements:
- top bar with title and actions
- center canvas
- left panel with block palette and project info
- right panel with selected node editor or critique/eval detail
- tabs for overview, evals, critique, export

### Print page
Purpose:
- printable clean version of board and summary

---

## 21. Suggested UI style

Desired feel:
- serious but visual
- friendly and modern
- not too enterprise-heavy
- closer to Miro than to Jira

### UI characteristics
- soft rounded cards
- generous spacing
- subtle board background
- colorful but restrained node types
- clean side panels
- easy drag-and-drop affordances
- clear export buttons

---

## 22. Canvas behavior

Required interactions:
- drag blocks
- zoom
- pan
- minimap
- select block
- multi-select later if easy
- edit block details
- add block from palette
- delete block
- connect block to block
- autosave changes

Nice-to-have later:
- grouping
- comments
- lock block
- color customization

---

## 23. AI response schema

The model should return a strict structured object like:

```json
{
  "title": "Customer Support Refund Agent",
  "summary": "An agent design for triaging and resolving refund requests with human escalation.",
  "nodes": [
    {
      "id": "goal-1",
      "type": "goal",
      "title": "Resolve refund requests consistently",
      "body": "Help users request or qualify for refunds with correct policy handling.",
      "position": { "x": 100, "y": 120 },
      "meta": { "lane": "Goal" }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "goal-1",
      "target": "task-1",
      "label": "starts"
    }
  ],
  "evals": [
    {
      "id": "eval-1",
      "name": "Policy accuracy",
      "description": "Checks whether refund recommendation matches policy.",
      "type": "quality",
      "metric": "pass_rate"
    }
  ],
  "critique": [
    {
      "id": "c1",
      "severity": "medium",
      "message": "Human escalation criteria are too vague."
    }
  ],
  "assumptions": [
    "Refund policy is accessible in structured form."
  ]
}
```

The exact implementation schema can evolve, but it must remain stable enough for export/import.

---

## 24. AI feature details

### Generate design
Input:
- idea prompt
- audience
- constraints
- optional domain

Output:
- full board JSON
- summary
- evals
- critique seed

### Critique design
Input:
- current board JSON
- summary

Output:
- critique items
- suggested missing reflections
- suggested missing evals
- suggested business metrics

### Future optional feature
- improve design automatically based on critique

---

## 25. Export-to-builder handoff strategy

ADES should produce Markdown that can be pasted into:
- Codex
- Claude
- GitHub issues
- PRDs
- internal docs

The Markdown should be practical, not fluffy.

It should allow a builder to understand:
- what the agent does
- how it should think/check itself
- how it should take feedback
- how success is measured

---

## 26. Step-by-step implementation sequence

### Phase 1 — Foundation
- set up repo
- connect to Vercel
- set up Firebase project
- enable Google auth
- create Firestore
- add environment variables
- scaffold Next.js app

### Phase 2 — Auth and shell
- create landing page
- create sign-in flow
- create dashboard shell
- protect authenticated routes

### Phase 3 — Canvas and local editing
- build board using mock data
- add editable nodes
- add inspector panel
- add autosave to Firestore

### Phase 4 — Project persistence
- create project CRUD
- save and load board data from Firestore
- show projects on dashboard

### Phase 5 — AI generation
- create `/api/generate`
- create generation prompt and schema
- render AI output on canvas
- store generated result in project

### Phase 6 — Critique
- create `/api/critique`
- render critique panel
- optionally allow converting critique suggestions into blocks

### Phase 7 — Export
- add Markdown export
- add JSON export/import
- add image export
- add print page for PDF

### Phase 8 — Usage control and polish
- enforce Firestore-based usage caps
- improve errors and loading states
- improve visual layout

---

## 27. Lean repo structure

```text
app/
  api/
    critique/route.ts
    generate/route.ts
  dashboard/page.tsx
  project/[id]/page.tsx
  project/[id]/print/page.tsx
  sign-in/page.tsx
  page.tsx
components/
  board/
  layout/
  panels/
  project/
  ui/
lib/
  ai/
  export/
  firebase/
  firestore/
  store/
  utils/
types/
docs/
```

---

## 28. Environment variables

Expected variables:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `OPENAI_API_KEY`

Optional later:
- `NEXT_PUBLIC_APP_URL`
- `ADES_SHARED_PASSWORD`

Note: even if Storage is not used, Firebase web config may still include a storage bucket field.

---

## 29. Risks and mitigations

### Risk: AI output becomes generic
Mitigation:
- force reflections, assumptions, critique, and evals into schema

### Risk: costs increase
Mitigation:
- auth required
- per-user usage caps
- short prompts
- one design per request

### Risk: project becomes too complex
Mitigation:
- keep V1 strictly about design, not execution

### Risk: board UX becomes clunky
Mitigation:
- build editing and movement early
- keep node types limited

### Risk: overbuilding exports
Mitigation:
- Markdown and JSON first
- PNG/PDF simple version after

---

## 30. Future roadmap (after V1)

- templates library
- alternative design suggestions
- collaborative boards
- version history
- share links
- comments
- automatic critique-to-improvement mode
- agent runtime handoff packages
- organization workspaces
- billing / plans

---

## 31. Definition of success for V1

ADES V1 is successful if a signed-in user can:

1. create a project
2. generate a design from an idea
3. see it on an editable board
4. run critique on it
5. edit the board manually
6. export Markdown and JSON
7. print/export a presentable version
8. have usage caps enforced

---

## 32. Project summary sentence

ADES is a visual AI-powered studio that helps PMs turn agent ideas into editable designs with task maps, reflection logic, feedback loops, and evals.
