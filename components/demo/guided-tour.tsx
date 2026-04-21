"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";

type TourStep = {
  id: string;
  targetRef: RefObject<HTMLElement | null>;
  title: string;
  description: string;
};

type GuidedTourProps = {
  steps: TourStep[];
  isOpen: boolean;
  activeStep: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onRestart: () => void;
};

export function GuidedTour({ steps, isOpen, activeStep, onNext, onBack, onSkip, onRestart }: GuidedTourProps) {
  const [pulse, setPulse] = useState(false);
  const currentStep = steps[activeStep];

  useEffect(() => {
    if (!isOpen || !currentStep) return;
    const timer = window.setTimeout(() => setPulse(true), 50);
    return () => {
      window.clearTimeout(timer);
      setPulse(false);
    };
  }, [currentStep, isOpen]);

  const rect = useMemo(() => {
    if (!isOpen || !currentStep?.targetRef.current) return null;
    const nodeRect = currentStep.targetRef.current.getBoundingClientRect();
    return {
      top: Math.max(nodeRect.top - 8, 8),
      left: Math.max(nodeRect.left - 8, 8),
      width: nodeRect.width + 16,
      height: nodeRect.height + 16,
      bottom: nodeRect.bottom + 8,
    };
  }, [currentStep, isOpen, pulse]);

  useEffect(() => {
    if (!isOpen || !currentStep?.targetRef.current) return;
    currentStep.targetRef.current.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }, [currentStep, isOpen]);

  if (!isOpen || !currentStep) return null;

  const viewportHeight = typeof window === "undefined" ? 900 : window.innerHeight;
  const viewportWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const cardTop = rect ? Math.min(rect.bottom + 16, viewportHeight - 210) : 120;
  const cardLeft = rect ? Math.min(rect.left, viewportWidth - 340) : 16;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/45" />
      {rect ? (
        <div
          className={`absolute rounded-2xl border-2 border-indigo-300 bg-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] transition ${pulse ? "animate-pulse" : ""}`}
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      ) : null}

      <aside
        className="pointer-events-auto absolute w-[320px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
        style={{ top: cardTop, left: cardLeft }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Guided demo</p>
        <h3 className="mt-1 text-sm font-semibold text-slate-900">{currentStep.title}</h3>
        <p className="mt-2 text-sm text-slate-600">{currentStep.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onBack} className="ades-ghost-btn px-3 py-2 text-xs" disabled={activeStep === 0}>
            Back
          </button>
          <button type="button" onClick={onNext} className="ades-primary-btn px-3 py-2 text-xs">
            {activeStep === steps.length - 1 ? "Finish" : "Next"}
          </button>
          <button type="button" onClick={onSkip} className="ades-ghost-btn px-3 py-2 text-xs">
            Skip
          </button>
          <button type="button" onClick={onRestart} className="ades-ghost-btn px-3 py-2 text-xs">
            Restart demo
          </button>
        </div>
      </aside>
    </div>
  );
}
