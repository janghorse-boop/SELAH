import type { PeakInfo, Spectrum } from "./types";

/** 이웃 판정에 쓰는 폭: 중심의 ±1/6 옥타브. */
const NEIGHBOR_OCT = 1 / 6;
/** 봉우리 자신으로 보고 이웃에서 빼는 범위(bin). */
const SELF_BINS = 3;
/** 저역에서 이웃 창이 자기 자신에 다 먹히지 않도록 보장하는 최소 여유(양쪽 각각). */
const MIN_NEIGHBORS = 4;

function median(values: number[]): number {
  if (values.length === 0) return -Infinity;
  const v = [...values].sort((a, b) => a - b);
  const mid = v.length >> 1;
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/**
 * 이웃(±1/6 옥타브, 자기 자신 제외) 중앙값 대비 솟은 정도.
 *
 * **저역에서는 창을 넓혀야 한다.** 63Hz 는 bin 22 이고 ±1/6 옥타브가 bin 19~25
 * 뿐이라, 자기 자신(±3)을 빼면 이웃이 **한 개도 안 남는다**. 그러면 median 이
 * -Infinity 가 되어 PNPR 이 Infinity — 「확실한 하울링」으로 읽힌다.
 * 베이스 대역의 아무 울림이나 경고가 된다. 어쿠스틱기타 바디 공명(100~200Hz)이
 * 바로 이 구간이다. 양쪽에 최소 MIN_NEIGHBORS 칸은 남도록 창을 넓힌다.
 * 고역은 원래 창이 훨씬 넓어 영향이 없다(3184Hz 에서 값 변화 없음).
 */
export function computePnpr(s: Spectrum, bin: number): number {
  const hz = bin * s.binHz;
  const octLo = Math.floor((hz * 2 ** -NEIGHBOR_OCT) / s.binHz);
  const octHi = Math.ceil((hz * 2 ** NEIGHBOR_OCT) / s.binHz);
  const lo = Math.max(1, Math.min(octLo, bin - SELF_BINS - MIN_NEIGHBORS));
  const hi = Math.min(s.db.length - 1, Math.max(octHi, bin + SELF_BINS + MIN_NEIGHBORS));
  const neighbors: number[] = [];
  for (let i = lo; i <= hi; i++) {
    if (Math.abs(i - bin) <= SELF_BINS) continue;
    neighbors.push(s.db[i]);
  }
  return s.db[bin] - median(neighbors);
}

/** 스펙트럼 전체의 평균 전력 대비. dB 평균이 아니라 전력 평균이다. */
export function computePapr(s: Spectrum, bin: number): number {
  let power = 0;
  for (let i = 1; i < s.db.length; i++) power += 10 ** (s.db[i] / 10);
  const meanDb = 10 * Math.log10(power / (s.db.length - 1));
  return s.db[bin] - meanDb;
}

/** 지정한 bin 근처(±2)의 최대 레벨. 배음은 정확히 떨어지지 않는다. */
function levelNear(s: Spectrum, bin: number): number {
  const lo = Math.max(1, Math.round(bin) - 2);
  const hi = Math.min(s.db.length - 1, Math.round(bin) + 2);
  if (hi < lo) return -Infinity;
  let best = -Infinity;
  for (let i = lo; i <= hi; i++) if (s.db[i] > best) best = s.db[i];
  return best;
}

/** 여러 지점 중 가장 큰 것 대비 몇 dB 위인가. 지점이 모두 범위 밖이면 Infinity. */
function ratioAgainst(s: Spectrum, bin: number, targets: number[]): number {
  let worst = -Infinity;
  for (const t of targets) {
    if (t < 1 || t >= s.db.length) continue;
    const v = levelNear(s, t);
    if (v > worst) worst = v;
  }
  if (worst === -Infinity) return Infinity;
  return s.db[bin] - worst;
}

/**
 * 위쪽 배음(2f·3f) 대비. 값이 클수록 배음이 없다 = 하울링답다.
 * 배음 지점이 나이퀴스트를 넘으면 배음이 없는 것으로 본다.
 */
export function computePhpr(s: Spectrum, bin: number): number {
  return ratioAgainst(s, bin, [bin * 2, bin * 3]);
}

/**
 * 아래쪽(f/2·f/3) 대비. 값이 작으면 이 봉우리가 **남의 배음**이라는 뜻이다.
 * 이것이 없으면 220Hz 목소리의 440Hz 배음 자체가 하울링으로 통과한다 —
 * 440Hz 자신의 위쪽(880·1320)은 비어 있기 때문이다.
 */
export function computeShpr(s: Spectrum, bin: number): number {
  return ratioAgainst(s, bin, [bin / 2, bin / 3]);
}

/**
 * 국소 최대를 찾아 레벨 내림차순으로 돌려준다.
 * minDb 아래는 버린다 — 바닥의 잡음을 봉우리로 세지 않기 위해서다.
 */
export function findPeaks(
  s: Spectrum,
  opts: { minDb?: number; maxPeaks?: number } = {},
): PeakInfo[] {
  const minDb = opts.minDb ?? -80;
  const maxPeaks = opts.maxPeaks ?? 8;

  // 먼저 위치와 높이만 모은다. 네 비율은 살아남은 봉우리에만 계산한다.
  // 실제 마이크 프레임은 매끈하지 않아 국소 최대가 1,600개쯤 나온다 —
  // 테스트가 쓰는 매끈한 핑크노이즈는 0개라 이 비용이 드러나지 않았다.
  // 전부 계산하면 프레임당 700ms 로 예산(33ms)을 스무 배 넘기고,
  // 그러면 매 프레임이 「끊김」으로 잡혀 판정 이력이 초기화되어
  // 하울링을 영영 보고하지 못한다.
  const candidates: { bin: number; db: number }[] = [];
  for (let i = 2; i < s.db.length - 2; i++) {
    const v = s.db[i];
    if (v < minDb) continue;
    if (!(v > s.db[i - 1] && v >= s.db[i + 1])) continue;
    if (!(v > s.db[i - 2] && v >= s.db[i + 2])) continue;
    candidates.push({ bin: i, db: v });
  }

  // 정렬 키가 db 뿐이라 살아남는 봉우리는 예전과 같다.
  candidates.sort((a, b) => b.db - a.db);

  return candidates.slice(0, maxPeaks).map((p) => ({
    bin: p.bin,
    hz: p.bin * s.binHz,
    db: p.db,
    pnpr: computePnpr(s, p.bin),
    papr: computePapr(s, p.bin),
    phpr: computePhpr(s, p.bin),
    shpr: computeShpr(s, p.bin),
  }));
}
