import { useCallback, useEffect, useRef, useState } from "react";
import { startCapture, type CaptureHandle } from "../../audio/capture";
import { spectrumToBands, nextCeilDb, MIN_CEIL_DB } from "../../analysis/bands";
import { HowlDetector } from "../../analysis/howl";
import { toCutAdvice } from "../../analysis/advice";
import type { CutAdvice } from "../../analysis/types";
import type { Settings } from "../../storage/settings";

/** 이번 측정에서 잡힌 하울링 하나. 화면에 보여줄 뿐 저장하지 않는다. */
export type HowlRecord = {
  hz: number;
  bandHz: number;
  atMs: number;
  cutDb: number;
  prominence: number;
};

/** 마이크가 끊겼던 구간. 그동안의 판정은 믿을 수 없다. */
export type Gap = { atMs: number; durationMs: number };

/** 같은 하울링을 계속 다시 알리지 않는다. 이 시간 안에는 한 번만. */
const REPEAT_SUPPRESS_MS = 5000;
/** 경고를 화면에 띄워 두는 시간. */
const ADVICE_HOLD_MS = 4000;

export type AnalyzerState = {
  running: boolean;
  bands: number[];
  /** 막대를 그릴 창의 천장(dB). 소리에 맞춰 따라 움직인다. */
  ceilDb: number;
  advice: CutAdvice | null;
  /** 제약 미적용 등 상시 경고 */
  warning: string | null;
  error: string | null;
  elapsedMs: number;
  howls: HowlRecord[];
  gaps: Gap[];
  /** 실제로 열린 입력 기기 이름. 화면에 「지금 무엇으로 재고 있는지」를 보여준다. */
  deviceLabel: string | null;
};

export function useAnalyzer(settings: Settings) {
  const [state, setState] = useState<AnalyzerState>({
    running: false,
    bands: [],
    ceilDb: MIN_CEIL_DB + (settings.calibrationDb ?? 0),
    advice: null,
    warning: null,
    error: null,
    elapsedMs: 0,
    howls: [],
    gaps: [],
    deviceLabel: null,
  });

  const handleRef = useRef<CaptureHandle | null>(null);
  /**
   * 마이크가 「열리는 중」인지. handleRef 는 await 가 끝나야 채워지므로
   * 그것만으로는 두 번 누르는 것을 못 막는다 — 권한 창이 떠 있는 몇 초 동안
   * 두 호출이 모두 통과해 마이크가 둘 열리고, 하나는 영영 버려진 채
   * 초당 30번 계속 돈다. 화면은 「정지됨」인데 마이크는 살아 있다.
   */
  const startingRef = useRef(false);
  /** 시작 세대. await 뒤에 「내가 아직 그 세대인가」를 확인한다.
   *  불리언은 다시 마운트되면 되살아나 두 마이크가 열릴 수 있다. */
  const genRef = useRef(0);
  const detectorRef = useRef<HowlDetector | null>(null);
  const startedAtRef = useRef(0);
  const lastHowlAtRef = useRef(0);
  const adviceTimerRef = useRef<number | null>(null);
  const howlsRef = useRef<HowlRecord[]>([]);
  const gapsRef = useRef<Gap[]>([]);

  // 화면이 사라질 때 자원을 확실히 놓는다. 마이크와 타이머만 끈다.
  useEffect(() => {
    return () => {
      genRef.current++;
      handleRef.current?.stop();
      handleRef.current = null;
      startingRef.current = false;
      if (adviceTimerRef.current) clearTimeout(adviceTimerRef.current);
    };
  }, []);

  const start = useCallback(async () => {
    // await 앞에서 막아야 한다. 뒤에서 막으면 권한 창이 떠 있는 동안
    // 두 번 눌린 호출이 둘 다 통과한다.
    if (handleRef.current || startingRef.current) return;
    startingRef.current = true;
    setState((p) => ({ ...p, error: null }));
    const gen = ++genRef.current;

    // 천장이 내려갈 수 있는 하한. 보정을 쓰면 막대 값이 통째로 올라가므로
    // 하한도 같이 올린다 — 안 그러면 하한이 무의미해져 조용한 방에서
    // 잡음이 화면을 채운다.
    const minCeilDb = MIN_CEIL_DB + (settings.calibrationDb ?? 0);
    detectorRef.current = new HowlDetector(settings.sensitivity);
    startedAtRef.current = Date.now();
    lastHowlAtRef.current = 0;
    howlsRef.current = [];
    gapsRef.current = [];

    try {
      const h = await startCapture({
        onFrame: (s) => {
          // raw 는 방금 만들어진 것이라 제자리에서 고쳐도 안전하다.
          // 초당 30번 도는 자리라 배열을 한 번 더 만들지 않는다.
          const bands = spectrumToBands(s, settings.bandPlan);
          if (settings.calibrationDb !== null) {
            for (let i = 0; i < bands.length; i++) bands[i] += settings.calibrationDb;
          }
          // 보정값은 막대에만 더한다. 판정에는 원본 s 를 그대로 넘긴다 —
          // 모든 대역에 같은 값을 더하면 어느 봉우리가 튀는지는 그대로지만
          // 문턱 비교가 어긋나, 보정을 넣은 사람과 안 넣은 사람이
          // 같은 예배당에서 다른 결과를 보게 된다.

          const candidate = detectorRef.current!.push(s);
          let advice: CutAdvice | null = null;

          if (candidate) {
            const now = Date.now();
            if (now - lastHowlAtRef.current > REPEAT_SUPPRESS_MS) {
              lastHowlAtRef.current = now;
              advice = toCutAdvice(candidate, settings.bandPlan);
              howlsRef.current.push({
                hz: Math.round(candidate.hz),
                bandHz: advice.bandHz,
                atMs: now - startedAtRef.current,
                cutDb: advice.cutDb,
                prominence: Math.round(candidate.prominence * 10) / 10,
              });
              if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            }
          }

          // howls·gaps 를 프레임마다 복사하지 않는다. 대부분의 프레임에서는
          // 둘 다 안 바뀌는데, 매번 통째로 복사하면 예배가 길어질수록
          // 초당 30번의 O(n) 복사가 되고 폰이 버벅인다.
          // 바뀐 프레임에서만 새 배열을 만든다.
          setState((prev) => ({
            ...prev,
            bands,
            // 천장은 앞 프레임 값에서 이어진다. 따로 ref 를 두지 않고
            // prev 를 쓰면 상태가 한 군데에만 있어 어긋날 일이 없다.
            ceilDb: nextCeilDb(bands, prev.ceilDb, minCeilDb),
            elapsedMs: Date.now() - startedAtRef.current,
            ...(advice ? { advice, howls: [...howlsRef.current] } : {}),
          }));

          if (advice) {
            if (adviceTimerRef.current) clearTimeout(adviceTimerRef.current);
            adviceTimerRef.current = window.setTimeout(
              () => setState((p) => ({ ...p, advice: null })),
              ADVICE_HOLD_MS,
            );
          }
        },
        onError: (_kind, message) => {
          setState((p) => ({ ...p, error: message, running: false }));
          handleRef.current = null;
          startingRef.current = false;
        },
        onInterrupt: (durationMs) => {
          gapsRef.current.push({
            atMs: Date.now() - startedAtRef.current,
            durationMs: Math.round(durationMs),
          });
          // 끊긴 동안의 이력은 믿을 수 없다
          detectorRef.current?.reset();
          // 끊긴 프레임에서만 gaps 를 화면으로 올린다
          setState((p) => ({ ...p, gaps: [...gapsRef.current] }));
        },
      }, settings.deviceId);

      if (gen !== genRef.current) {
        // 기다리는 사이에 화면이 사라졌거나 다시 시작됐다.
        // 지금 붙이면 아무도 멈출 수 없는 마이크가 된다.
        h.stop();
        return;
      }

      const warnings: string[] = [];
      if (h.report.message) warnings.push(h.report.message);
      if (settings.deviceId && h.device.deviceId !== settings.deviceId) {
        // 규격상 { exact } 는 그 기기를 열거나 실패한다 — 다른 기기가 조용히 열리지 않는다.
        // 규격을 안 지키는 브라우저 대비로 남겨 둔 가지다.
        warnings.push(
          `고른 마이크(${settings.deviceLabel ?? "외부 기기"})를 쓸 수 없어 기본 마이크로 재고 있습니다.`,
        );
      }
      handleRef.current = h;
      setState((p) => ({
        ...p,
        running: true,
        error: null,
        // 둘 다 뜰 수 있다. 하나가 다른 하나를 덮으면 「숫자를 믿지 말라」는
        // 경고가 조용히 사라진다.
        warning: warnings.length > 0 ? warnings.join(" ") : null,
        deviceLabel: h.device.deviceLabel || null,
      }));
    } catch {
      /* onError 에서 이미 알렸다 */
    } finally {
      // 성공이든 실패든 「열리는 중」을 반드시 푼다. 안 풀면 다시 시작할 수 없다.
      startingRef.current = false;
    }
  }, [settings]);

  /**
   * 측정을 멈춘다. **아무것도 저장하지 않는다** — 이 앱은 지금 무슨 일이
   * 일어나는지 보여주는 것이 전부다. 저장을 두었더니 「저장했다고 말해
   * 놓고 안 한」 길이 세 번 생겼다.
   */
  const stop = useCallback(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    // 「열리는 중」에 멈췄을 수도 있다. 안 풀면 다시 시작할 수 없다.
    startingRef.current = false;
    // 기다리는 중인 시작이 있다면 붙지 못하게 세대를 넘긴다.
    genRef.current++;
    if (adviceTimerRef.current) clearTimeout(adviceTimerRef.current);
    setState((p) => ({ ...p, running: false, advice: null }));
  }, []);

  return { ...state, start, stop };
}
