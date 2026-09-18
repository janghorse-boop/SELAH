import { useEffect, useRef, useState } from "react";
import { useAnalyzer } from "../hooks/useAnalyzer";
import { useWakeLock } from "../hooks/useWakeLock";
import { BandMeter } from "../components/BandMeter";
import { HowlCard } from "../components/HowlCard";
import type { Settings } from "../../storage/settings";

/** 잘못 눌러 꺼지지 않도록 길게 눌러야 멈춘다. */
const LONG_PRESS_MS = 1200;

export function WorshipScreen({
  settings,
  onExit,
}: {
  settings: Settings;
  onExit: () => void;
}) {
  const a = useAnalyzer(settings, "worship");
  const wake = useWakeLock(a.running);
  const [pressing, setPressing] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    void a.start();
    // 여기서 a.stop() 을 부르지 않는다. stop() 은 **세션을 저장한다** —
    // 화면을 나가는 것만으로 기록이 남으면 의도도 확인도 없이 저장되는 셈이다.
    // 마이크는 useAnalyzer 자신의 정리 효과가 끈다. 저장은 길게 눌러 멈출 때만 한다.
    // 화면에 들어올 때 한 번만 시작한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 누르는 중에 화면이 사라지면(예: 다른 경로로 나가짐) 남은 타이머가 나중에
  // 터져 이미 없는 화면에서 stop()·onExit() 을 부르지 않도록 정리한다.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function down() {
    setPressing(true);
    timerRef.current = window.setTimeout(() => {
      a.stop();
      onExit();
    }, LONG_PRESS_MS);
  }

  function up() {
    setPressing(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  const minutes = Math.floor(a.elapsedMs / 60000);

  return (
    <div
      className="flex min-h-screen select-none flex-col bg-black px-4 py-5 text-white"
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={up}
    >
      {a.error ? (
        <div className="m-auto text-center text-red-400">{a.error}</div>
      ) : a.advice ? (
        <div className="mt-6">
          <HowlCard advice={a.advice} size="large" showParametric={settings.showParametric} />
        </div>
      ) : (
        <div className="mt-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-green-700 shadow-[0_0_28px_#15803d]" />
          <div className="mt-3 text-lg font-semibold text-green-500">정상</div>
          <div className="mt-1 text-xs text-neutral-600">{minutes}분 감시 중</div>
        </div>
      )}

      {a.warning && (
        <div className="mt-4 rounded border border-amber-700/50 px-3 py-2 text-[11px] text-amber-400">
          ⚠ {a.warning}
        </div>
      )}
      {!wake.supported && (
        <div className="mt-2 text-center text-[11px] text-neutral-600">
          이 브라우저는 화면 꺼짐 방지를 지원하지 않습니다. 화면이 꺼질 수 있습니다.
        </div>
      )}

      <div className="mt-auto">
        <BandMeter
          bands={a.bands}
          plan={settings.bandPlan}
          variant="strip"
          highlightHz={a.advice?.bandHz ?? null}
        />
        <div className="mt-3 text-center text-[11px] text-neutral-600">
          {pressing ? "계속 누르고 계세요…" : "화면을 길게 눌러 감시를 멈춥니다"}
        </div>
      </div>
    </div>
  );
}
