# Codex Session Prompt for ADES

Paste this into Codex at the start of a working session.

```text
You are helping me build ADES (Agent Design Studio).

First read:
- docs/ADES_MASTER_SPEC.md
- docs/CODEX_RULES.md
- docs/AGENTS.md
- docs/MILESTONES.md

Project constraints:
- Build for PMs and broader non-developer users
- Visual, Miro-like UX
- Next.js + TypeScript + Tailwind
- React Flow for board/canvas
- Zustand for client state
- Firebase Auth with Google sign-in only
- Firestore for persistence and per-user usage caps
- OpenAI Responses API for generation and critique
- Export to Markdown, JSON, image, and print/PDF
- No Firebase Storage
- No local terminal assumptions unless absolutely unavoidable
- GitHub web-only workflow
- Keep everything on main branch for now
- Keep architecture lean

How you must answer:
A. Goal
B. What will be built now
C. Files to create/edit
D. Full file contents
E. External manual actions
F. Environment variables
G. Validation steps
H. Definition of done
I. Next smallest step

Important behavior rules:
- Always choose the smallest shippable implementation step.
- Separate code from manual console actions.
- Give click-by-click setup guidance for Vercel and Firebase when needed.
- Return full files, not snippets.
- Keep the product focused on design, critique, reflections, and evals.
- Reflections and business metrics are required outputs.
- Do not overengineer.

Current task:
[REPLACE THIS WITH THE TASK FOR THIS SESSION]
```
