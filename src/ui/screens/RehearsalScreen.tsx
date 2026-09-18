import { useEffect } from "react";
import { useAnalyzer } from "../hooks/useAnalyzer";
import { useWakeLock } from "../hooks/useWakeLock";
import { BandMeter } from "../components/BandMeter";
import { HowlCard } from "../components/HowlCard";
import { WarningBadge } from "../components/WarningBadge";
import { toCutAdvice } from "../../analysis/advice";
import type { Settings } from "../../storage/settings";

export function RehearsalScreen({
  settings,
  onExit,
  highlightRange = null,
}: {
  settings: Settings;
  onExit: () => void;
  highlightRange?: [number, number] | null;
}) {
  const a = useAnalyzer(settings);
  const wake = useWakeLock(a.running);

  // 슬롯 높이를 숫자로 찍어 맞추지 않는다. min-h 는 최소값이라
  // 경고 문구(31밴드가 아니면 하울링마다 붙는다)나 파라메트릭 줄이 생기면
  // 카드가 그보다 커져 막대가 밀린다 — 경고를 읽어야 할 바로 그 순간에.
  // 실제 함수로 만든 카드를 보이지 않게 깔아 자리를 잡으면
  // 설정이 무엇이든 높이가 정확히 같다.
  const sizer = toCutAdvice({ hz: 1000, db: -20, prominence: 18 }, settings.bandPlan);

  useEffect(() => {
    // 화면에 들어오면 바로 잰다. 마이크는 useAnalyzer 자신의 정리 효과가 끈다.
    void a.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-bold">리허설 모드</h1>
          {a.deviceLabel && <span className="text-[11px] text-neutral-500">{a.deviceLabel}</span>}
        </div>
        <button className="text-sm text-neutral-500" onClick={onExit}>
          나가기
        </button>
      </div>

      {a.error && <div className="mb-3 rounded-lg bg-red-100 p-3 text-sm text-red-800">{a.error}</div>}
      {a.warning && (
        <div className="mb-3">
          <WarningBadge text={a.warning} />
        </div>
      )}
      {wake.status === "unavailable" && (
        // 리허설도 예배만큼 길게 이어지고 화면은 똑같이 꺼진다 —
        // 밝은 배경에 맞춘 색으로 같은 안내를 띄운다.
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          화면 꺼짐 방지를 걸지 못했습니다. 화면이 꺼지면 감시가 멈춥니다.
        </div>
      )}

      <div className="mb-3">
        {a.advice ? (
          <HowlCard advice={a.advice} size="large" showParametric={settings.showParametric} />
        ) : (
          <div className="relative">
            <div aria-hidden className="invisible">
              <HowlCard advice={sizer} size="large" showParametric={settings.showParametric} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-dashed border-neutral-300 text-sm text-neutral-400">
              하울링 없음 · 감시 중
            </div>
          </div>
        )}
      </div>

      <BandMeter
        bands={a.bands}
        plan={settings.bandPlan}
        variant="tall"
        highlightHz={a.advice?.bandHz ?? null}
        highlightRange={highlightRange}
        ceilDb={a.ceilDb}
      />

      <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
        <span>{Math.floor(a.elapsedMs / 60000)}분 감시 · 하울링 {a.howls.length}회</span>
        {a.gaps.length > 0 && <span className="text-amber-600">끊김 {a.gaps.length}회</span>}
      </div>

      {/* 시작과 멈춤, 둘뿐이다. 저장은 하지 않는다. */}
      <button
        className={`mt-4 w-full rounded-lg py-3 font-semibold text-white ${
          a.running ? "bg-neutral-800" : "bg-green-700"
        }`}
        onClick={() => (a.running ? a.stop() : void a.start())}
      >
        {a.running ? "측정 멈추기" : "측정 시작"}
      </button>
    </div>
  );
}
