"use client";

import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import { AdesGuideAvatar } from "@/components/demo/ades-guide-avatar";

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

type TourRect = { top: number; left: number; width: number; height: number; bottom: number; right: number };

function useTourTargetRect(targetRef: RefObject<HTMLElement | null>, isOpen: boolean, activeStep: number) {
  const [rect, setRect] = useState<TourRect | null>(null);

  const updateRect = useCallback(() => {
    const el = targetRef.current;
    if (!isOpen || !el) {
      setRect(null);
      return;
    }
    const next = el.getBoundingClientRect();
    if (next.width < 1 || next.height < 1) return;
    setRect({
      top: Math.max(next.top - 10, 6),
      left: Math.max(next.left - 10, 6),
      width: next.width + 20,
      height: next.height + 20,
      bottom: next.bottom + 10,
      right: next.right + 10,
    });
  }, [isOpen, targetRef]);

  useEffect(() => {
    if (!isOpen || !targetRef.current) return;
    let raf = window.requestAnimationFrame(updateRect);

    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(updateRect);
    });

    observer.observe(targetRef.current);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [activeStep, isOpen, targetRef, updateRect]);

  return rect;
}

export function GuidedTour({ steps, isOpen, activeStep, onNext, onBack, onSkip, onRestart }: GuidedTourProps) {
  const currentStep = steps[activeStep];
  const rect = useTourTargetRect(currentStep?.targetRef ?? { current: null }, isOpen, activeStep);

  useEffect(() => {
    if (!isOpen || !currentStep?.targetRef.current) return;
    const el = currentStep.targetRef.current;
    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    });
  }, [currentStep, isOpen]);

  const cardPosition = useMemo(() => {
    const viewportHeight = typeof window === "undefined" ? 900 : window.innerHeight;
    const viewportWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
    if (!rect) return { top: 120, left: 16 };
    const preferredTop = rect.bottom + 14;
    const fallbackTop = Math.max(rect.top - 190, 12);
    return {
      top: preferredTop + 190 < viewportHeight ? preferredTop : fallbackTop,
      left: Math.max(12, Math.min(rect.left, viewportWidth - 320)),
    };
  }, [rect]);

  if (!isOpen || !currentStep) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/28 backdrop-blur-[1px]" />
      {rect ? (
        <div
          className="absolute rounded-2xl border border-indigo-300/95 bg-white/5 shadow-[0_0_0_9999px_rgba(15,23,42,0.26)] transition-all"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      ) : null}

      <aside
        className="pointer-events-auto absolute w-[308px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
        style={{ top: cardPosition.top, left: cardPosition.left }}
      >
        <div className="flex items-center gap-2">
          <AdesGuideAvatar className="h-9 w-9" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">ADES Guide</p>
            <p className="text-xs text-slate-400">Step {activeStep + 1} / {steps.length}</p>
          </div>
        </div>

        <h3 className="mt-3 text-sm font-semibold text-slate-900">{currentStep.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{currentStep.description}</p>

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
            Replay
          </button>
        </div>
      </aside>
    </div>
  );
}
