import type { CutAdvice } from "../../analysis/types";

function label(hz: number): string {
  return hz >= 1000 ? `${hz / 1000}k` : `${hz}`;
}

export function HowlCard({
  advice,
  size = "large",
  showParametric = false,
}: {
  advice: CutAdvice;
  size?: "large" | "small";
  showParametric?: boolean;
}) {
  const big = size === "large";
  return (
    <div className={`rounded-xl bg-red-600 text-white ${big ? "p-4" : "px-3 py-2"}`}>
      <div className={big ? "text-3xl font-extrabold" : "text-base font-bold"}>
        {label(advice.bandHz)} Hz
      </div>
      <div className={`mt-1 ${big ? "text-sm" : "text-xs"}`}>
        <b>{label(advice.bandHz)} 슬라이더</b> → 약 <b>{advice.cutDb}dB</b> 내리기
      </div>
      {showParametric && (
        <div className={`mt-1 opacity-90 ${big ? "text-xs" : "text-[10px]"}`}>
          파라메트릭: {Math.round(advice.exactHz)}Hz · Q ≈ {advice.q}
        </div>
      )}
      {advice.wideBandWarning && (
        <div className={`mt-2 rounded bg-red-800/60 px-2 py-1 ${big ? "text-xs" : "text-[10px]"}`}>
          {advice.wideBandWarning}
        </div>
      )}
    </div>
  );
}
