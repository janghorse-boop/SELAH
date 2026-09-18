import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DEFAULT_SETTINGS, loadSettings, saveSettings, isStorageAvailable,
} from "../../src/storage/settings";
import {
  MAX_SESSIONS, loadSessions, saveSession, clearSessions, newSessionId,
} from "../../src/storage/sessions";
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

/** 시크릿 모드·사이트 데이터 차단. 네 가지 모두 던진다. */
function installThrowingLocalStorage() {
  const boom = () => { throw new Error("blocked"); };
  vi.stubGlobal("localStorage", {
    getItem: boom, setItem: boom, removeItem: boom, clear: boom,
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

  it("저장된 값에 없는 항목은 기본값으로 채운다", () => {
    // 설정 항목이 나중에 늘면 예전에 저장된 값에는 그 항목이 없다.
    // 병합하지 않고 그대로 쓰면 undefined 가 화면까지 내려간다.
    // 온전한 객체를 저장했다가 읽는 왕복 검사로는 이걸 못 잡는다.
    localStorage.setItem("selah.settings", JSON.stringify({ bandPlan: 10 }));
    const got = loadSettings();
    expect(got.bandPlan).toBe(10);
    expect(got.showParametric).toBe(DEFAULT_SETTINGS.showParametric);
    expect(got.sensitivity).toBe(DEFAULT_SETTINGS.sensitivity);
    expect(got.deviceId).toBe(DEFAULT_SETTINGS.deviceId);
    expect(got.deviceLabel).toBe(DEFAULT_SETTINGS.deviceLabel);
  });

  it("localStorage 를 쓸 수 없어도 던지지 않는다", () => {
    installThrowingLocalStorage();
    expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow();
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("저장 가능 여부를 알려준다 — 막혀 있어도 던지지 않는다", () => {
    expect(isStorageAvailable()).toBe(true);
    installThrowingLocalStorage();
    expect(isStorageAvailable()).toBe(false);
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
    // 경계도 함께 못 박는다 — 길이만 맞고 몇 개 어긋나는 잘림도 통과하지 않도록.
    expect(got[got.length - 1].id).toBe("s6");
  });

  it("clearSessions 하면 비워진다", () => {
    saveSession(makeSession(1));
    clearSessions();
    expect(loadSessions()).toEqual([]);
  });

  it("끊긴 구간과 밴드 통계가 저장되고 다시 읽힌다", () => {
    // gaps 는 이 과제가 존재하는 이유다. 기록되지 않으면 나중에
    // 한 시간짜리와 사십 분짜리를 나란히 놓고 비교하게 된다.
    // 타입에만 있고 한 번도 왕복시켜 보지 않으면 비어 있어도 아무도 모른다.
    saveSession({
      ...makeSession(1),
      gaps: [{ atMs: 12000, durationMs: 3400 }],
      bandPeak: [-30.1, -28.4],
      bandAvg: [-45.2, -44.8],
    });
    const got = loadSessions()[0];
    expect(got.gaps).toEqual([{ atMs: 12000, durationMs: 3400 }]);
    expect(got.bandPeak).toEqual([-30.1, -28.4]);
    expect(got.bandAvg).toEqual([-45.2, -44.8]);
  });

  it("저장소를 쓸 수 없어도 세션 함수들이 던지지 않는다", () => {
    // 설정 쪽만 감싸고 세션 쪽을 빠뜨려도 나머지 테스트는 전부 통과한다.
    // 시크릿 모드에서 「측정 끝내고 저장」을 누르는 순간 화면이 죽는다.
    installThrowingLocalStorage();
    expect(() => saveSession(makeSession(1))).not.toThrow();
    expect(() => clearSessions()).not.toThrow();
    expect(loadSessions()).toEqual([]);
  });

  it("세션 id 는 연달아 만들어도 겹치지 않는다", () => {
    const ids = new Set(Array.from({ length: 100 }, () => newSessionId()));
    expect(ids.size).toBe(100);
  });

  it("저장 성공 여부를 사실대로 돌려준다", () => {
    expect(saveSession(makeSession(1))).toBe(true);
    installThrowingLocalStorage();
    expect(saveSession(makeSession(2))).toBe(false);
  });
});
