import type { SVGProps } from "react";

export type GuideAvatarMood = "idle" | "guiding" | "observing" | "complete";

export function AdesGuideAvatar({ className, mood = "idle", ...props }: SVGProps<SVGSVGElement> & { mood?: GuideAvatarMood }) {
  const auraClass = mood === "guiding" ? "animate-pulse fill-indigo-100" : mood === "complete" ? "fill-emerald-100" : "fill-slate-100";
  const strokeClass = mood === "complete" ? "stroke-emerald-600" : mood === "guiding" ? "stroke-indigo-700" : "stroke-slate-700";
  const accentClass = mood === "observing" ? "stroke-amber-600" : mood === "guiding" ? "stroke-indigo-500" : "stroke-slate-500";

  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className} {...props}>
      <rect x="2" y="2" width="60" height="60" rx="18" className={`${auraClass} stroke-slate-300`} strokeWidth="1.5" />
      <path d="M18 22c4-4 8-6 14-6 6 0 10 2 14 6" className={accentClass} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 18l3-3m13 3l-3-3" className="stroke-slate-400" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 44V33c0-7 4-13 8-13s8 6 8 13v11" className={strokeClass} strokeWidth="2" strokeLinecap="round" />
      <path d="M32 24v12" className={strokeClass} strokeWidth="2" strokeLinecap="round" />
      <path d="M30 35h4" className="stroke-slate-600" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 47h20" className="stroke-slate-300" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
