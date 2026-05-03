import Image from "next/image";
import Link from "next/link";
import { AuthHeaderActions } from "@/components/auth/auth-header-actions";
import { StartProjectCtaButton } from "@/components/landing/start-project-cta-button";

const floatingSignals = [
  { label: "Reflection loop", className: "left-[5%] top-[20%] animate-float-slow 2xl:left-[10%]" },
  { label: "Eval coverage", className: "right-[6%] top-[18%] animate-float 2xl:right-[12%]" },
  { label: "Business metric", className: "left-[8%] bottom-[35%] animate-float-delayed 2xl:left-[12%] 2xl:bottom-[40%]" },
  { label: "Human handoff", className: "right-[8%] bottom-[36%] animate-float-slow 2xl:right-[12%] 2xl:bottom-[41%]" }
];

const journeySteps = [
  {
    label: "STEP 01",
    title: "Describe the agent",
    body: "Capture the initiative, target user, problem, desired outcome, constraints, risks, and human escalation needs."
  },
  {
    label: "STEP 02",
    title: "Generate the board",
    body: "ADES turns the Blueprint into an editable agent workflow with steps, assumptions, evals, and safeguards."
  },
  {
    label: "STEP 03",
    title: "Refine and hand off",
    body: "Strengthen the design, review readiness, and prepare a build-ready artifact for your team."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-6 px-5 py-6 md:px-8">
      <header className="rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.65)] backdrop-blur md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image src="/logo-ades.svg" alt="ADES logo" width={150} height={44} className="h-9 w-auto" priority />
            <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 md:inline-flex">
              Agent Design Studio
            </span>
          </div>

          <div className="flex items-center gap-2">
            <AuthHeaderActions />
          </div>
        </div>
      </header>

      <section className="ades-panel relative overflow-hidden rounded-[2rem] border-slate-200/90 px-6 py-14 md:px-12 md:py-20">
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
            ADES helps builders break an AI agent into clear tasks, reflection loops, human checkpoints and evals before engineering starts.
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
        </div>
      </section>

      <section className="ades-panel rounded-[2rem] border-slate-200/90 px-6 py-10 md:px-10 md:py-12">
        <div className="flex flex-col gap-8">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Intent → Blueprint → Board.</h2>
            <p className="text-base text-slate-600 md:text-lg">
              Turn a rough agent idea into a structured design workspace with flows, evals, safeguards, and handoff-ready details.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            {journeySteps.map((step, index) => (
              <div key={step.label} className="relative">
                <article className="h-full rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.7)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{step.label}</p>
                  <h3 className="mt-3 text-2xl font-medium tracking-tight text-slate-900">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.body}</p>
                </article>
                {index < journeySteps.length - 1 && (
                  <span className="pointer-events-none absolute -right-4 top-1/2 hidden -translate-y-1/2 text-3xl text-slate-300 md:block">
                    →
                  </span>
                )}
              </div>
            ))}
          </div>

          <BoardConceptMockup />

          <div className="rounded-3xl border border-slate-800/80 bg-slate-900 px-5 py-6 text-white shadow-[0_25px_60px_-30px_rgba(15,23,42,0.9)] md:px-8 md:py-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-200">READY WHEN YOU ARE</p>
                <h3 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
                  Sketch your first agent in under five minutes.
                </h3>
              </div>
              <StartProjectCtaButton />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function BoardConceptMockup() {
  const flowNodes = ["Intake", "Reason", "Act"];
  const supportNodes = ["Eval", "Reflect", "Safeguard"];

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 md:p-6">
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {flowNodes.map((node, index) => (
            <div key={node} className="relative flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700">
              {node}
              {index < flowNodes.length - 1 && (
                <span className="pointer-events-none absolute -right-5 top-1/2 hidden -translate-y-1/2 text-xl text-slate-400 md:block">
                  →
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {supportNodes.map((node) => (
            <div key={node} className="rounded-xl border border-slate-300/90 bg-white px-4 py-3 text-center text-sm text-slate-600">
              {node}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {["Flow", "Evals", "Safeguards"].map((pill) => (
          <span key={pill} className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
            {pill}
          </span>
        ))}
      </div>
    </article>
  );
}
