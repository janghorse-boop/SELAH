import { useEffect, useState } from "react";
import { useAnalyzer } from "../hooks/useAnalyzer";
import { BandMeter } from "../components/BandMeter";
import { HowlCard } from "../components/HowlCard";
import { WarningBadge } from "../components/WarningBadge";
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
  const a = useAnalyzer(settings, "rehearsal");
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    void a.start();
    return () => {
      a.stop();
    };
    // 화면에 들어올 때 한 번만 시작한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    a.stop();
    setEnded(true);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">리허설 모드</h1>
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

      <div className="mb-3 min-h-[92px]">
        {a.advice ? (
          <HowlCard advice={a.advice} size="large" showParametric={settings.showParametric} />
        ) : (
          <div className="flex h-[92px] items-center justify-center rounded-xl border border-dashed border-neutral-300 text-sm text-neutral-400">
            하울링 없음 · 감시 중
          </div>
        )}
      </div>

      <BandMeter
        bands={a.bands}
        plan={settings.bandPlan}
        variant="tall"
        highlightHz={a.advice?.bandHz ?? null}
        highlightRange={highlightRange}
      />

      <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
        <span>{Math.floor(a.elapsedMs / 60000)}분 감시 · 하울링 {a.howls.length}회</span>
        {a.gaps.length > 0 && <span className="text-amber-600">끊김 {a.gaps.length}회</span>}
      </div>

      <button
        className="mt-4 w-full rounded-lg bg-neutral-800 py-3 font-semibold text-white disabled:opacity-40"
        onClick={finish}
        disabled={!a.running}
      >
        측정 끝내고 저장
      </button>

      {ended && <p className="mt-2 text-center text-sm text-green-700">기록에 저장했습니다.</p>}
    </div>
  );
}
