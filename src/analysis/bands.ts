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
