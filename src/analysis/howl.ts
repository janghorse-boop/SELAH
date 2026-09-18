import type { HowlCandidate, Sensitivity, Spectrum } from "./types";
import { findPeaks } from "./peaks";

/** 초당 30프레임 기준. frames = round(holdMs / (1000/30)). */
export const SENSITIVITY: Record<
  Sensitivity,
  {
    pnprMin: number;
    paprMin: number;
    phprMin: number;
    shprMin: number;
    holdMs: number;
    frames: number;
  }
> = {
  low: { pnprMin: 18, paprMin: 23, phprMin: 15, shprMin: 15, holdMs: 700, frames: 21 },
  normal: { pnprMin: 15, paprMin: 20, phprMin: 15, shprMin: 15, holdMs: 500, frames: 15 },
  high: { pnprMin: 12, paprMin: 17, phprMin: 15, shprMin: 15, holdMs: 350, frames: 11 },
};

/** 관찰 창 안에서 같은 bin 이 봉우리로 나타나야 하는 최소 비율 (IPMP). */
const PERSISTENCE_RATIO = 0.6;
/** 같은 자리로 볼 bin 허용 오차. */
const BIN_TOLERANCE = 1;

type Frame = { bin: number; db: number } | null;

export class HowlDetector {
  private readonly cfg: (typeof SENSITIVITY)[Sensitivity];
  private history: Frame[] = [];

  constructor(sensitivity: Sensitivity) {
    this.cfg = SENSITIVITY[sensitivity];
  }

  reset(): void {
    this.history = [];
  }

  /**
   * 한 프레임을 넣는다. 다섯 기준을 모두 만족하면 후보를 돌려주고,
   * 아니면 null 을 돌려준다.
   */
  push(s: Spectrum): HowlCandidate | null {
    const peaks = findPeaks(s);

    // 한 프레임 기준을 통과한 봉우리 중 가장 큰 것만 기억한다.
    // shpr 을 빼면 남의 배음(예: 220Hz 목소리의 440Hz)이 통과한다.
    const passing = peaks.find(
      (p) =>
        p.pnpr >= this.cfg.pnprMin &&
        p.papr >= this.cfg.paprMin &&
        p.phpr >= this.cfg.phprMin &&
        p.shpr >= this.cfg.shprMin,
    );

    this.history.push(passing ? { bin: passing.bin, db: passing.db } : null);
    if (this.history.length > this.cfg.frames) this.history.shift();

    // 창이 다 차기 전에는 판정하지 않는다
    if (this.history.length < this.cfg.frames) return null;
    if (!passing) return null;

    // IPMP — 같은 자리(±1 bin)에 머물렀는가
    const sameBin = this.history.filter(
      (f) => f !== null && Math.abs(f.bin - passing.bin) <= BIN_TOLERANCE,
    );
    if (sameBin.length / this.cfg.frames < PERSISTENCE_RATIO) return null;

    // IMSD — 자라고 있는가 (최소제곱 기울기 ≥ 0)
    if (slope(sameBin.map((f) => f!.db)) < 0) return null;

    return {
      hz: passing.hz,
      db: passing.db,
      prominence: passing.pnpr,
    };
  }
}

/** y 값들의 최소제곱 기울기. x 는 0,1,2,… 로 본다. */
function slope(ys: number[]): number {
  const n = ys.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (ys[i] - meanY);
    den += (i - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}
