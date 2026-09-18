import { bandCenters, formatHz } from "../../analysis/bands";
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
}: {
  bands: number[];
  plan: BandPlan;
  variant?: "tall" | "strip";
  highlightHz?: number | null;
  highlightRange?: [number, number] | null;
}) {
  const centers = bandCenters(plan);
  const height = variant === "tall" ? "h-40" : "h-9";

  const isHot = (hz: number) => highlightHz !== null && hz === highlightHz;
  const inRange = (hz: number) =>
    highlightRange !== null && hz >= highlightRange[0] && hz <= highlightRange[1];

  return (
    <div>
      <div className={`flex items-end gap-px ${height}`}>
        {centers.map((hz, i) => {
          const raw = bands[i];
          const v = Number.isFinite(raw) ? raw : FLOOR_DB;
          const pct = Math.min(100, Math.max(0, ((v - FLOOR_DB) / (CEIL_DB - FLOOR_DB)) * 100));
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
