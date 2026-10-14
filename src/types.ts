export type Period = "1" | "2" | "3" | "OT" | "SO";

export const PERIODS: Period[] = ["1", "2", "3", "OT", "SO"];

export interface ScoreboardState {
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  period: Period;
  /** Milliseconds remaining on the clock at the moment `clockStartedAt` was set (or when paused). */
  clockRemainingMs: number;
  /** Whether the clock is currently running. */
  clockRunning: boolean;
  /** Epoch ms when the clock was last started. 0 when paused. */
  clockStartedAt: number;
  /** Default period length in ms (used by reset). */
  periodLengthMs: number;
  updatedAt: number;
}

export const DEFAULT_PERIOD_MS = 20 * 60 * 1000;

export const DEFAULT_STATE: ScoreboardState = {
  homeName: "HOME",
  awayName: "AWAY",
  homeScore: 0,
  awayScore: 0,
  period: "1",
  clockRemainingMs: DEFAULT_PERIOD_MS,
  clockRunning: false,
  clockStartedAt: 0,
  periodLengthMs: DEFAULT_PERIOD_MS,
  updatedAt: 0,
};

/** Compute the current remaining ms from a state snapshot at time `now`. */
export function getRemainingMs(state: ScoreboardState, now: number = Date.now()): number {
  if (!state.clockRunning || !state.clockStartedAt) return Math.max(0, state.clockRemainingMs);
  const elapsed = now - state.clockStartedAt;
  return Math.max(0, state.clockRemainingMs - elapsed);
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
