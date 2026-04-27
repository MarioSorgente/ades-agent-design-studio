# ADES — Discovery Phase PRD Draft

Prepared from the ADES strategy workshop to fill the Discovery sections of the course PRD.

## 1. Executive summary

**Product name:** ADES — Agent Design Studio  
**Positioning line:** A structured design environment for agents and agentic AI workflows.  
**One-sentence product thesis:** ADES helps product teams turn vague agent ideas into build-ready, critique-ready, evaluable design artifacts before engineering starts.

## 2. PRD-ready Discovery answers

### 2.1 Business Value Map

**Industry:** AI Product Management Enablement  
**Customer base:** B2B  
**Growth stage:** Startup / early-stage product  
**Primary revenue model (working assumption):** Software subscription / SaaS for product teams. This can remain provisional if monetization is not finalized for the course.  
**Primary company differentiators:** Critique + eval/governance depth, paired with a visual AI design workflow.

**Suggested market framing:** ADES is primarily positioned around agent design, while remaining extensible to adjacent AI-feature workflows when relevant.

### 2.2 User Value Map

**Target persona:** PM in a product team or AI product lead in a startup, with the sharpest wedge in teams designing agents.  
**Adjacent users:** AI builders, founders, and technical generalists shaping agent workflows.

**Core pain / deepest pain:** The PM is accountable for an AI initiative and needs a structured way to turn it into a buildable, evaluable, governable design.

**Core expensive mistake ADES prevents:** Vague AI requirements combined with weak evaluation design.

**Current-state journey:**
1. Identify an AI opportunity or receive an AI initiative from the business.
2. Open docs, whiteboards, and/or a general-purpose LLM.
3. Sketch a vague workflow, often without a clear starting structure.
4. Discuss the concept with teammates or work through it alone.
5. Define evals and safeguards, often inconsistently, too late in the process, or without enough depth.
6. Revise manually across fragmented tools.
7. Hand off an artifact that may still be incomplete, weakly evaluable, or hard to build from.

**Key pain points:**
- Vague requirements at the moment the team needs design clarity.
- Poor or inconsistent workflow decomposition.
- Uncertainty about where reflection / reasoning is needed.
- Weak eval design.
- Weak safeguard / failure-mode design.
- Fragmented artifacts across whiteboards, docs, and LLM chats.
- Handoff artifacts that are not strong enough for build planning.

### 2.3 AI Opportunity Statement

**AI opportunity statement:** ADES operates in AI Product Management Enablement and creates value by helping teams define stronger agents before engineering starts. Its primary users are PMs and AI product leads who are accountable for shaping an AI initiative into something buildable. The problem is not that they are incapable; it is that AI product design is still an emerging discipline, and teams need a structured way to turn an idea into a buildable, evaluable, and governable design.

**AI-solvable pain points:**
- Design-gap critique.
- Eval and safeguard generation.
- Reflection-point suggestions.
- First-pass workflow structuring.
- Board-to-spec transformation.

**Top 2 AI opportunities:**
1. Design-gap critique.
2. Eval and safeguard generation.

**Important strategic note:** Decomposition alone is easier to imitate with ChatGPT. Critique plus eval/governance is where ADES becomes more serious and differentiated.

### 2.4 Product Hypothesis and Target Workflow

**Product hypothesis:** We believe that product leads responsible for defining AI initiatives — especially teams designing agents — will use ADES to turn vague AI ideas into build-ready design artifacts, because it helps them structure workflows, surface reflection points, define evals and safeguards, and assess design readiness, unlike whiteboards and general-purpose LLM chats that produce fragmented and weakly evaluable outputs.

**Future workflow with ADES:**
1. Define the initiative, context, and target user.
2. Generate a first-pass design artifact: a structured visual workflow with key tasks, proposed reflection points, draft evals, draft safeguards, and an initial handoff-ready design skeleton.
3. Critique design gaps.
4. Generate and enrich evals, safeguards, and reflection points.
5. Review design readiness.
6. Edit manually.
7. Hand off for build planning.

### 2.5 What Good Output Means

A strong ADES output includes:
- A clear workflow / task sequence visualized on the canvas.
- Explicit reflection / reasoning points.
- Eval coverage.
- Safeguard / failure-mode coverage.
- Handoff clarity.
- Design readiness explanation.
- Full editability of each element.

**Readiness framing:** Readiness is not a score. It is a synthesis of design quality dimensions that helps the user judge whether the design is strong enough to move into build planning.

**Readiness dimensions:**
- Workflow clarity
- Decomposition quality
- Reflection logic
- Eval coverage
- Safeguard coverage
- Handoff readiness

**Most important differentiators:**
1. Critique + eval/governance depth
2. Visual AI design workflow

**Smallest lovable scope for the course:** A structured AI product design tool that helps PMs move from vague AI ideas to an editable, critique-ready, evaluable design artifact.

## 3. Phase 2 summary (for prototype alignment)

**What ADES already covers well:**
- Strong external wedge around agent design.
- A visual board as the main working surface.
- Existing intake pattern on the dashboard (idea prompt, audience, constraints).
- Critique / eval / safeguard logic already exists in the product concept.
- The board concept already supports workflow, reflection, evals, risks, assumptions, handoff, feedback loops, and business metrics.
- Export / handoff direction already supports the build-ready artifact narrative.

**What is missing versus the locked product direction:**
- The product thesis is still less sharp than the product surface: ADES can still read as a board generator instead of a structured design environment for buildable, evaluable, governable agent design.
- The intake layer is too light to fully express design intent before board generation.
- Readiness is too score-shaped in the prototype, while the product direction defines readiness as a synthesis / review layer.
- Critique, evals, and safeguards need to map more explicitly to readiness dimensions.
- The build-ready design spec / handoff artifact should become more central, not just a downstream export.

**What should be built next:**
1. Blueprint as a structured design brief.
2. Readiness redesign: move from score-first to checklist-first.
3. Critique-to-readiness mapping.
4. Stronger build-ready handoff.

**Blueprint = design intent**
- Initiative
- Target user
- Context / problem
- Desired outcome — explicitly explained in the UI as “What successful change should happen if this agent works well?”
- Constraints
- Human involvement / escalation expectation
- Optional risk level only if it meaningfully changes generation or review

**Board = design structure**
- Workflow steps
- Reflection points
- Evals
- Safeguards / risks
- Assumptions
- Handoff logic
- Feedback loops
- Business metrics

**Chosen next action:** Prototype alignment first. Before continuing the PRD Design phase, produce a Codex-ready product fix brief so the prototype matches the locked Discovery and Phase 2 decisions.

## 4. Notes for Codex / implementation context

- Keep the main wedge around agents.
- Use “agentic” as a secondary descriptor, not the primary category.
- Do not broaden the main positioning to all AI features.
- Blueprint should evolve from the existing intake/composer layer, not appear as a disconnected new product surface.
- Readiness should be checklist-first in the UI, backed by explicit design-quality dimensions.
- Desired outcome must be explained explicitly in the UI.
