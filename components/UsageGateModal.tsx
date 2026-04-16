"use client";

import { FormEvent, useState } from "react";
import { submitPaymentInterest } from "@/lib/firebase/firestore";

export type UsageGateTrigger =
  | "second_project"
  | "generate_design"
  | "regenerate"
  | "ai_review"
  | "improve_design"
  | "add_eval"
  | "add_reflection"
  | "add_safeguard"
  | "ai_addition";

type Intent = "yes" | "maybe" | "no";
type PriceAnchor = "coffee" | "cinema" | "shoes" | "dinner" | "custom" | null;

type UsageGateModalProps = {
  isOpen: boolean;
  trigger: UsageGateTrigger;
  hasExistingProject: boolean;
  onClose: () => void;
  onOpenExisting?: () => void;
};

function getCopy(trigger: UsageGateTrigger) {
  if (trigger === "regenerate") {
    return {
      title: "Regeneration is limited in the free beta",
      body: "Regenerating designs uses additional AI credits. For now, free users can create and explore one full agent design.",
      cta: "Share feedback",
    };
  }
  if (trigger === "ai_review") {
    return {
      title: "AI Review is limited in the free beta",
      body: "AI Review uses additional AI credits for deeper analysis, risks, evals, and improvement suggestions. For now, you can keep exploring and manually editing your current design.",
      cta: "Share feedback",
    };
  }
  if (trigger === "improve_design") {
    return {
      title: "Improvements are limited in the free beta",
      body: "AI-powered improvements use additional AI credits. For now, you can keep manually editing your current design.",
      cta: "Share feedback",
    };
  }
  if (trigger === "add_eval" || trigger === "add_reflection" || trigger === "add_safeguard" || trigger === "ai_addition") {
    return {
      title: "AI additions are limited in the free beta",
      body: "Adding AI-generated evals, reflections, or safeguards uses additional AI credits. For now, you can manually edit your current design.",
      cta: "Share feedback",
    };
  }
  return {
    title: "Want to design more agents?",
    body: "You’ve reached the free beta limit.\n\nTo keep ADES sustainable, we may offer more agent designs for a small fee.\n\nWould that be useful for you?",
    cta: "Send feedback",
  };
}

export function UsageGateModal({ isOpen, trigger, hasExistingProject, onClose, onOpenExisting }: UsageGateModalProps) {
  const [intent, setIntent] = useState<Intent>("yes");
  const [priceAnchor, setPriceAnchor] = useState<PriceAnchor>("coffee");
  const [customAmount, setCustomAmount] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const copy = getCopy(trigger);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await submitPaymentInterest({ trigger, intent, priceAnchor, customAmount: priceAnchor === "custom" ? customAmount : null, feedback });
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h2 className="text-xl font-semibold text-slate-900">{copy.title}</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{submitted ? "Thanks — this really helps shape ADES." : copy.body}</p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Intent</p>
              <select className="ades-input mt-1 text-sm" value={intent} onChange={(event) => setIntent(event.target.value as Intent)}>
                <option value="yes">Yes, I’d like more designs</option>
                <option value="maybe">Maybe, depending on the price</option>
                <option value="no">Not right now</option>
              </select>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What would feel reasonable?</p>
              <select className="ades-input mt-1 text-sm" value={priceAnchor ?? ""} onChange={(event) => setPriceAnchor((event.target.value || null) as PriceAnchor)}>
                <option value="coffee">☕ Coffee — around €5</option>
                <option value="cinema">🎬 Cinema ticket — €10–15</option>
                <option value="shoes">👟 Pair of shoes — €50–80</option>
                <option value="dinner">🍽️ Dinner for two — €80–150</option>
                <option value="custom">✍️ Other amount</option>
              </select>
              {priceAnchor === "custom" ? <input className="ades-input mt-2 text-sm" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} placeholder="Custom amount" /> : null}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What would make ADES worth paying for?</p>
              <textarea className="ades-input mt-1 min-h-24 text-sm" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Tell us what would make this useful enough for you." />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {hasExistingProject && onOpenExisting ? (
                <button type="button" onClick={onOpenExisting} className="ades-ghost-btn px-3 py-2 text-xs">
                  Open my existing design
                </button>
              ) : null}
              <button type="button" onClick={onClose} className="ades-ghost-btn px-3 py-2 text-xs">
                Close
              </button>
              <button type="submit" disabled={isSubmitting} className="ades-primary-btn px-3 py-2 text-xs disabled:opacity-60">
                {isSubmitting ? "Sending…" : copy.cta}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={onClose} className="ades-primary-btn px-3 py-2 text-xs">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
