"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { GuidedTour } from "@/components/demo/guided-tour";
import { demoProject } from "@/lib/demo/sample-project";

const detailTitleByType = {
  step: "Flow step",
  eval: "Eval",
  safeguard: "Safeguard",
  readiness: "Readiness",
} as const;

type DemoDetail =
  | { type: "step"; id: string }
  | { type: "eval"; id: string }
  | { type: "safeguard"; id: string }
  | { type: "readiness" };

export function DemoProjectView() {
  const demoSectionRef = useRef<HTMLElement | null>(null);
  const flowRef = useRef<HTMLDivElement | null>(null);
  const firstStepRef = useRef<HTMLButtonElement | null>(null);
  const evalRef = useRef<HTMLDivElement | null>(null);
  const safeguardRef = useRef<HTMLDivElement | null>(null);
  const readinessRef = useRef<HTMLButtonElement | null>(null);

  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [selectedDetail, setSelectedDetail] = useState<DemoDetail>({ type: "step", id: demoProject.steps[0].id });

  const tourSteps = useMemo(
    () => [
      {
        id: "flow",
        targetRef: flowRef,
        title: "This is the agent flow",
        description: "Each step defines what the agent does before you build anything.",
      },
      {
        id: "step",
        targetRef: firstStepRef,
        title: "Inspect a step",
        description: "Click a step to inspect its purpose, inputs, and outputs.",
      },
      {
        id: "evals",
        targetRef: evalRef,
        title: "Define evals up front",
        description: "Evals help you define how success is measured before shipping.",
      },
      {
        id: "safeguards",
        targetRef: safeguardRef,
        title: "Add safeguards",
        description: "Safeguards reduce risk, like protecting sensitive data or forcing human review.",
      },
      {
        id: "readiness",
        targetRef: readinessRef,
        title: "Check readiness",
        description: "ADES brings these pieces together so you can see whether a design is actually ready.",
      },
    ],
    [],
  );

  const selectedItem = useMemo(() => {
    if (selectedDetail.type === "step") {
      return demoProject.steps.find((step) => step.id === selectedDetail.id) ?? demoProject.steps[0];
    }
    if (selectedDetail.type === "eval") {
      return demoProject.evals.find((evalItem) => evalItem.id === selectedDetail.id) ?? demoProject.evals[0];
    }
    if (selectedDetail.type === "safeguard") {
      return demoProject.safeguards.find((item) => item.id === selectedDetail.id) ?? demoProject.safeguards[0];
    }
    return demoProject.readiness;
  }, [selectedDetail]);

  function startTour() {
    setIsTourOpen(true);
    setTourStep(0);
    setTimeout(() => {
      demoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 10);
  }

  function skipTourAndExplore() {
    setIsTourOpen(false);
    demoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetDemo() {
    setIsTourOpen(false);
    setTourStep(0);
    setSelectedDetail({ type: "step", id: demoProject.steps[0].id });
  }

  function nextTourStep() {
    setTourStep((current) => {
      if (current >= tourSteps.length - 1) {
        setIsTourOpen(false);
        return current;
      }
      return current + 1;
    });
  }

  function backTourStep() {
    setTourStep((current) => Math.max(current - 1, 0));
  }

  function maybeAdvanceOnClick(targetStep: number) {
    if (isTourOpen && tourStep === targetStep) {
      nextTourStep();
    }
  }

  return (
    <div className="space-y-6">
      <section className="ades-panel flex flex-col gap-4">
        <p className="inline-flex w-fit rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
          Public interactive demo
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Try ADES in 60 seconds</h1>
        <p className="max-w-3xl text-sm text-slate-600 md:text-base">
          Explore a sample AI agent design with flow, evals, safeguards, and readiness — no sign in required.
        </p>

        <div className="flex flex-wrap gap-3">
          <button type="button" className="ades-primary-btn" onClick={startTour}>
            Start interactive demo
          </button>
          <button type="button" className="ades-ghost-btn" onClick={skipTourAndExplore}>
            Skip guide and explore
          </button>
          <button type="button" className="ades-ghost-btn" onClick={startTour}>
            Replay guided demo
          </button>
          <Link href="/sign-in?redirect=%2Fdashboard" className="ades-ghost-btn">
            Create your own project
          </Link>
        </div>
      </section>

      <section ref={demoSectionRef} className="ades-panel" aria-label="ADES interactive sample project">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">{demoProject.title}</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">{demoProject.description}</p>
          </div>
          <button type="button" className="ades-ghost-btn" onClick={resetDemo}>
            Reset demo
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div ref={flowRef} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 md:p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Agent flow</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {demoProject.steps.map((step, index) => (
                  <button
                    key={step.id}
                    ref={index === 0 ? firstStepRef : undefined}
                    type="button"
                    className={`rounded-xl border p-3 text-left transition ${
                      selectedDetail.type === "step" && selectedDetail.id === step.id
                        ? "border-indigo-400 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-indigo-200"
                    }`}
                    onClick={() => {
                      setSelectedDetail({ type: "step", id: step.id });
                      maybeAdvanceOnClick(1);
                    }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {index + 1}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{step.summary}</p>
                  </button>
                ))}
              </div>
            </div>

            <div ref={evalRef} className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Evals</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {demoProject.evals.map((evalItem) => (
                  <button
                    key={evalItem.id}
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-sm transition ${
                      selectedDetail.type === "eval" && selectedDetail.id === evalItem.id
                        ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-200"
                    }`}
                    onClick={() => {
                      setSelectedDetail({ type: "eval", id: evalItem.id });
                      maybeAdvanceOnClick(2);
                    }}
                  >
                    {evalItem.name}
                  </button>
                ))}
              </div>
            </div>

            <div ref={safeguardRef} className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Safeguards</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {demoProject.safeguards.map((safeguard) => (
                  <button
                    key={safeguard.id}
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-sm transition ${
                      selectedDetail.type === "safeguard" && selectedDetail.id === safeguard.id
                        ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-200"
                    }`}
                    onClick={() => {
                      setSelectedDetail({ type: "safeguard", id: safeguard.id });
                      maybeAdvanceOnClick(3);
                    }}
                  >
                    {safeguard.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              ref={readinessRef}
              type="button"
              className={`w-full rounded-2xl border p-4 text-left transition ${
                selectedDetail.type === "readiness" ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-200"
              }`}
              onClick={() => {
                setSelectedDetail({ type: "readiness" });
                maybeAdvanceOnClick(4);
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Design readiness</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-2xl font-semibold text-slate-900">{demoProject.readiness.overall}%</p>
                <p className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {demoProject.readiness.summary}
                </p>
              </div>
            </button>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inspector</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              {detailTitleByType[selectedDetail.type]}{"name" in selectedItem ? ` · ${selectedItem.name}` : "title" in selectedItem ? ` · ${selectedItem.title}` : ""}
            </h3>

            {selectedDetail.type === "step" && "inputs" in selectedItem ? (
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <p>{selectedItem.summary}</p>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inputs</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {selectedItem.inputs.map((input) => (
                      <li key={input}>{input}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outputs</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {selectedItem.outputs.map((output) => (
                      <li key={output}>{output}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {selectedDetail.type === "eval" && "target" in selectedItem ? (
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <p>{selectedItem.description}</p>
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-700">Success target: {selectedItem.target}</p>
              </div>
            ) : null}

            {selectedDetail.type === "safeguard" && "trigger" in selectedItem ? (
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <p>{selectedItem.description}</p>
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-700">Trigger: {selectedItem.trigger}</p>
              </div>
            ) : null}

            {selectedDetail.type === "readiness" && "breakdown" in selectedItem ? (
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <p className="text-sm text-slate-600">Readiness combines workflow clarity, eval coverage, and safeguards.</p>
                <div className="space-y-2">
                  {selectedItem.breakdown.map((lineItem) => (
                    <div key={lineItem.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span>{lineItem.label}</span>
                        <span>{lineItem.score}%</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{lineItem.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
              Demo mode is fully local static data (`isDemoMode`). No sign-in, DB writes, or AI generation calls are used on this page.
            </div>

            <Link href="/sign-in?redirect=%2Fdashboard" className="ades-primary-btn mt-4 inline-flex w-full justify-center">
              Create your own project
            </Link>
          </aside>
        </div>
      </section>

      <GuidedTour
        isOpen={isTourOpen}
        steps={tourSteps}
        activeStep={tourStep}
        onNext={nextTourStep}
        onBack={backTourStep}
        onSkip={() => setIsTourOpen(false)}
        onRestart={startTour}
      />
    </div>
  );
}
