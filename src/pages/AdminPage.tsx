import { useCallback, useEffect, useState } from "react";
import { useClockTick, useScoreboard } from "../hooks/useScoreboard";
import { formatClock, PERIODS, type Period } from "../types";
import { cn } from "../utils/cn";

/* ------------------------------------------------------------------ */
/* Small UI primitives                                                 */
/* ------------------------------------------------------------------ */

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5", className)}>
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-white/50">{title}</h2>
      {children}
    </section>
  );
}

function BigButton({
  children,
  onClick,
  variant = "neutral",
  className,
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "neutral" | "primary" | "danger" | "success" | "warn";
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const styles = {
    neutral: "bg-white/10 hover:bg-white/15 active:bg-white/20 text-white border-white/10",
    primary: "bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-black border-sky-300/40",
    danger: "bg-red-500 hover:bg-red-400 active:bg-red-600 text-white border-red-300/40",
    success: "bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black border-emerald-300/40",
    warn: "bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-black border-amber-200/40",
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "select-none rounded-xl border font-bold transition-all touch-manipulation",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
        "disabled:cursor-not-allowed disabled:opacity-40",
        styles,
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Team control                                                        */
/* ------------------------------------------------------------------ */

function TeamControl({
  side,
  name,
  score,
  accent,
  onAdjust,
  onRename,
}: {
  side: "home" | "away";
  name: string;
  score: number;
  accent: "red" | "blue";
  onAdjust: (delta: number) => void;
  onRename: (name: string) => void;
}) {
  const [draft, setDraft] = useState(name);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  const save = () => {
    onRename(draft);
    setEditing(false);
  };

  return (
    <Card title={`${side} team`}>
      <div className="mb-4 flex items-center gap-2">
        <input
          value={draft}
          maxLength={24}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setEditing(true)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setDraft(name);
              setEditing(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          aria-label={`${side} team name`}
          className={cn(
            "w-full rounded-lg border bg-black/40 px-3 py-2.5 text-base font-bold uppercase tracking-wide text-white",
            "placeholder:text-white/30 focus:outline-none focus:ring-2",
            accent === "red" ? "border-red-500/30 focus:ring-red-400/60" : "border-sky-500/30 focus:ring-sky-400/60",
          )}
          placeholder={side.toUpperCase()}
        />
      </div>

      <div className="flex items-stretch gap-2 sm:gap-3">
        <BigButton
          variant="danger"
          ariaLabel={`Decrease ${side} score`}
          onClick={() => onAdjust(-1)}
          disabled={score <= 0}
          className="flex-1 text-3xl py-4 sm:py-6"
        >
          −
        </BigButton>
        <div
          className={cn(
            "scoreboard-digits flex min-w-[5.5rem] items-center justify-center rounded-xl border bg-black/50 text-5xl sm:min-w-[7rem] sm:text-6xl tabular-nums",
            accent === "red" ? "border-red-500/30 text-red-400" : "border-sky-500/30 text-sky-400",
          )}
          aria-live="polite"
        >
          {score}
        </div>
        <BigButton
          variant="success"
          ariaLabel={`Increase ${side} score`}
          onClick={() => onAdjust(1)}
          className="flex-1 text-3xl py-4 sm:py-6"
        >
          +
        </BigButton>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Admin page                                                          */
/* ------------------------------------------------------------------ */

export default function AdminPage() {
  const { state, status, error, mode, actions } = useScoreboard();
  const onExpire = useCallback(() => void actions.pauseClock(), [actions]);
  const remaining = useClockTick(state, onExpire);
  const [confirmReset, setConfirmReset] = useState(false);
  const [clockDraft, setClockDraft] = useState("");

  // Keyboard shortcuts for quick operation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          void actions.toggleClock();
          break;
        case "q":
          void actions.adjustScore("home", 1);
          break;
        case "a":
          void actions.adjustScore("home", -1);
          break;
        case "p":
          void actions.adjustScore("away", 1);
          break;
        case "l":
          void actions.adjustScore("away", -1);
          break;
        case "ArrowRight":
          void actions.nextPeriod();
          break;
        case "ArrowLeft":
          void actions.prevPeriod();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [actions]);

  const applyClockDraft = () => {
    const m = clockDraft.trim().match(/^(\d{1,2})(?::([0-5]?\d))?$/);
    if (!m) return;
    const mins = Number(m[1]);
    const secs = Number(m[2] ?? 0);
    void actions.setClock((mins * 60 + secs) * 1000);
    setClockDraft("");
  };

  const scoreboardUrl = `${window.location.origin}${window.location.pathname.replace(/\/admin\/?$/, "/")}`;

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      {/* top bar */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0f1a]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
              Remote
            </span>
            <h1 className="text-sm font-bold uppercase tracking-[0.25em] text-white/80 sm:text-base">
              Scoreboard Control
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={scoreboardUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 sm:inline-block"
            >
              Open scoreboard ↗
            </a>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/60">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  status === "live" ? "bg-emerald-400 animate-pulse" : status === "error" ? "bg-red-500" : "bg-amber-400",
                )}
              />
              {status === "live" ? (mode === "firebase" ? "Firebase" : "Local") : status}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-5 pb-16">
        {mode === "local" && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            <strong className="font-bold">Local sync mode.</strong> Firebase is not configured, so updates only sync
            between tabs on this device. Add your <code className="rounded bg-black/30 px-1">VITE_FIREBASE_*</code>{" "}
            variables to a <code className="rounded bg-black/30 px-1">.env</code> file and rebuild to enable real-time
            sync across devices.
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            <strong className="font-bold">Sync error:</strong> {error}
          </div>
        )}

        {/* live preview */}
        <div className="grid grid-cols-3 items-center gap-2 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-center">
          <div className="min-w-0">
            <div className="truncate text-[10px] font-bold uppercase tracking-widest text-red-400">{state.homeName}</div>
            <div className="scoreboard-digits text-3xl text-white tabular-nums">{state.homeScore}</div>
          </div>
          <div>
            <div
              className={cn(
                "scoreboard-digits text-3xl tabular-nums sm:text-4xl",
                remaining === 0 ? "text-red-500" : "text-amber-400",
              )}
            >
              {formatClock(remaining)}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              {state.period === "OT" ? "Overtime" : state.period === "SO" ? "Shootout" : `Period ${state.period}`}
              {state.clockRunning && <span className="ml-2 text-emerald-400">● running</span>}
            </div>
          </div>
          <div className="min-w-0">
            <div className="truncate text-[10px] font-bold uppercase tracking-widest text-sky-400">{state.awayName}</div>
            <div className="scoreboard-digits text-3xl text-white tabular-nums">{state.awayScore}</div>
          </div>
        </div>

        {/* teams */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TeamControl
            side="home"
            accent="red"
            name={state.homeName}
            score={state.homeScore}
            onAdjust={(d) => void actions.adjustScore("home", d)}
            onRename={(n) => void actions.setTeamName("home", n)}
          />
          <TeamControl
            side="away"
            accent="blue"
            name={state.awayName}
            score={state.awayScore}
            onAdjust={(d) => void actions.adjustScore("away", d)}
            onRename={(n) => void actions.setTeamName("away", n)}
          />
        </div>

        {/* clock */}
        <Card title="Game clock">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <BigButton
              variant={state.clockRunning ? "warn" : "success"}
              onClick={() => void actions.toggleClock()}
              disabled={!state.clockRunning && remaining === 0}
              className="col-span-2 py-5 text-xl sm:text-2xl"
            >
              {state.clockRunning ? "⏸ Pause" : "▶ Start"}
            </BigButton>
            <BigButton variant="neutral" onClick={() => void actions.resetClock()} className="py-5 text-lg">
              ↺ Reset
            </BigButton>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            <BigButton onClick={() => void actions.adjustClock(-60_000)} className="py-3 text-sm">
              −1:00
            </BigButton>
            <BigButton onClick={() => void actions.adjustClock(-1_000)} className="py-3 text-sm">
              −0:01
            </BigButton>
            <BigButton onClick={() => void actions.adjustClock(1_000)} className="py-3 text-sm">
              +0:01
            </BigButton>
            <BigButton onClick={() => void actions.adjustClock(60_000)} className="py-3 text-sm">
              +1:00
            </BigButton>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex flex-1 items-center gap-2">
              <span className="whitespace-nowrap text-xs font-semibold text-white/60">Set clock</span>
              <input
                value={clockDraft}
                onChange={(e) => setClockDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyClockDraft()}
                placeholder="MM:SS"
                inputMode="numeric"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-bold tabular-nums text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
              />
              <BigButton variant="primary" onClick={applyClockDraft} className="px-4 py-2 text-sm">
                Set
              </BigButton>
            </label>
            <label className="flex items-center gap-2">
              <span className="whitespace-nowrap text-xs font-semibold text-white/60">Period length</span>
              <select
                value={state.periodLengthMs}
                onChange={(e) => void actions.setPeriodLength(Number(e.target.value))}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400/60"
              >
                {[5, 10, 12, 15, 17, 20].map((m) => (
                  <option key={m} value={m * 60_000} className="bg-[#0b0f1a]">
                    {m} min
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        {/* period */}
        <Card title="Period">
          <div className="grid grid-cols-5 gap-2">
            {PERIODS.map((p: Period) => (
              <BigButton
                key={p}
                variant={state.period === p ? "warn" : "neutral"}
                onClick={() => void actions.setPeriod(p)}
                className="py-4 text-lg sm:text-xl"
              >
                {p}
              </BigButton>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <BigButton onClick={() => void actions.prevPeriod()} className="py-3 text-sm" disabled={state.period === "1"}>
              ← Previous
            </BigButton>
            <BigButton
              onClick={() => void actions.nextPeriod()}
              className="py-3 text-sm"
              disabled={state.period === PERIODS[PERIODS.length - 1]}
            >
              Next →
            </BigButton>
          </div>
        </Card>

        {/* game */}
        <Card title="Game">
          {confirmReset ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-white/70">Reset scores, period and clock? Team names are kept.</p>
              <div className="flex gap-2">
                <BigButton onClick={() => setConfirmReset(false)} className="px-4 py-2 text-sm">
                  Cancel
                </BigButton>
                <BigButton
                  variant="danger"
                  onClick={() => {
                    void actions.resetGame();
                    setConfirmReset(false);
                  }}
                  className="px-4 py-2 text-sm"
                >
                  Yes, reset game
                </BigButton>
              </div>
            </div>
          ) : (
            <BigButton variant="danger" onClick={() => setConfirmReset(true)} className="w-full py-3 text-sm">
              New game / reset all
            </BigButton>
          )}
        </Card>

        <p className="text-center text-[11px] text-white/35">
          Shortcuts: <kbd className="rounded bg-white/10 px-1">Space</kbd> start/pause ·{" "}
          <kbd className="rounded bg-white/10 px-1">Q</kbd>/<kbd className="rounded bg-white/10 px-1">A</kbd> home ± ·{" "}
          <kbd className="rounded bg-white/10 px-1">P</kbd>/<kbd className="rounded bg-white/10 px-1">L</kbd> away ± ·{" "}
          <kbd className="rounded bg-white/10 px-1">←</kbd>/<kbd className="rounded bg-white/10 px-1">→</kbd> period
        </p>
      </main>
    </div>
  );
}
