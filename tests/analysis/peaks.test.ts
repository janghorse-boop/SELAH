import { describe, it, expect } from "vitest";
import { findPeaks, computePnpr, computePapr, computePhpr, computeShpr } from "../../src/analysis/peaks";
import { tonePeak, harmonicTone, pinkNoise } from "../helpers/signals";

describe("봉우리 검출", () => {
  it("좁은 봉우리 하나를 그 주파수에서 찾는다", () => {
    const peaks = findPeaks(tonePeak(3184, -20, -100));
    expect(peaks.length).toBeGreaterThan(0);
    expect(peaks[0].hz).toBeCloseTo(3184, -1);
  });

  it("레벨이 높은 순으로 돌려준다", () => {
    const s = tonePeak(1000, -20, -100);
    const peaks = findPeaks(s);
    for (let i = 1; i < peaks.length; i++) {
      expect(peaks[i - 1].db).toBeGreaterThanOrEqual(peaks[i].db);
    }
  });

  it("봉우리가 없는 평탄한 신호에서는 거의 찾지 못한다", () => {
    const peaks = findPeaks(pinkNoise(-40), { minDb: -20 });
    expect(peaks.length).toBe(0);
  });
});

describe("PNPR — 이웃 대비", () => {
  it("좁고 큰 봉우리는 PNPR 이 크다", () => {
    const s = tonePeak(3184, -20, -100);
    const bin = Math.round(3184 / s.binHz);
    expect(computePnpr(s, bin)).toBeGreaterThan(15);
  });

  it("핑크노이즈 한가운데는 PNPR 이 작다", () => {
    const s = pinkNoise(-40);
    const bin = Math.round(3184 / s.binHz);
    expect(computePnpr(s, bin)).toBeLessThan(5);
  });
});

describe("PAPR — 전체 평균 대비", () => {
  it("바닥 위의 단일 봉우리는 PAPR 이 크다", () => {
    const s = tonePeak(3184, -20, -100);
    const bin = Math.round(3184 / s.binHz);
    expect(computePapr(s, bin)).toBeGreaterThan(20);
  });
});

describe("PHPR — 배음이 없는가", () => {
  it("배음 없는 단일음은 PHPR 이 크다 (하울링답다)", () => {
    const s = tonePeak(1000, -20, -100);
    const bin = Math.round(1000 / s.binHz);
    expect(computePhpr(s, bin)).toBeGreaterThan(15);
  });

  it("배음이 있는 소리는 PHPR 이 작다 (사람·악기다)", () => {
    const s = harmonicTone(220, -20, -100);
    const bin = Math.round(220 / s.binHz);
    expect(computePhpr(s, bin)).toBeLessThan(15);
  });

  it("2f·3f 가 나이퀴스트를 넘으면 배음이 없는 것으로 본다", () => {
    const s = tonePeak(20000, -20, -100);
    const bin = Math.round(20000 / s.binHz);
    expect(computePhpr(s, bin)).toBeGreaterThan(15);
  });
});

describe("SHPR — 남의 배음이 아닌가", () => {
  it("아래에 아무것도 없는 단일음은 SHPR 이 크다", () => {
    const s = tonePeak(3184, -20, -100);
    const bin = Math.round(3184 / s.binHz);
    expect(computeShpr(s, bin)).toBeGreaterThan(15);
  });

  it("220Hz 의 2배음인 440Hz 는 SHPR 이 작다 (남의 배음이다)", () => {
    const s = harmonicTone(220, -20, -100);
    const bin = Math.round(440 / s.binHz);
    expect(computeShpr(s, bin)).toBeLessThan(15);
  });

  it("220Hz 의 3배음인 660Hz 도 SHPR 이 작다", () => {
    const s = harmonicTone(220, -20, -100);
    const bin = Math.round(660 / s.binHz);
    expect(computeShpr(s, bin)).toBeLessThan(15);
  });

  it("저역 단일음도 아래가 비어 있으면 통과한다", () => {
    const s = tonePeak(63, -20, -100);
    const bin = Math.round(63 / s.binHz);
    expect(computeShpr(s, bin)).toBeGreaterThan(15);
  });
});
