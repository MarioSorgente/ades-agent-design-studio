import type { HTMLAttributes } from "react";

export type GuideAvatarMood = "idle" | "guiding" | "focused" | "observing" | "complete";

export function AdesGuideAvatar({ className, mood = "idle", ...props }: HTMLAttributes<HTMLDivElement> & { mood?: GuideAvatarMood }) {
  const ringClass =
    mood === "guiding"
      ? "border-indigo-300 shadow-indigo-200/70"
      : mood === "focused"
        ? "border-sky-300 shadow-sky-200/70"
        : mood === "complete"
          ? "border-emerald-300 shadow-emerald-200/70"
          : "border-slate-300 shadow-slate-200/60";

  const haloClass =
    mood === "guiding"
      ? "bg-indigo-100/80"
      : mood === "focused"
        ? "bg-sky-100/80"
        : mood === "complete"
          ? "bg-emerald-100/80"
          : "bg-slate-100/80";

  const profileFill = mood === "complete" ? "fill-emerald-700" : mood === "guiding" ? "fill-indigo-700" : "fill-slate-700";

  return (
    <div
      className={`relative overflow-hidden rounded-full border bg-gradient-to-br from-white to-slate-50 shadow-lg transition-all ${mood === "complete" ? "shadow-emerald-200/80" : ""} ${ringClass} ${className ?? ""}`}
      {...props}
    >
      <div className={`absolute inset-1 rounded-full blur-[2px] ${haloClass} ${mood === "guiding" || mood === "complete" ? "animate-pulse" : ""}`} />
      <div className={`absolute inset-0 ${mood === "guiding" || mood === "focused" || mood === "complete" ? "animate-[spin_8s_linear_infinite]" : ""}`}>
        <div className="absolute inset-[8%] rounded-full border border-white/80" />
      </div>

      <svg viewBox="0 0 88 88" aria-hidden="true" className={`relative z-10 h-full w-full ${mood === "observing" ? "animate-[float_4s_ease-in-out_infinite]" : "animate-[float_5s_ease-in-out_infinite]"}`}>
        <defs>
          <linearGradient id="ades-avatar-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>
        <circle cx="44" cy="44" r="42" fill="url(#ades-avatar-bg)" />
        <path className={profileFill} d="M52 16c9 2 16 10 16 20 0 8-4 14-5 21-1 8 1 15 7 20l-20-4-13 4c5-4 8-8 9-13 2-8-1-13-6-18-5-5-7-10-6-16 1-9 8-15 18-14z" />
        <path d="M46 27c-4 0-7 3-8 7-2 1-3 2-3 4 0 2 1 4 3 4 1 3 3 6 8 6 4 0 7-2 9-5" className="fill-none stroke-white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M35 48c3 3 6 4 9 4" className="fill-none stroke-white" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M56 32c2 0 4 1 5 2" className={`fill-none ${mood === "focused" ? "stroke-sky-300" : "stroke-white/70"}`} strokeWidth="2" strokeLinecap="round" />
      </svg>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-2px);
          }
        }
      `}</style>
    </div>
  );
}
