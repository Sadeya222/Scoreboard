import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db, isFirebaseConfigured, SCOREBOARD_COLLECTION, SCOREBOARD_DOC_ID } from "../lib/firebase";
import {
  DEFAULT_STATE,
  getRemainingMs,
  PERIODS,
  type Period,
  type ScoreboardState,
} from "../types";

const LOCAL_KEY = "hockey-scoreboard-state";
const CHANNEL_NAME = "hockey-scoreboard";

export type SyncMode = "firebase" | "local";
export type ConnectionStatus = "connecting" | "live" | "error";

function sanitize(raw: Partial<ScoreboardState> | undefined | null): ScoreboardState {
  const s = { ...DEFAULT_STATE, ...(raw ?? {}) };
  return {
    homeName: String(s.homeName ?? DEFAULT_STATE.homeName).slice(0, 24),
    awayName: String(s.awayName ?? DEFAULT_STATE.awayName).slice(0, 24),
    homeScore: Math.max(0, Number(s.homeScore) || 0),
    awayScore: Math.max(0, Number(s.awayScore) || 0),
    period: PERIODS.includes(s.period as Period) ? (s.period as Period) : "1",
    clockRemainingMs: Math.max(0, Number(s.clockRemainingMs) || 0),
    clockRunning: Boolean(s.clockRunning),
    clockStartedAt: Number(s.clockStartedAt) || 0,
    periodLengthMs: Math.max(60_000, Number(s.periodLengthMs) || DEFAULT_STATE.periodLengthMs),
    updatedAt: Number(s.updatedAt) || 0,
  };
}

/* ------------------------------------------------------------------ */
/* Local fallback transport                                            */
/* ------------------------------------------------------------------ */

function readLocal(): ScoreboardState {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? sanitize(JSON.parse(raw)) : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function writeLocal(state: ScoreboardState) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  try {
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.postMessage(state);
    ch.close();
  } catch {
    /* BroadcastChannel unsupported – storage event still fires in other tabs */
  }
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useScoreboard() {
  const [state, setState] = useState<ScoreboardState>(DEFAULT_STATE);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<ScoreboardState>(DEFAULT_STATE);
  const mode: SyncMode = isFirebaseConfigured && db ? "firebase" : "local";

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /* ---- Subscribe ---- */
  useEffect(() => {
    if (mode === "firebase" && db) {
      const ref = doc(db, SCOREBOARD_COLLECTION, SCOREBOARD_DOC_ID);

      // Ensure the document exists so the first subscriber sees defaults persisted.
      getDoc(ref)
        .then((snap) => {
          if (!snap.exists()) {
            return setDoc(ref, { ...DEFAULT_STATE, updatedAt: Date.now() });
          }
        })
        .catch((e) => {
          console.error(e);
        });

      const unsub = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            const next = sanitize(snap.data() as Partial<ScoreboardState>);
            stateRef.current = next;
            setState(next);
          }
          setStatus("live");
          setError(null);
        },
        (err) => {
          console.error("Firestore subscription error:", err);
          setStatus("error");
          setError(err.message);
        },
      );
      return () => unsub();
    }

    // Local mode
    const initial = readLocal();
    stateRef.current = initial;
    setState(initial);
    setStatus("live");

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (ev) => {
        const next = sanitize(ev.data);
        stateRef.current = next;
        setState(next);
      };
    } catch {
      channel = null;
    }
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === LOCAL_KEY && ev.newValue) {
        const next = sanitize(JSON.parse(ev.newValue));
        stateRef.current = next;
        setState(next);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      channel?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [mode]);

  /* ---- Write ---- */
  const commit = useCallback(
    async (patch: Partial<ScoreboardState>) => {
      const next = sanitize({ ...stateRef.current, ...patch, updatedAt: Date.now() });
      // Optimistic local update for snappy controls.
      stateRef.current = next;
      setState(next);

      if (mode === "firebase" && db) {
        try {
          await setDoc(doc(db, SCOREBOARD_COLLECTION, SCOREBOARD_DOC_ID), next, { merge: true });
          setError(null);
        } catch (e) {
          console.error("Failed to write scoreboard:", e);
          setError(e instanceof Error ? e.message : "Write failed");
          setStatus("error");
        }
      } else {
        writeLocal(next);
      }
    },
    [mode],
  );

  /* ---- Actions ---- */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const actions = useMemo(() => buildActions(commit, stateRef), [commit]);

  return { state, status, error, mode, actions };
}

function buildActions(
  commit: (patch: Partial<ScoreboardState>) => Promise<void>,
  stateRef: React.MutableRefObject<ScoreboardState>,
) {
  const actions = {
    adjustScore: (team: "home" | "away", delta: number) => {
      const key = team === "home" ? "homeScore" : "awayScore";
      return commit({ [key]: Math.max(0, stateRef.current[key] + delta) });
    },
    setTeamName: (team: "home" | "away", name: string) => {
      const key = team === "home" ? "homeName" : "awayName";
      const trimmed = name.trim();
      return commit({ [key]: trimmed || (team === "home" ? "HOME" : "AWAY") });
    },
    setPeriod: (period: Period) => commit({ period }),
    nextPeriod: () => {
      const idx = PERIODS.indexOf(stateRef.current.period);
      const next = PERIODS[Math.min(PERIODS.length - 1, idx + 1)];
      return commit({ period: next });
    },
    prevPeriod: () => {
      const idx = PERIODS.indexOf(stateRef.current.period);
      const prev = PERIODS[Math.max(0, idx - 1)];
      return commit({ period: prev });
    },
    startClock: () => {
      const s = stateRef.current;
      if (s.clockRunning) return Promise.resolve();
      const remaining = getRemainingMs(s);
      if (remaining <= 0) return Promise.resolve();
      return commit({ clockRunning: true, clockStartedAt: Date.now(), clockRemainingMs: remaining });
    },
    pauseClock: () => {
      const s = stateRef.current;
      if (!s.clockRunning) return Promise.resolve();
      return commit({ clockRunning: false, clockStartedAt: 0, clockRemainingMs: getRemainingMs(s) });
    },
    toggleClock: () => {
      return stateRef.current.clockRunning ? actions.pauseClock() : actions.startClock();
    },
    resetClock: () => {
      const s = stateRef.current;
      return commit({ clockRunning: false, clockStartedAt: 0, clockRemainingMs: s.periodLengthMs });
    },
    adjustClock: (deltaMs: number) => {
      const s = stateRef.current;
      const remaining = Math.max(0, getRemainingMs(s) + deltaMs);
      return commit({
        clockRemainingMs: remaining,
        clockStartedAt: s.clockRunning ? Date.now() : 0,
      });
    },
    setClock: (ms: number) => {
      const s = stateRef.current;
      return commit({
        clockRemainingMs: Math.max(0, ms),
        clockStartedAt: s.clockRunning ? Date.now() : 0,
      });
    },
    setPeriodLength: (ms: number) => commit({ periodLengthMs: Math.max(60_000, ms) }),
    resetGame: () =>
      commit({
        ...DEFAULT_STATE,
        homeName: stateRef.current.homeName,
        awayName: stateRef.current.awayName,
        periodLengthMs: stateRef.current.periodLengthMs,
        clockRemainingMs: stateRef.current.periodLengthMs,
      }),
  };

  return actions;
}

/**
 * Ticks every `intervalMs` while the clock is running so components can
 * re-render with a fresh remaining-time value. Also auto-stops at zero.
 */
export function useClockTick(state: ScoreboardState, onExpire?: () => void) {
  const [remaining, setRemaining] = useState(() => getRemainingMs(state));
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const { clockRunning, clockStartedAt, clockRemainingMs } = state;

  useEffect(() => {
    const snapshot = { clockRunning, clockStartedAt, clockRemainingMs } as ScoreboardState;
    setRemaining(getRemainingMs(snapshot));
    expiredRef.current = false;
    if (!clockRunning) return;

    const id = window.setInterval(() => {
      const r = getRemainingMs(snapshot);
      setRemaining(r);
      if (r <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        window.clearInterval(id);
        onExpireRef.current?.();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [clockRunning, clockStartedAt, clockRemainingMs]);

  return remaining;
}
