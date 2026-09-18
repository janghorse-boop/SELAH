import type { Spectrum } from "../../src/analysis/types";

export const SAMPLE_RATE = 48000;
export const FFT_SIZE = 16384;
export const BIN_COUNT = FFT_SIZE / 2; // 8192
export const BIN_HZ = SAMPLE_RATE / FFT_SIZE; // ≈ 2.93

/** 모든 bin 이 같은 레벨인 바닥. */
export function flatFloor(floorDb: number): Spectrum {
  const db = new Float32Array(BIN_COUNT).fill(floorDb);
  return { db, binHz: BIN_HZ };
}

/** 한 봉우리를 바닥 위에 얹는다. 폭은 좁게(σ = 1.2 bin) — 실제 하울링을 흉내낸다. */
export function tonePeak(hz: number, peakDb: number, floorDb: number): Spectrum {
  const s = flatFloor(floorDb);
  addPeak(s, hz, peakDb, floorDb);
  return s;
}

/** 기본음 + 2배음 + 3배음. 사람 목소리·악기를 흉내낸다. */
export function harmonicTone(f0: number, peakDb: number, floorDb: number): Spectrum {
  const s = flatFloor(floorDb);
  addPeak(s, f0, peakDb, floorDb);
  addPeak(s, f0 * 2, peakDb - 4, floorDb);
  addPeak(s, f0 * 3, peakDb - 8, floorDb);
  return s;
}

/**
 * 핑크노이즈. bin 당 전력이 1/f 이므로 dB 는 -10*log10(f).
 * 1/3 옥타브로 묶으면 평탄해진다 — 밴드 묶기가 맞는지 검증하는 데 쓴다.
 */
export function pinkNoise(refDbAt1kHz: number): Spectrum {
  const db = new Float32Array(BIN_COUNT);
  for (let i = 0; i < BIN_COUNT; i++) {
    const hz = Math.max(i * BIN_HZ, BIN_HZ);
    db[i] = refDbAt1kHz - 10 * Math.log10(hz / 1000);
  }
  return { db, binHz: BIN_HZ };
}

/** 이미 있는 스펙트럼에 봉우리를 더한다(전력 합산). 외부에서도 쓴다. */
export function addPeak(
  s: Spectrum,
  hz: number,
  peakDb: number,
  floorDb: number,
): void {
  const center = hz / s.binHz;
  const sigma = 1.2;
  const span = 6;
  for (let i = Math.max(0, Math.floor(center - span)); i <= Math.min(s.db.length - 1, Math.ceil(center + span)); i++) {
    const drop = ((i - center) ** 2) / (2 * sigma * sigma) * 10;
    const contribution = peakDb - drop;
    if (contribution <= floorDb) continue;
    // 전력 합산
    const p = 10 ** (s.db[i] / 10) + 10 ** (contribution / 10);
    s.db[i] = 10 * Math.log10(p);
  }
}

/** 한 프레임을 복제한다. 시간축 테스트에서 쓴다. */
export function cloneSpectrum(s: Spectrum): Spectrum {
  return { db: new Float32Array(s.db), binHz: s.binHz };
}

/**
 * 실제 마이크 프레임 모양. bin 마다 전력이 지수분포라 매끈하지 않고,
 * 국소 최대가 1,600개쯤 생긴다. 매끈한 신호(핑크노이즈는 0개)만으로
 * 시험하면 봉우리 검출 비용이 드러나지 않는다.
 */
export function jaggedFloor(refDbAt1kHz: number, seed = 1): Spectrum {
  let state = seed >>> 0;
  // (0, 1) 열린 구간. 0 이 나오면 아래 -log(1-u) 가 0 이 되어 그 칸이
  // -Infinity 로 떨어진다(seed 5499 에서 실제로 나온다). 지금은 무해하지만
  // 다른 시험이 이 헬퍼를 가져다 쓰면 한 칸만 조용히 비는 함정이 된다.
  const rnd = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return ((state >>> 8) + 0.5) / 16777216;
  };
  const db = new Float32Array(BIN_COUNT);
  for (let i = 0; i < BIN_COUNT; i++) {
    const hz = Math.max(i * BIN_HZ, BIN_HZ);
    const mean = refDbAt1kHz - 10 * Math.log10(hz / 1000);
    db[i] = mean + 10 * Math.log10(-Math.log(1 - rnd()));
  }
  return { db, binHz: BIN_HZ };
}
