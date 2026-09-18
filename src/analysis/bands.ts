import type { BandPlan, Spectrum } from "./types";

const CENTERS: Record<BandPlan, number[]> = {
  31: [
    20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630,
    800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000,
    12500, 16000, 20000,
  ],
  15: [25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 16000],
  10: [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000],
};

/** 밴드 반폭(옥타브). 31=1/3, 15=2/3, 10=1 옥타브의 절반. */
const HALF_WIDTH_OCT: Record<BandPlan, number> = {
  31: 1 / 6,
  15: 1 / 3,
  10: 1 / 2,
};

export function bandCenters(plan: BandPlan): number[] {
  return CENTERS[plan];
}

/** 화면에 쓰는 주파수 표기. 1000 이상은 k 로 줄인다 (3150 → "3.15k"). */
export function formatHz(hz: number): string {
  return hz >= 1000 ? `${hz / 1000}k` : `${hz}`;
}

export function bandEdges(plan: BandPlan, center: number): { lo: number; hi: number } {
  const h = HALF_WIDTH_OCT[plan];
  return { lo: center * 2 ** -h, hi: center * 2 ** h };
}

/** 로그 축에서 가장 가까운 중심 주파수를 고른다. */
export function nearestBand(hz: number, plan: BandPlan): number {
  const centers = CENTERS[plan];
  let best = centers[0];
  let bestDist = Infinity;
  for (const c of centers) {
    const d = Math.abs(Math.log2(hz / c));
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

/**
 * bin 단위 dB 스펙트럼을 밴드 레벨로 묶는다.
 * dB 를 그대로 평균 내면 안 된다 — 전력으로 되돌려 합산한 뒤 다시 dB 로 만든다.
 * 밴드 안에 bin 이 하나도 없으면(저역) 가장 가까운 bin 하나를 쓴다.
 */
export function spectrumToBands(s: Spectrum, plan: BandPlan): number[] {
  const centers = CENTERS[plan];
  const nyquistBin = s.db.length - 1;

  return centers.map((center) => {
    const { lo, hi } = bandEdges(plan, center);
    let loBin = Math.ceil(lo / s.binHz);
    let hiBin = Math.floor(hi / s.binHz);
    if (hiBin < loBin) {
      const c = Math.round(center / s.binHz);
      loBin = hiBin = c;
    }
    loBin = Math.max(0, loBin);
    hiBin = Math.min(nyquistBin, hiBin);
    if (hiBin < loBin) return -Infinity;

    let power = 0;
    for (let i = loBin; i <= hiBin; i++) power += 10 ** (s.db[i] / 10);
    return 10 * Math.log10(power);
  });
}

/**
 * 밴드 레벨(dB)을 막대 높이(%)로. 보정값을 쓰면 창도 같이 옮겨야 한다 —
 * 값만 올리고 창을 그대로 두면 모든 막대가 동시에 천장에 붙는다.
 * 유한하지 않은 값(빈 밴드의 -Infinity 등)은 바닥으로 본다.
 */
export function barPct(db: number, floorDb: number, ceilDb: number): number {
  if (!Number.isFinite(db)) return 0;
  return Math.min(100, Math.max(0, ((db - floorDb) / (ceilDb - floorDb)) * 100));
}

/**
 * 막대를 그릴 창의 높이(dB). 계량기가 읽히는 범위다 — 90dB 처럼 넓게 잡으면
 * 실제 소리가 쓰는 폭이 아래쪽 3분의 1에 몰려 막대가 전부 바닥에 깔린다.
 */
export const METER_SPAN_DB = 55;

/**
 * 표시 천장이 내려갈 수 있는 하한. 보정을 쓰면 그만큼 함께 옮긴다.
 *
 * 이게 없으면 **조용한 방에서 잡음이 화면을 가득 채운다** — 아무 일도 없는데
 * 뭔가 있는 것처럼 보이고, 그건 이 앱이 가장 하지 말아야 할 일이다.
 */
export const MIN_CEIL_DB = -48;

/** 한 프레임에 천장이 내려올 수 있는 최대치(dB). 30fps 에서 초당 약 4.5dB. */
const CEIL_FALL_DB = 0.15;

/**
 * 막대를 그릴 dB 창의 **천장**을 정한다.
 *
 * 고정 창을 쓰면 안 된다. 폰마다 마이크 감도가 20dB 넘게 차이 나고, FFT 를
 * 16384점으로 잡으면 에너지가 8192개 칸에 흩어져 칸 하나하나는 아주 낮은
 * 값이 된다. 그래서 같은 예배당에서도 어떤 폰은 막대가 늘 바닥에 깔리고
 * 어떤 폰은 늘 천장에 붙는다. 방금 들어온 소리에 맞춰 천장을 따라 올린다.
 *
 * **올라갈 때는 곧바로, 내려올 때는 천천히** — 계량기는 늘 그렇게 움직인다.
 * 그러지 않으면 소리가 멎을 때마다 막대 전체가 출렁여서 읽을 수 없다.
 */
export function nextCeilDb(bands: number[], prevCeilDb: number, minCeilDb: number): number {
  let peak = -Infinity;
  for (const b of bands) if (Number.isFinite(b) && b > peak) peak = b;
  // 여유 3dB. 가장 큰 막대가 천장에 딱 붙어 잘린 것처럼 보이지 않게 한다.
  const target = peak + 3;
  const next = Number.isFinite(target) && target > prevCeilDb ? target : prevCeilDb - CEIL_FALL_DB;
  return Math.max(next, minCeilDb);
}
