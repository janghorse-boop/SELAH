import { describe, it, expect } from "vitest";
import { findPeaks, computePnpr, computePapr, computePhpr, computeShpr } from "../../src/analysis/peaks";
import { tonePeak, harmonicTone, pinkNoise, flatFloor, jaggedFloor } from "../helpers/signals";

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

  it("사면 위의 잔물결은 봉우리로 세지 않는다 (±2 칸까지 봐야 한다)", () => {
    // 완만히 올라가는 사면 위에 한 칸만 톡 튀어나온 잔물결을 만든다.
    // ±1 칸만 보면 봉우리로 세지만, ±2 칸까지 보면 아니다.
    // 이 테스트가 없으면 ±2 조건을 ±1 로 풀어도 아무도 모른다.
    const s = flatFloor(-100);
    for (let i = 100; i <= 120; i++) s.db[i] = -80 + (i - 100);
    s.db[110] += 1.5;
    const peaks = findPeaks(s, { minDb: -90 });
    expect(peaks.map((p) => p.bin)).not.toContain(110);
    expect(peaks).toHaveLength(1); // 사면 꼭대기(120) 하나뿐
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

  it("저역에서도 이웃을 찾는다 (창이 자기 자신에 먹히면 안 된다)", () => {
    // 63Hz 는 bin 22, ±1/6 옥타브 창은 bin 19~25 뿐이다.
    // 자기 자신(±3)을 빼면 이웃이 0개 → median 이 -Infinity → PNPR 이 Infinity.
    // 그러면 베이스 대역 울림이 전부 「확실한 하울링」이 된다.
    const s = tonePeak(63, -20, -100);
    const bin = Math.round(63 / s.binHz);
    const pnpr = computePnpr(s, bin);
    expect(Number.isFinite(pnpr)).toBe(true);   // 창을 안 넓히면 Infinity
    expect(pnpr).toBeGreaterThan(70);           // 자기 제외가 빠지면 41.8 로 떨어진다
    expect(pnpr).toBeLessThan(90);
  });
});

describe("PAPR — 전체 평균 대비", () => {
  it("바닥 위의 단일 봉우리는 PAPR 이 크다", () => {
    const s = tonePeak(3184, -20, -100);
    const bin = Math.round(3184 / s.binHz);
    const papr = computePapr(s, bin);
    // 전력 평균이면 약 36dB. dB 를 산술평균하면 약 80dB 가 나온다.
    // 「20보다 크다」만 걸면 둘 다 통과해 아무것도 검증하지 못한다 —
    // 위쪽 한계를 함께 걸어야 구분된다.
    expect(papr).toBeGreaterThan(30);
    expect(papr).toBeLessThan(50);
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

describe("실제 프레임 모양에서의 비용", () => {
  it("들쭉날쭉한 프레임에서도 한 프레임 예산 안에 끝난다", () => {
    // 실제 프레임에는 국소 최대가 1,600개쯤 있다. 매끈한 신호(0개)로만
    // 시험하면 이 비용이 안 보인다. 예산(33ms)을 넘기면 매 프레임이
    // 「끊김」으로 잡혀 판정 이력이 초기화되고, 하울링을 영영 못 잡는다.
    const s = jaggedFloor(-40);
    const t0 = performance.now();
    const peaks = findPeaks(s);
    const ms = performance.now() - t0;
    expect(peaks.length).toBeLessThanOrEqual(8);
    // 넉넉한 한계다 — 고친 구현은 5ms 안팎, 고치기 전은 700ms 였다.
    expect(ms).toBeLessThan(100);
  });

  it("들쭉날쭉한 프레임에서도 가장 큰 것부터 돌려준다", () => {
    const peaks = findPeaks(jaggedFloor(-40));
    for (let i = 1; i < peaks.length; i++) {
      expect(peaks[i - 1].db).toBeGreaterThanOrEqual(peaks[i].db);
    }
  });
});
