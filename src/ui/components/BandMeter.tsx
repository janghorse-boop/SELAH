import { bandCenters, barPct, formatHz } from "../../analysis/bands";
import type { BandPlan } from "../../analysis/types";

/** 화면에 보여줄 하한/상한(dB). 이 범위 밖은 자른다. */
const FLOOR_DB = -100;
const CEIL_DB = -10;

export function BandMeter({
  bands,
  plan,
  variant = "tall",
  highlightHz = null,
  highlightRange = null,
  offsetDb = 0,
}: {
  bands: number[];
  plan: BandPlan;
  variant?: "tall" | "strip";
  highlightHz?: number | null;
  highlightRange?: [number, number] | null;
  /** 절대 dB 보정값. 값만 더하고 창을 그대로 두면 모든 막대가 천장에 붙는다. */
  offsetDb?: number;
}) {
  const centers = bandCenters(plan);
  const height = variant === "tall" ? "h-40" : "h-9";
  const floor = FLOOR_DB + offsetDb;
  const ceil = CEIL_DB + offsetDb;

  const isHot = (hz: number) => highlightHz !== null && hz === highlightHz;
  const inRange = (hz: number) =>
    highlightRange !== null && hz >= highlightRange[0] && hz <= highlightRange[1];

  return (
    <div>
      <div className={`flex items-end gap-px ${height}`}>
        {centers.map((hz, i) => {
          // 값이 아직 없으면 FLOOR_DB 가 아니라 -Infinity 를 넣는다.
          // FLOOR_DB(-100)는 보정을 안 쓸 때만 바닥이다 — 보정이 -60 이면
          // 창이 -160~-70 이라 「자료 없음」이 막대 3분의 2 높이로 그려진다.
          // 첫 프레임이 오기 전에는 31개가 전부 이 길을 지난다.
          const pct = barPct(bands[i] ?? -Infinity, floor, ceil);
          const color = isHot(hz)
            ? "bg-red-500"
            : inRange(hz)
              ? "bg-amber-400"
              : "bg-green-600";
          return (
            <div
              key={hz}
              className={`flex-1 rounded-t-sm ${color}`}
              style={{ height: `${pct}%` }}
              title={`${formatHz(hz)}Hz`}
            />
          );
        })}
      </div>
      {variant === "tall" && (
        <div className="mt-1 flex justify-between text-[9px] text-neutral-500">
          {[0, Math.floor(centers.length / 4), Math.floor(centers.length / 2), Math.floor((centers.length * 3) / 4), centers.length - 1].map(
            (i) => (
              <span key={i}>{formatHz(centers[i])}</span>
            ),
          )}
        </div>
      )}
    </div>
  );
}
