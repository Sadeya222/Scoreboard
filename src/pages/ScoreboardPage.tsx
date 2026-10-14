import { useCallback } from "react";
import { useClockTick, useScoreboard } from "../hooks/useScoreboard";
import { formatClock } from "../types";
import { cn } from "../utils/cn";

function periodLabel(p: string) {
  if (p === "OT") return "OVERTIME";
  if (p === "SO") return "SHOOTOUT";
  const suffix = p === "1" ? "ST" : p === "2" ? "ND" : "RD";
  return (
    <>
      {p}
      <span className="text-[0.5em] align-top">{suffix}</span> PERIOD
    </>
  );
}

function TeamPanel({
  name,
  score,
  side,
  accent,
}: {
  name: string;
  score: number;
  side: "home" | "away";
  accent: "red" | "blue";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border p-5 sm:p-8 md:p-10",
        "bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur",
        accent === "red" ? "border-red-500/30 shadow-[0_0_60px_-20px_rgba(239,68,68,0.5)]" : "border-sky-500/30 shadow-[0_0_60px_-20px_rgba(14,165,233,0.5)]",
      )}
    >
      <span
        className={cn(
          "mb-2 text-[11px] sm:text-xs font-bold uppercase tracking-[0.35em]",
          accent === "red" ? "text-red-400" : "text-sky-400",
        )}
      >
        {side}
      </span>
      <h2
        className="w-full truncate text-center text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-wide text-white"
        title={name}
      >
        {name}
      </h2>
      <div
        className={cn(
          "scoreboard-digits mt-4 sm:mt-6 leading-none tabular-nums",
          "text-[6rem] sm:text-[9rem] md:text-[12rem] lg:text-[15rem]",
          accent === "red" ? "text-red-400 drop-shadow-[0_0_30px_rgba(248,113,113,0.6)]" : "text-sky-400 drop-shadow-[0_0_30px_rgba(56,189,248,0.6)]",
        )}
        aria-label={`${name} score ${score}`}
      >
        {score}
      </div>
    </div>
  );
}

export default function ScoreboardPage() {
  const { state, status, mode, actions } = useScoreboard();
  const onExpire = useCallback(() => {
    // Any client can finalise the clock at zero; writes are idempotent.
    void actions.pauseClock();
  }, [actions]);
  const remaining = useClockTick(state, onExpire);
  const isLow = remaining <= 60_000 && remaining > 0;
  const isZero = remaining === 0;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#070b14] text-white">
      {/* background texture */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.12),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(239,68,68,0.10),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:48px_48px]" />

      {/* status pill */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/60">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            status === "live" ? "bg-emerald-400 animate-pulse" : status === "error" ? "bg-red-500" : "bg-amber-400",
          )}
        />
        {status === "live" ? (mode === "firebase" ? "Live" : "Local") : status}
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-3 py-10 sm:px-6 md:px-10">
        {/* header */}
        <header className="mb-6 flex items-center justify-center gap-3 sm:mb-8">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-white/70" fill="currentColor" aria-hidden>
            <ellipse cx="12" cy="13" rx="9" ry="4" />
            <path d="M3 10c0 2.2 4 4 9 4s9-1.8 9-4v-1c0-2.2-4-4-9-4S3 6.8 3 9z" opacity=".55" />
          </svg>
          <h1 className="text-sm font-bold uppercase tracking-[0.5em] text-white/70 sm:text-base">
            Ice Hockey Scoreboard
          </h1>
        </header>

        {/* main grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:gap-6">
          <TeamPanel name={state.homeName} score={state.homeScore} side="home" accent="red" />

          {/* center: clock + period */}
          <div className="order-first flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-black/40 px-6 py-6 md:order-none md:min-w-[18rem] md:px-8 lg:min-w-[22rem]">
            <span className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/50 sm:text-xs">
              {state.clockRunning ? "Game Clock" : "Clock Stopped"}
            </span>
            <div
              className={cn(
                "scoreboard-digits leading-none tabular-nums transition-colors",
                "text-[4.5rem] sm:text-[6rem] md:text-[5.5rem] lg:text-[7rem]",
                isZero ? "text-red-500" : isLow ? "text-amber-300" : "text-amber-400",
                "drop-shadow-[0_0_30px_rgba(251,191,36,0.55)]",
                state.clockRunning && "animate-[none]",
              )}
              aria-live="polite"
              aria-label={`Clock ${formatClock(remaining)}`}
            >
              {formatClock(remaining)}
            </div>

            <div className="mt-2 h-px w-full bg-white/10" />

            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/50 sm:text-xs">
                Period
              </span>
              <div className="text-2xl font-black uppercase tracking-widest text-white sm:text-3xl">
                {periodLabel(state.period)}
              </div>
              <div className="mt-2 flex gap-1.5" aria-hidden>
                {["1", "2", "3", "OT", "SO"].map((p) => (
                  <span
                    key={p}
                    className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-bold tracking-widest",
                      p === state.period ? "bg-amber-400 text-black" : "bg-white/10 text-white/40",
                    )}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <TeamPanel name={state.awayName} score={state.awayScore} side="away" accent="blue" />
        </div>
      </main>
    </div>
  );
}
