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
    body: "Design Readiness is the main score used on the dashboard. It estimates whether your agent design is ready to test using: 40% Workflow Clarity + 40% Eval Readiness + 20% Safeguards.",
  },
  {
    title: "Workflow Clarity",
    body: "Strong designs need explicit steps. A step is clear only when it has a purpose, input, output, and a success condition or completion criteria.",
  },
  {
    title: "Eval Readiness",
    body: "Eval plans should test the full workflow plus key details: end-to-end success, important steps, tool use, safety/compliance, robustness, and output quality.",
  },
  {
    title: "Safeguards",
    body: "Risky or uncertain steps should include reflection, human feedback, confidence checks, or escalation paths. These guardrails lower design risk before implementation.",
  },
  {
    title: "Weakest Area",
    body: "The dashboard highlights one most important gap to fix next so teams can improve quickly before running real evaluations.",
  },
] as const;

const sources = [
  {
    label: "OpenAI — A practical guide to building agents",
    href: "https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf",
  },
  {
    label: "ReAct paper (Yao et al., 2022)",
    href: "https://arxiv.org/abs/2210.03629",
  },
  {
    label: "Reflexion paper (Shinn et al., 2023)",
    href: "https://arxiv.org/abs/2303.11366",
  },
  {
    label: "NIST AI Risk Management Framework",
    href: "https://www.nist.gov/itl/ai-risk-management-framework",
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
          <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Design-time metrics for agent readiness</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            These are design-time planning metrics, not production performance metrics. They help teams decide whether an agent design is ready to test. Real runtime evals and
            production metrics come later after implementation or simulation.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {readinessSections.map((section) => (
              <article key={section.title} className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3">
                <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{section.body}</p>
              </article>
            ))}
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
