import type { BandPlan, CutAdvice, HowlCandidate } from "./types";
import { nearestBand } from "./bands";

/** 파라메트릭 EQ 를 쓰는 사람에게 안내할 Q. 그래픽 EQ 는 Q 가 고정이라 쓰지 않는다. */
const PARAMETRIC_Q = 8;

const WIDE_BAND_WARNING =
  "이 밴드 수에서는 옆 주파수까지 함께 내려갑니다. 조금씩 깎으며 소리를 확인하십시오.";

/**
 * 하울링 후보를 「어느 슬라이더를 몇 dB」로 바꾼다.
 * 컷은 최대 6dB, 3dB 단위로 보수적으로 준다 — 앱은 실제 시스템의 여유를 모른다.
 */
export function toCutAdvice(c: HowlCandidate, plan: BandPlan): CutAdvice {
  const raw = Math.round((c.prominence - 12) / 3) * 3;
  const cutDb = Math.min(6, Math.max(3, raw));

  return {
    bandHz: nearestBand(c.hz, plan),
    cutDb,
    exactHz: c.hz,
    q: PARAMETRIC_Q,
    wideBandWarning: plan === 31 ? null : WIDE_BAND_WARNING,
  };
}
