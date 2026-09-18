import type { BandPlan, Sensitivity } from "../analysis/types";

export type Settings = {
  bandPlan: BandPlan;
  /** 절대 SPL 보정 오프셋(dB). null 이면 상대 레벨만 보여준다. */
  calibrationDb: number | null;
  sensitivity: Sensitivity;
  showParametric: boolean;
  /** 고른 입력 기기. null 이면 시스템 기본. */
  deviceId: string | null;
  /** 화면에 보여줄 이름. 기기가 사라졌을 때 「무엇을 쓰고 있었는지」를 말해 준다. */
  deviceLabel: string | null;
};

export const DEFAULT_SETTINGS: Settings = {
  bandPlan: 31,
  calibrationDb: null,
  sensitivity: "normal",
  showParametric: false,
  deviceId: null,
  deviceLabel: null,
};

const KEY = "selah.settings";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    // 시크릿 모드·저장 차단·깨진 값 — 어느 쪽이든 기본값으로 계속 간다
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // 저장만 안 될 뿐 측정은 계속된다. 화면에서 별도로 알린다.
  }
}

/** 저장이 가능한 환경인지. 화면에서 안내를 띄울지 판단하는 데 쓴다. */
export function isStorageAvailable(): boolean {
  try {
    const probe = "selah.probe";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
