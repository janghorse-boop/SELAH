import { describe, it, expect, beforeEach, vi } from "vitest";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "../../src/storage/settings";
import { MAX_SESSIONS, loadSessions, saveSession, clearSessions } from "../../src/storage/sessions";
import type { Session } from "../../src/storage/sessions";

/** node 환경이라 localStorage 가 없다. 최소 구현을 끼워 넣는다. */
function installLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
}

function makeSession(n: number): Session {
  return {
    id: `s${n}`,
    startedAt: n * 1000,
    endedAt: n * 1000 + 500,
    mode: "rehearsal",
    bandPlan: 31,
    calibrationDb: null,
    howls: [],
    gaps: [],
  };
}

beforeEach(() => installLocalStorage());

describe("설정", () => {
  it("저장된 것이 없으면 기본값을 준다", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("기본값은 31밴드·보통 감도·보정 없음이다", () => {
    expect(DEFAULT_SETTINGS.bandPlan).toBe(31);
    expect(DEFAULT_SETTINGS.sensitivity).toBe("normal");
    expect(DEFAULT_SETTINGS.calibrationDb).toBeNull();
  });

  it("저장한 뒤 읽으면 같다", () => {
    saveSettings({ ...DEFAULT_SETTINGS, bandPlan: 10, calibrationDb: 12 });
    const got = loadSettings();
    expect(got.bandPlan).toBe(10);
    expect(got.calibrationDb).toBe(12);
  });

  it("저장된 값이 깨져 있으면 기본값으로 돌아간다", () => {
    localStorage.setItem("selah.settings", "{{{깨진 JSON");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("localStorage 를 쓸 수 없어도 던지지 않는다", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => {},
      clear: () => {},
    });
    expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow();
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe("세션 기록", () => {
  it("처음에는 비어 있다", () => {
    expect(loadSessions()).toEqual([]);
  });

  it("저장한 세션이 최신순으로 앞에 온다", () => {
    saveSession(makeSession(1));
    saveSession(makeSession(2));
    const got = loadSessions();
    expect(got[0].id).toBe("s2");
    expect(got[1].id).toBe("s1");
  });

  it(`${MAX_SESSIONS}개를 넘으면 오래된 것부터 지운다`, () => {
    for (let i = 1; i <= MAX_SESSIONS + 5; i++) saveSession(makeSession(i));
    const got = loadSessions();
    expect(got).toHaveLength(MAX_SESSIONS);
    expect(got[0].id).toBe(`s${MAX_SESSIONS + 5}`);
    expect(got.some((s) => s.id === "s1")).toBe(false);
  });

  it("clearSessions 하면 비워진다", () => {
    saveSession(makeSession(1));
    clearSessions();
    expect(loadSessions()).toEqual([]);
  });
});
