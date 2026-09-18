import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DEFAULT_SETTINGS, loadSettings, saveSettings, isStorageAvailable,
} from "../../src/storage/settings";

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
