// Shared blueprint-field UI primitives.
//
// `TooltipInfo`, `BlueprintLabel`, and `blueprintFieldTips` were previously
// duplicated verbatim in app/dashboard/page.tsx and app/project/[id]/page.tsx.
// The markup here is copied byte-for-byte from those copies so render output
// (DOM, classNames, aria-label, title) is identical.

export const blueprintFieldTips = {
  initiative: "What agent are you designing?",
  title: "A short internal name for this project.",
  targetUser: "Who is this agent for, or who will interact with it?",
  contextProblem: "What current pain, inefficiency, or need justifies this agent?",
  desiredOutcome: "What successful change should happen if this agent works well?",
  constraints: "What limits should shape the design? For example policy, latency, budget, tools, channels, or languages.",
  humanInvolvement: "When should a human review, approve, or take over?",
  riskLevel: "How risky would failure be in this workflow? Use this only if it meaningfully affects safeguards, evals, or human oversight.",
} as const;

export function BlueprintLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
      <span>{label}</span>
      <TooltipInfo text={tooltip} />
    </p>
  );
}

export function TooltipInfo({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        aria-label={text}
        title={text}
      >
        i
      </button>
      <span className="pointer-events-none absolute bottom-[calc(100%+7px)] left-1/2 z-30 w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-slate-900 px-2 py-1.5 text-[11px] font-medium normal-case tracking-normal text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100">
        {text}
      </span>
    </span>
  );
}
