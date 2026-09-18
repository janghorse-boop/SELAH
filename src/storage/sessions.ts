import type { BandPlan } from "../analysis/types";

export type HowlRecord = {
  hz: number;
  bandHz: number;
  /** 세션 시작 기준 경과 ms */
  atMs: number;
  cutDb: number;
  prominence: number;
};

/** 백그라운드 전환 등으로 측정이 끊긴 구간. 비교할 때 반드시 봐야 한다. */
export type Gap = { atMs: number; durationMs: number };

export type Session = {
  id: string;
  startedAt: number;
  endedAt: number;
  mode: "rehearsal" | "worship";
  bandPlan: BandPlan;
  calibrationDb: number | null;
  /** 리허설 모드에서만 남긴다 */
  bandPeak?: number[];
  bandAvg?: number[];
  howls: HowlRecord[];
  gaps: Gap[];
};

export const MAX_SESSIONS = 50;
const KEY = "selah.sessions";

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Session[]) : [];
  } catch {
    return [];
  }
}

/** 최신이 앞에 오도록 넣고, 상한을 넘으면 오래된 것부터 버린다. */
export function saveSession(s: Session): void {
  try {
    const next = [s, ...loadSessions()].slice(0, MAX_SESSIONS);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 용량 초과 등. 측정 자체는 끝난 뒤이므로 조용히 넘어가되 화면에서 알린다.
  }
}

export function clearSessions(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}

export function newSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
