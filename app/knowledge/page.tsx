"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";

const sections = [
  {
    title: "What is an AI agent?",
    body: "An AI agent is a goal-directed system that can reason about a task, plan steps, use tools, observe results, and iterate until it reaches a useful outcome. In practice, this usually runs as a loop: decide, act, check, then continue or stop.",
  },
  {
    title: "What are agent evals?",
    body: "Agent evals measure end-to-end behavior across multiple steps, not just one prompt/response. Strong evals track task success, reasoning quality, tool-use accuracy, safety/compliance, robustness, and output quality.",
  },
  {
    title: "How reflection loops work",
    body: "Reflection loops add deliberate self-critique before final output. The agent checks confidence, inspects possible mistakes, revises when needed, and then finalizes. Reflection is especially useful when instructions are ambiguous, stakes are high, or tool outputs conflict.",
  },
  {
    title: "External feedback and human handoff",
    body: "For sensitive or uncertain situations, the agent should ask for human review, approval, or escalation. Human handoff is important when legal, financial, medical, policy, or reputational risk is high, or when user intent is unclear.",
  },
  {
    title: "Best practices for designing agents",
    bullets: [
      "Start with one clear goal and explicit success criteria.",
      "Break work into small steps with explicit inputs and outputs.",
      "Use tools only when they improve reliability or speed.",
      "Attach evals to critical steps and monitor failure modes.",
      "Use reflection for uncertainty and difficult reasoning.",
      "Add human handoff for high-stakes or low-confidence cases.",
    ],
  },
] as const;

const readinessSections = [
  {
    title: "Design Readiness",
    body: "Design-time readiness metrics help you decide if a workflow is ready to build and test. They are pre-implementation checks, not runtime agent performance metrics.",
  },
  {
    title: "What these checks measure",
    body: "ADES scores workflow specificity, eval quality, and safeguards placement. Internally, it also checks decomposition quality and tool logic to keep plans implementation-ready.",
  },
  {
    title: "What runtime evals should measure later",
    body: "After implementation, evaluate final response quality, step trajectory, tool-call accuracy, safety behavior, and end-to-end task success on realistic scenarios.",
  },
  {
    title: "Why trace-level grading matters",
    body: "Workflow or trace grading helps teams pinpoint where agent behavior failed (planning, tool call, or decision path), not just whether the final answer looked good.",
  },
  {
    title: "Practical loop",
    body: "Define expected behavior → run representative test cases → review failures by trace and step → update prompts/workflow/tools/evals → retest.",
  },
] as const;

const sources = [
  {
    label: "OpenAI — Agent evals guide",
    href: "https://platform.openai.com/docs/guides/agents",
  },
  {
    label: "OpenAI — Trace grading guide",
    href: "https://platform.openai.com/docs/guides/agents#trace-grading",
  },
  {
    label: "OpenAI — Working with evals guide",
    href: "https://platform.openai.com/docs/guides/evals",
  },
  {
    label: "LangSmith — Evaluate an agent",
    href: "https://docs.smith.langchain.com/evaluation/how_to_guides/evaluate_chatbot",
  },
  {
    label: "LangChain / LangSmith — Complex agent evaluation concepts",
    href: "https://docs.langchain.com/langsmith/evaluation-concepts",
  },
] as const;

export default function KnowledgePage() {
  return (
    <ProtectedRoute>
      <main className="mx-auto min-h-screen w-full max-w-5xl p-4 md:p-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white/90 p-5 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.65)] backdrop-blur md:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(99,102,241,0.16),transparent_42%),radial-gradient(circle_at_85%_16%,rgba(147,51,234,0.12),transparent_36%)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Knowledge</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Agent design essentials</h1>
              <p className="mt-2 text-sm text-slate-600">A practical reference for PMs and founders building reliable AI agents.</p>
            </div>
            <Link href="/dashboard" className="ades-ghost-btn px-4 py-2 text-sm">
              ← Back
            </Link>
          </div>
        </section>

        <section className="mt-4 grid gap-4">
          {sections.map((section) => (
            <article key={section.title} className="ades-panel">
              <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
              {"body" in section ? <p className="mt-3 text-sm leading-relaxed text-slate-600">{section.body}</p> : null}
              {"bullets" in section ? (
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-[0_18px_40px_-45px_rgba(15,23,42,0.75)]">
          <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Design-time readiness metrics</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            ADES readiness metrics are planning checks used before implementation. They answer: “Is this design ready to test?” They do not measure production agent quality.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {readinessSections.map((section) => (
              <article key={section.title} className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3">
                <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{section.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-indigo-100/90 bg-indigo-50/50 p-3">
            <h3 className="text-sm font-semibold text-slate-900">PM example</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              If an agent misses edge cases, a final-output score alone cannot show whether the issue came from planning, a tool call, or a bad handoff. Trace-level evals make the fix path obvious.
            </p>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Trusted sources</h2>
          <ul className="mt-3 space-y-2">
            {sources.map((source) => (
              <li key={source.href}>
                <a href={source.href} target="_blank" rel="noreferrer" className="text-sm text-indigo-700 underline underline-offset-2 hover:text-indigo-500">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </ProtectedRoute>
  );
}
