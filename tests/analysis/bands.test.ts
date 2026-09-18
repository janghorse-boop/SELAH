import { describe, it, expect } from "vitest";
import { bandCenters, bandEdges, spectrumToBands, nearestBand } from "../../src/analysis/bands";
import { tonePeak, pinkNoise } from "../helpers/signals";

describe("밴드 정의", () => {
  it("31밴드는 ISO 1/3 옥타브 중심 주파수 31개다", () => {
    const c = bandCenters(31);
    expect(c).toHaveLength(31);
    expect(c[0]).toBe(20);
    expect(c[22]).toBe(3150);
    expect(c[30]).toBe(20000);
  });

  it("15밴드는 15개, 10밴드는 10개다", () => {
    expect(bandCenters(15)).toHaveLength(15);
    expect(bandCenters(10)).toHaveLength(10);
    expect(bandCenters(10)[7]).toBe(4000);
  });

  it("1/3 옥타브 경계는 중심의 2^(±1/6) 이다", () => {
    const { lo, hi } = bandEdges(31, 1000);
    expect(lo).toBeCloseTo(1000 * 2 ** (-1 / 6), 1);
    expect(hi).toBeCloseTo(1000 * 2 ** (1 / 6), 1);
  });

  it("1 옥타브 경계는 중심의 2^(±1/2) 이다", () => {
    const { lo, hi } = bandEdges(10, 1000);
    expect(lo).toBeCloseTo(707.1, 0);
    expect(hi).toBeCloseTo(1414.2, 0);
  });
});

describe("가장 가까운 밴드", () => {
  it("31밴드에서 3184Hz 는 3150 슬라이더다", () => {
    expect(nearestBand(3184, 31)).toBe(3150);
  });

  it("10밴드에서 같은 3184Hz 는 4000 슬라이더다", () => {
    expect(nearestBand(3184, 10)).toBe(4000);
  });

  it("15밴드에서 3184Hz 는 2500 과 4000 중 로그상 가까운 쪽이다", () => {
    // 3184/2500 = 1.274, 4000/3184 = 1.256 → 4000 이 더 가깝다
    expect(nearestBand(3184, 15)).toBe(4000);
  });

  it("중심값과 정확히 같으면 그 값이다", () => {
    expect(nearestBand(1000, 31)).toBe(1000);
  });
});

describe("스펙트럼을 밴드로 묶기", () => {
  it("1kHz 사인파는 1000 밴드가 최대다", () => {
    const bands = spectrumToBands(tonePeak(1000, -20, -100), 31);
    const centers = bandCenters(31);
    let maxIdx = 0;
    for (let i = 1; i < bands.length; i++) if (bands[i] > bands[maxIdx]) maxIdx = i;
    expect(centers[maxIdx]).toBe(1000);
  });

  it("핑크노이즈는 31밴드가 평탄하다 (100Hz~10kHz 안에서 ±1.5dB)", () => {
    const bands = spectrumToBands(pinkNoise(-40), 31);
    const centers = bandCenters(31);
    const inRange = centers
      .map((hz, i) => ({ hz, v: bands[i] }))
      .filter((b) => b.hz >= 100 && b.hz <= 10000)
      .map((b) => b.v);
    const min = Math.min(...inRange);
    const max = Math.max(...inRange);
    expect(max - min).toBeLessThan(1.5);
  });

  it("밴드 개수는 계획과 같다", () => {
    expect(spectrumToBands(pinkNoise(-40), 10)).toHaveLength(10);
  });
});
