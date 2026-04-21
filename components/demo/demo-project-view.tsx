"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdesGuideAvatar } from "@/components/demo/ades-guide-avatar";
import { GuidedTour } from "@/components/demo/guided-tour";
import { demoProject } from "@/lib/demo/sample-project";

const detailTitleByType = {
  step: "Step details",
  eval: "Eval details",
  safeguard: "Safeguard details",
  readiness: "Readiness details",
} as const;

type DemoDetail =
  | { type: "step"; id: string }
  | { type: "eval"; id: string }
  | { type: "safeguard"; id: string }
  | { type: "readiness" };

export function DemoProjectView() {
  const workspaceRef = useRef<HTMLElement | null>(null);
  const flowRef = useRef<HTMLDivElement | null>(null);
  const selectedStepRef = useRef<HTMLButtonElement | null>(null);
  const inspectorRef = useRef<HTMLDivElement | null>(null);
  const evalRef = useRef<HTMLDivElement | null>(null);
  const safeguardRef = useRef<HTMLDivElement | null>(null);
  const readinessRef = useRef<HTMLButtonElement | null>(null);

  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [isFreeExplore, setIsFreeExplore] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<DemoDetail>({ type: "step", id: demoProject.steps[0].id });

  const tourSteps = useMemo(
    () => [
      {
        id: "flow",
        targetRef: flowRef,
        title: "Inspect the flow",
        description: "This is the agent flow. It shows the sequence of decisions and actions before anything is built.",
      },
      {
        id: "details",
        targetRef: inspectorRef,
        title: "Open a step",
        description: "Click a step to inspect its purpose, logic, inputs, and outputs.",
      },
      {
        id: "evals",
        targetRef: evalRef,
        title: "Review evals",
        description: "Evals define how you'll know the agent is working well.",
      },
      {
        id: "safeguards",
        targetRef: safeguardRef,
        title: "Check safeguards",
        description: "Safeguards reduce risk before deployment, like PII protection or human review.",
      },
      {
        id: "readiness",
        targetRef: readinessRef,
        title: "Assess readiness",
        description: "ADES helps you judge whether the design is truly ready, not just impressive on paper.",
      },
    ],
    [],
  );

  const selectedItem = useMemo(() => {
    if (selectedDetail.type === "step") {
      return demoProject.steps.find((step) => step.id === selectedDetail.id) ?? demoProject.steps[0];
    }
    if (selectedDetail.type === "eval") {
      return demoProject.evals.find((item) => item.id === selectedDetail.id) ?? demoProject.evals[0];
    }
    if (selectedDetail.type === "safeguard") {
      return demoProject.safeguards.find((item) => item.id === selectedDetail.id) ?? demoProject.safeguards[0];
    }
    return demoProject.readiness;
  }, [selectedDetail]);

  function startTour() {
    setIsFreeExplore(false);
    setTourStep(0);
    setIsTourOpen(true);
    window.requestAnimationFrame(() => workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function handleExploreFreely() {
    setIsTourOpen(false);
    setIsFreeExplore(true);
    window.requestAnimationFrame(() => workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function resetDemoState() {
    setSelectedDetail({ type: "step", id: demoProject.steps[0].id });
    setTourStep(0);
    setIsTourOpen(false);
    setIsFreeExplore(false);
  }

  function onTourNext() {
    setTourStep((current) => {
      const next = Math.min(current + 1, tourSteps.length - 1);
      if (current === tourSteps.length - 1) setIsTourOpen(false);
      return next;
    });
  }

  useEffect(() => {
    if (!isTourOpen) return;

    if (tourStep === 1) {
      const focusStep = demoProject.steps[1];
      setSelectedDetail({ type: "step", id: focusStep.id });
      window.requestAnimationFrame(() => selectedStepRef.current?.focus({ preventScroll: true }));
      return;
    }

    if (tourStep === 2) {
      setSelectedDetail({ type: "eval", id: demoProject.evals[0].id });
      return;
    }

    if (tourStep === 3) {
      setSelectedDetail({ type: "safeguard", id: demoProject.safeguards[0].id });
      return;
    }

    if (tourStep === 4) {
      setSelectedDetail({ type: "readiness" });
    }
  }, [isTourOpen, tourStep]);

  function shouldPulse(stepIndex: number) {
    return isTourOpen && tourStep === stepIndex;
  }

  return (
    <div className="space-y-5">
      <section className="ades-panel flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <AdesGuideAvatar className="h-9 w-9" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">ADES walkthrough</p>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Try ADES in 60 seconds</h1>
          <p className="mt-1.5 text-sm text-slate-600 md:text-base">Design, inspect, and improve an AI agent before you build it.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="ades-primary-btn" onClick={startTour}>
            Start guided demo
          </button>
          <button type="button" className="ades-ghost-btn" onClick={handleExploreFreely}>
            Explore freely
          </button>
        </div>
      </section>

      <section ref={workspaceRef} className="ades-panel space-y-4" aria-label="ADES demo workspace">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 md:text-xl">{demoProject.title}</h2>
            <p className="text-sm text-slate-500">Interactive sample project</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="ades-ghost-btn" onClick={resetDemoState}>
              Reset demo
            </button>
            <button type="button" className="ades-ghost-btn" onClick={startTour}>
              Replay guided demo
            </button>
            <Link href="/sign-in?redirect=%2Fdashboard" className="ades-primary-btn">
              Create your own project
            </Link>
          </div>
        </div>

        {isFreeExplore ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
            Explore freely mode is on. Click Replay guided demo anytime.
          </p>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            <div
              ref={flowRef}
              className={`rounded-2xl border bg-slate-50 p-4 transition ${shouldPulse(0) ? "border-indigo-400 ring-2 ring-indigo-200" : "border-slate-200"}`}
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Flow canvas</p>
              <div className="relative grid gap-2 md:grid-cols-4">
                {demoProject.steps.map((step, index) => {
                  const isActive = selectedDetail.type === "step" && selectedDetail.id === step.id;
                  const isTourFocus = shouldPulse(1) && index === 1;
                  return (
                    <button
                      key={step.id}
                      ref={isActive ? selectedStepRef : undefined}
                      type="button"
                      className={`relative rounded-xl border p-3 text-left transition ${
                        isActive
                          ? "border-indigo-500 bg-white ring-2 ring-indigo-200 shadow-[0_10px_24px_-18px_rgba(79,70,229,0.9)]"
                          : "border-slate-200 bg-white hover:border-indigo-300"
                      } ${isTourFocus ? "animate-pulse" : ""}`}
                      onClick={() => setSelectedDetail({ type: "step", id: step.id })}
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{index + 1}</span>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{step.title}</p>
                    </button>
                  );
                })}
                <div className="pointer-events-none absolute inset-x-5 top-1/2 hidden -translate-y-1/2 border-t border-dashed border-slate-300 md:block" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div
                ref={evalRef}
                className={`rounded-2xl border bg-white p-3 transition ${shouldPulse(2) ? "border-indigo-400 ring-2 ring-indigo-200" : "border-slate-200"}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Evals</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {demoProject.evals.map((evalItem) => (
                    <button
                      key={evalItem.id}
                      type="button"
                      onClick={() => setSelectedDetail({ type: "eval", id: evalItem.id })}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        selectedDetail.type === "eval" && selectedDetail.id === evalItem.id
                          ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300"
                      }`}
                    >
                      {evalItem.name}
                    </button>
                  ))}
                </div>
              </div>

              <div
                ref={safeguardRef}
                className={`rounded-2xl border bg-white p-3 transition ${shouldPulse(3) ? "border-indigo-400 ring-2 ring-indigo-200" : "border-slate-200"}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Safeguards</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {demoProject.safeguards.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedDetail({ type: "safeguard", id: item.id })}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        selectedDetail.type === "safeguard" && selectedDetail.id === item.id
                          ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300"
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              ref={readinessRef}
              type="button"
              onClick={() => setSelectedDetail({ type: "readiness" })}
              className={`w-full rounded-2xl border bg-white p-4 text-left transition ${
                shouldPulse(4) || selectedDetail.type === "readiness"
                  ? "border-indigo-400 ring-2 ring-indigo-200"
                  : "border-slate-200 hover:border-indigo-300"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Readiness</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-2xl font-semibold text-slate-900">{demoProject.readiness.overall}%</p>
                <p className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {demoProject.readiness.summary}
                </p>
              </div>
              <p className="mt-2 text-xs text-slate-500">Complete: workflow and safeguards. Missing: broader edge-case eval set.</p>
            </button>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <AdesGuideAvatar className="h-8 w-8" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">ADES</p>
                  <p className="text-xs text-slate-500">Guardian of agent design</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">{isTourOpen ? tourSteps[tourStep].description : "Start guided demo for a 5-step product walkthrough."}</p>
            </div>

            <div
              ref={inspectorRef}
              className={`rounded-2xl border bg-white p-4 transition ${shouldPulse(1) ? "border-indigo-400 ring-2 ring-indigo-200" : "border-slate-200"}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Inspector</p>
              <h3 className="mt-2 text-base font-semibold text-slate-900">{detailTitleByType[selectedDetail.type]}</h3>

              {selectedDetail.type === "step" && "inputs" in selectedItem ? (
                <div className="mt-3 space-y-3 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">{selectedItem.title}</p>
                  <p className="text-slate-600">{selectedItem.summary}</p>
                  <div className="grid gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inputs</p>
                    <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                      {selectedItem.inputs.map((input) => (
                        <li key={input}>{input}</li>
                      ))}
                    </ul>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outputs</p>
                    <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                      {selectedItem.outputs.map((output) => (
                        <li key={output}>{output}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              {selectedDetail.type === "eval" && "target" in selectedItem ? (
                <div className="mt-3 space-y-2 text-sm">
                  <p className="font-medium text-slate-900">{selectedItem.name}</p>
                  <p className="text-slate-600">{selectedItem.description}</p>
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">Target: {selectedItem.target}</p>
                </div>
              ) : null}

              {selectedDetail.type === "safeguard" && "trigger" in selectedItem ? (
                <div className="mt-3 space-y-2 text-sm">
                  <p className="font-medium text-slate-900">{selectedItem.name}</p>
                  <p className="text-slate-600">{selectedItem.description}</p>
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">Trigger: {selectedItem.trigger}</p>
                </div>
              ) : null}

              {selectedDetail.type === "readiness" && "breakdown" in selectedItem ? (
                <div className="mt-3 space-y-2 text-sm">
                  {selectedItem.breakdown.map((item) => (
                    <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>{item.label}</span>
                        <span>{item.score}%</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <GuidedTour
        isOpen={isTourOpen}
        steps={tourSteps}
        activeStep={tourStep}
        onNext={onTourNext}
        onBack={() => setTourStep((current) => Math.max(current - 1, 0))}
        onSkip={() => {
          setIsTourOpen(false);
          setIsFreeExplore(true);
        }}
        onRestart={startTour}
      />
    </div>
  );
}
