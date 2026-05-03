import Image from "next/image";
import Link from "next/link";
import { AuthHeaderActions } from "@/components/auth/auth-header-actions";

const floatingSignals = [
  { label: "Reflection loop", className: "left-[5%] top-[20%] animate-float-slow 2xl:left-[10%]" },
  { label: "Eval coverage", className: "right-[6%] top-[18%] animate-float 2xl:right-[12%]" },
  { label: "Business metric", className: "left-[8%] bottom-[35%] animate-float-delayed 2xl:left-[12%] 2xl:bottom-[40%]" },
  { label: "Human handoff", className: "right-[8%] bottom-[36%] animate-float-slow 2xl:right-[12%] 2xl:bottom-[41%]" }
];

const capabilityCards = [
  {
    number: "01",
    title: "Blueprint",
    body: "A lightweight intake that captures audience, task, constraints, risk, and human escalation needs — the structured intent your AI needs."
  },
  {
    number: "02",
    title: "Generated boards",
    body: "ADES drafts a step-by-step flow with attached evals, reflections, safeguards, and assumptions. Every node stays editable."
  },
  {
    number: "03",
    title: "Readiness checks",
    body: "Built-in checks for workflow clarity, evaluation coverage, safety, and handoff quality so the design is build-ready, not just sketched."
  }
];

const workflowSteps = [
  {
    step: "STEP 01",
    title: "Describe the agent",
    body: "Capture the initiative, target user, problem, desired outcome, constraints, risks, and human escalation needs."
  },
  {
    step: "STEP 02",
    title: "Generate a board",
    body: "ADES turns the Blueprint into an editable workflow with steps, assumptions, evals, safeguards, and reflection points."
  },
  {
    step: "STEP 03",
    title: "Refine and hand off",
    body: "Review readiness, strengthen weak areas, and prepare a build-ready artifact for your team."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-5 py-6 md:px-8">
      <header className="sticky top-4 z-30 mb-6 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.65)] backdrop-blur md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image src="/logo-ades.svg" alt="ADES logo" width={150} height={44} className="h-9 w-auto" priority />
            <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 md:inline-flex">
              Agent Design Studio
            </span>
          </div>

          <nav aria-label="Primary" className="order-3 w-full sm:order-2 sm:w-auto">
            <ul className="flex flex-wrap items-center justify-start gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 sm:justify-center sm:gap-5">
              <li><a href="#product" className="hover:text-slate-900">Product</a></li>
              <li><a href="#how-it-works" className="hover:text-slate-900">How it works</a></li>
              <li><Link href="/dashboard" className="hover:text-slate-900">Dashboard</Link></li>
            </ul>
          </nav>

          <div className="order-2 flex items-center gap-2 sm:order-3">
            <AuthHeaderActions />
          </div>
        </div>
      </header>

      <section className="ades-panel relative min-h-[calc(100vh-9.5rem)] scroll-mt-28 overflow-hidden rounded-[2rem] border-slate-200/90 px-6 py-14 md:px-12 md:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(147,51,234,0.12),transparent_36%),radial-gradient(circle_at_55%_88%,rgba(59,130,246,0.08),transparent_34%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:90px_90px]" />

        {floatingSignals.map((chip) => (
          <div
            key={chip.label}
            className={`pointer-events-none absolute hidden rounded-full border border-indigo-200/70 bg-white/85 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm xl:block ${chip.className}`}
          >
            {chip.label}
          </div>
        ))}

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <p className="mx-auto inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
            Agent design for product teams
          </p>
          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
            Build agent designs with
            <span className="ml-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">
              structure, critique, and confidence
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
            ADES helps builders break an AI agent into clear tasks, reflection loops, human checkpoints
            and evals. Before engineering starts
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard" className="ades-primary-btn px-6 py-3">
              Design an agent
            </Link>
            <Link href="/demo" className="ades-ghost-btn px-6 py-3">
              Interactive demo
            </Link>
            <a
              href="mailto:ms.sorgente@gmail.com?subject=Request%20a%20demo%20-%20ADES&body=Hi%20Mario%2C%0A%0AI%20would%20like%20to%20request%20a%20demo%20of%20ADES.%0A%0ABest%2C"
              className="ades-ghost-btn px-6 py-3"
            >
              Request a demo
            </a>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-3">
            <InteractiveCard title="Break down the agent" description="Canvas-first visualizaition, mapping the goal into tasks and loops" />
            <InteractiveCard title="Improve the workflow" description="Add reflection loops, critique points and human feedback where quality can fail" />
            <InteractiveCard title="Define the evals" description="Create evaluations for success, safety and robustness" />
          </div>
        </div>
      </section>

      <section id="product" className="scroll-mt-28 px-1 py-14 md:py-20">
        <div className="grid gap-8 md:grid-cols-2 md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">// 01 — CAPABILITIES</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">A workspace for agent intent.</h2>
          </div>
          <p className="max-w-lg text-base leading-relaxed text-slate-600 md:justify-self-end md:text-xl">Three primitives, one canvas. Designed to make agent thinking visible long before deployment.</p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {capabilityCards.map((card) => (
            <article key={card.number} className="ades-panel rounded-2xl p-6">
              <p className="text-sm font-medium tracking-[0.3em] text-slate-500">{card.number}</p>
              <h3 className="mt-4 text-3xl font-medium tracking-tight text-slate-900">{card.title}</h3>
              <p className="mt-3 text-lg leading-relaxed text-slate-600">{card.body}</p>
            </article>
          ))}
        </div>

        <div className="ades-panel mt-8 overflow-hidden rounded-3xl border-slate-200/90 p-6 md:p-8">
          <div className="mb-5 flex flex-wrap gap-2">
            {['Flow', 'Evals', 'Safeguards'].map((pill) => <span key={pill} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{pill}</span>)}
          </div>
          <div className="relative grid gap-4 md:grid-cols-3">
            <MockNode title="Intake" subtitle="Task framing" />
            <MockNode title="Reason" subtitle="Assumptions + reflections" />
            <MockNode title="Act" subtitle="Execution path" />
            <AttachedNode className="md:col-start-1" label="Eval" />
            <AttachedNode className="md:col-start-2" label="Reflect" />
            <AttachedNode className="md:col-start-3" label="Safeguard" />
            <div aria-hidden className="pointer-events-none absolute left-[18%] top-[34%] hidden h-[1px] w-[62%] bg-slate-300 md:block" />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-28 px-1 py-14 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">// 02 — WORKFLOW</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 md:text-6xl">Intent → Blueprint → Board.</h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600 md:text-xl">Start with a rough agent idea. ADES structures the intent, generates the board, and helps you refine the design before engineering starts.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {workflowSteps.map((step, index) => (
            <article key={step.step} className="relative ades-panel rounded-2xl p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{step.step}</p>
              <h3 className="mt-4 text-3xl font-medium tracking-tight text-slate-900">{step.title}</h3>
              <p className="mt-3 text-lg leading-relaxed text-slate-600">{step.body}</p>
              {index < workflowSteps.length - 1 && <span aria-hidden className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-4xl text-slate-400 lg:block">→</span>}
            </article>
          ))}
        </div>
      </section>

      <section className="py-8">
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white shadow-[0_24px_50px_-30px_rgba(15,23,42,0.8)] md:flex md:items-center md:justify-between md:gap-8 md:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">READY WHEN YOU ARE</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Sketch your first agent in under five minutes.</h2>
          </div>
          <Link href="/dashboard" className="ades-primary-btn mt-6 inline-flex px-8 py-4 text-base md:mt-0">Start a project</Link>
        </div>
      </section>
    </main>
  );
}

function InteractiveCard({ title, description }: { title: string; description: string }) {
  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-left shadow-[0_10px_30px_-26px_rgba(15,23,42,0.8)] transition hover:-translate-y-1 hover:border-indigo-200 hover:bg-white">
      <h2 className="text-sm font-semibold text-slate-900 transition group-hover:text-indigo-700">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </article>
  );
}

function MockNode({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">Flow</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function AttachedNode({ label, className }: { label: string; className?: string }) {
  return <div className={`rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-medium text-slate-600 ${className ?? ""}`}>{label}</div>;
}
