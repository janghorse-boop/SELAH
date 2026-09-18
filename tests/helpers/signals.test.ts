import { describe, it, expect } from "vitest";
import { tonePeak, pinkNoise, harmonicTone, flatFloor } from "./signals";

describe("합성 스펙트럼 생성기", () => {
  it("flatFloor 는 모든 bin 이 같은 값이다", () => {
    const s = flatFloor(-90);
    expect(s.db[100]).toBe(-90);
    expect(s.db[3000]).toBe(-90);
  });

  it("tonePeak 는 지정한 주파수에서 가장 크다", () => {
    const s = tonePeak(1000, -20, -90);
    const targetBin = Math.round(1000 / s.binHz);
    let maxBin = 0;
    for (let i = 1; i < s.db.length; i++) {
      if (s.db[i] > s.db[maxBin]) maxBin = i;
    }
    expect(Math.abs(maxBin - targetBin)).toBeLessThanOrEqual(1);
    // 허용 오차 ±0.5dB. 1000Hz 는 bin 341.33 에 떨어지므로 정수 bin 에서 읽으면
    // 봉우리 꼭대기보다 약 0.39dB 낮다 — 실제 스펙트럼도 같은 이유로 그렇다.
    // 이 오차를 더 좁히면 통과할 수 없다. 조이지 말 것.
    expect(s.db[targetBin]).toBeCloseTo(-20, 0);
  });

  it("pinkNoise 는 주파수가 두 배가 되면 3dB 내려간다", () => {
    const s = pinkNoise(-40);
    const at = (hz: number) => s.db[Math.round(hz / s.binHz)];
    expect(at(2000) - at(1000)).toBeCloseTo(-3, 0);
    expect(at(4000) - at(2000)).toBeCloseTo(-3, 0);
  });

  it("harmonicTone 은 2배·3배 지점에도 봉우리가 있다", () => {
    const s = harmonicTone(220, -20, -90);
    const at = (hz: number) => s.db[Math.round(hz / s.binHz)];
    expect(at(220)).toBeGreaterThan(-30);
    expect(at(440)).toBeGreaterThan(-30);
    expect(at(660)).toBeGreaterThan(-30);
    expect(at(1500)).toBeLessThan(-80);
  });
});
