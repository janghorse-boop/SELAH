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
    // 이미 누르고 있는 중이면 새 타이머를 만들지 않는다.
    // 덮어쓰면 앞 타이머의 id 를 잃어 취소할 수 없고, 손을 뗀 뒤에도
    // 1.2초 뒤에 감시가 멈춘다. 폰이 주머니에 있으면 천과 살이
    // 동시에 닿아 실제로 일어난다.
    if (timerRef.current !== null) return;
    setPressing(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      a.stop();
      onExit();
    }, LONG_PRESS_MS);
  }

  function up() {
    setPressing(false);
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  const minutes = Math.floor(a.elapsedMs / 60000);

  return (
    <div
      className="flex min-h-screen select-none flex-col bg-black px-4 py-5 text-white"
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={up}
      // 브라우저가 제스처를 가져가면(가장자리 스와이프, 전화 수신 등)
      // pointerup 이 오지 않는다. 이걸 안 받으면 누름 표시가 켜진 채 남고
      // 예약된 정지가 그대로 실행된다.
      onPointerCancel={up}
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
          <div className="mt-1 text-xs text-neutral-500">{minutes}분 감시 중</div>
        </div>
      )}

      {a.warning && (
        <div className="mt-4 rounded border border-amber-700/50 px-3 py-2 text-[11px] text-amber-400">
          ⚠ {a.warning}
        </div>
      )}
      {wake.status === "unavailable" && (
        // 「기능이 없다」와 「요청이 거부됐다」를 한 문구로 다룬다 —
        // 사용자에게 중요한 것은 이유가 아니라 「화면이 꺼질 수 있다」는 사실이다.
        // 경고문이므로 읽혀야 한다. 검은 배경 위 neutral-400 은 8.3:1 로 기준을 넘는다.
        <div className="mt-2 text-center text-[11px] text-neutral-400">
          화면 꺼짐 방지를 걸지 못했습니다. 화면이 꺼지면 감시가 멈춥니다.
        </div>
      )}

      <div className="mt-auto">
        {a.deviceLabel && (
          <div className="mb-1 text-center text-[10px] text-neutral-600">{a.deviceLabel}</div>
        )}
        <BandMeter
          bands={a.bands}
          plan={settings.bandPlan}
          variant="strip"
          highlightHz={a.advice?.bandHz ?? null}
          offsetDb={settings.calibrationDb ?? 0}
        />
        {/*
          이 한 줄이 「멈추는 방법」을 알려주는 유일한 문장이라 반드시 읽혀야 한다.
          검정 위 neutral-600 은 2.7:1 로 기준(4.5) 미달이고 neutral-500 도 4.4 로 모자란다.
          neutral-400 은 8.3:1 — 여전히 회색이라 어두운 예배당에서 눈부시지 않다.
        */}
        <div className="mt-3 text-center text-[11px] text-neutral-400">
          {pressing ? "계속 누르고 계세요…" : "화면을 길게 눌러 감시를 멈춥니다"}
        </div>
      </div>
    </div>
  );
}
