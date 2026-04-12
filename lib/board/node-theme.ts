import type { AdesNodeType } from "@/lib/board/types";

export type NodeTheme = {
  label: string;
  dotClass: string;
  badgeClass: string;
  cardClass: string;
  ringClass: string;
};

export const NODE_THEMES: Record<AdesNodeType, NodeTheme> = {
  goal: {
    label: "Goal",
    dotClass: "bg-violet-500",
    badgeClass: "border-violet-200 bg-violet-50 text-violet-700",
    cardClass: "border-violet-200 bg-violet-50/85",
    ringClass: "ring-violet-300/70"
  },
  task: {
    label: "Task",
    dotClass: "bg-sky-500",
    badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
    cardClass: "border-sky-200 bg-sky-50/80",
    ringClass: "ring-sky-300/70"
  },
  reflection: {
    label: "Reflection",
    dotClass: "bg-amber-500",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    cardClass: "border-amber-200 bg-amber-50/80",
    ringClass: "ring-amber-300/70"
  },
  feedback: {
    label: "Feedback",
    dotClass: "bg-indigo-500",
    badgeClass: "border-indigo-200 bg-indigo-50 text-indigo-700",
    cardClass: "border-indigo-200 bg-indigo-50/80",
    ringClass: "ring-indigo-300/70"
  },
  risk: {
    label: "Risk",
    dotClass: "bg-rose-500",
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
    cardClass: "border-rose-200 bg-rose-50/80",
    ringClass: "ring-rose-300/70"
  },
  eval: {
    label: "Eval",
    dotClass: "bg-emerald-500",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    cardClass: "border-emerald-200 bg-emerald-50/80",
    ringClass: "ring-emerald-300/70"
  },
  business_metric: {
    label: "Business metric",
    dotClass: "bg-fuchsia-500",
    badgeClass: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    cardClass: "border-fuchsia-200 bg-fuchsia-50/80",
    ringClass: "ring-fuchsia-300/70"
  },
  assumption: {
    label: "Assumption",
    dotClass: "bg-slate-500",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
    cardClass: "border-slate-200 bg-slate-50/90",
    ringClass: "ring-slate-300/80"
  },
  handoff: {
    label: "Human handoff",
    dotClass: "bg-teal-500",
    badgeClass: "border-teal-200 bg-teal-50 text-teal-700",
    cardClass: "border-teal-200 bg-teal-50/80",
    ringClass: "ring-teal-300/70"
  }
};

export function getNodeTheme(type: AdesNodeType): NodeTheme {
  return NODE_THEMES[type];
}
