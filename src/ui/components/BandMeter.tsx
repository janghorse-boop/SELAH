import { bandCenters, barPct, formatHz, METER_SPAN_DB, MIN_CEIL_DB } from "../../analysis/bands";
import type { BandPlan } from "../../analysis/types";

/**
 * 눈금으로 쓸 주파수(Hz). 옥타브마다 하나씩 — 31밴드 화면에서 여덟 개면
 * 폰 너비에서도 글자가 겹치지 않는다.
 */
const LABEL_HZ = [63, 125, 250, 500, 1000, 2000, 4000, 8000];

/**
 * 눈금을 붙일 막대의 자리. 밴드 수가 적으면(10밴드) 전부 붙인다.
 * 주파수는 로그로 듣는 것이라 가까움도 로그로 잰다 —
 * 선형으로 재면 고역에서 엉뚱한 막대에 눈금이 붙는다.
 */
function labelIndices(centers: number[]): number[] {
  if (centers.length <= 12) return centers.map((_, i) => i);
  const picked = new Set<number>();
  for (const target of LABEL_HZ) {
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < centers.length; i++) {
      const d = Math.abs(Math.log2(centers[i] / target));
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    if (best >= 0) picked.add(best);
  }
  return [...picked].sort((a, b) => a - b);
}

export function BandMeter({
  bands,
  plan,
  variant = "tall",
  highlightHz = null,
  highlightRange = null,
  ceilDb = MIN_CEIL_DB,
}: {
  bands: number[];
  plan: BandPlan;
  variant?: "tall" | "strip";
  highlightHz?: number | null;
  highlightRange?: [number, number] | null;
  /**
   * 창의 천장(dB). 소리에 맞춰 따라 움직인다 — `nextCeilDb` 가 정한다.
   * 고정값을 쓰면 폰에 따라 막대가 늘 바닥이거나 늘 천장이다.
   */
  ceilDb?: number;
}) {
  const centers = bandCenters(plan);
  const height = variant === "tall" ? "h-40" : "h-16";
  const floor = ceilDb - METER_SPAN_DB;
  const labels = labelIndices(centers);

  // 예배 모드는 검은 배경이다. neutral-500 은 검정 위에서 4.4:1 로 기준에
  // 못 미친다 — 눈금이 안 읽히면 없는 것과 같다.
  const tickText = variant === "tall" ? "text-neutral-500" : "text-neutral-400";
  const tickLine = variant === "tall" ? "bg-neutral-300" : "bg-neutral-600";

  const isHot = (hz: number) => highlightHz !== null && hz === highlightHz;
  const inRange = (hz: number) =>
    highlightRange !== null && hz >= highlightRange[0] && hz <= highlightRange[1];

  return (
    <div>
      <div className={`flex items-end gap-px ${height}`}>
        {centers.map((hz, i) => {
          // 값이 아직 없으면 -Infinity. barPct 가 바닥으로 잡는다.
          const pct = barPct(bands[i] ?? -Infinity, floor, ceilDb);
          const color = isHot(hz)
            ? "bg-red-500"
            : inRange(hz)
              ? "bg-amber-400"
              : "bg-green-600";
          return (
            <div
              key={hz}
              className={`flex-1 rounded-t-sm ${color}`}
              // 0% 는 화면에서 사라져 「밴드가 있다」는 것조차 안 보인다.
              // 1px 남겨 두면 바닥 줄처럼 보여 눈금과 맞춰 읽을 수 있다.
              style={{ height: pct > 0 ? `${pct}%` : "1px" }}
              title={`${formatHz(hz)}Hz`}
            />
          );
        })}
      </div>

      {/*
        눈금은 막대와 같은 자리에 찍혀야 뜻이 있다. 막대는 flex-1 로 폭이
        모두 같으니 i번째 막대의 가운데는 (i+0.5)/n 이다. 글자를 그 자리에
        놓고 가운데 정렬한다 — 균등 분할로 늘어놓으면 막대와 어긋난다.
      */}
      <div className="relative mt-0.5 h-3.5">
        {labels.map((i) => (
          <div
            key={centers[i]}
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${((i + 0.5) / centers.length) * 100}%` }}
          >
            <div className={`mx-auto h-1 w-px ${tickLine}`} />
            <div className={`whitespace-nowrap text-[9px] leading-none ${tickText}`}>
              {formatHz(centers[i])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
