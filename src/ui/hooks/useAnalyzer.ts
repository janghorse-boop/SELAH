import { useCallback, useEffect, useRef, useState } from "react";
import { startCapture, type CaptureHandle } from "../../audio/capture";
import { spectrumToBands, bandCenters } from "../../analysis/bands";
import { HowlDetector } from "../../analysis/howl";
import { toCutAdvice } from "../../analysis/advice";
import type { CutAdvice } from "../../analysis/types";
import type { Settings } from "../../storage/settings";
import {
  newSessionId,
  saveSession,
  type Gap,
  type HowlRecord,
  type Session,
} from "../../storage/sessions";

/** 같은 하울링을 계속 다시 알리지 않는다. 이 시간 안에는 한 번만. */
const REPEAT_SUPPRESS_MS = 5000;
/** 경고를 화면에 띄워 두는 시간. */
const ADVICE_HOLD_MS = 4000;

export type AnalyzerState = {
  running: boolean;
  bands: number[];
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

export function useAnalyzer(settings: Settings, mode: "rehearsal" | "worship") {
  const [state, setState] = useState<AnalyzerState>({
    running: false,
    bands: [],
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
  /** 측정이 시작된 적이 있는가. 오류로 캡처가 죽은 뒤에도 기록은 살아 있다. */
  const startedRef = useRef(false);
  /** 시작 세대. await 뒤에 「내가 아직 그 세대인가」를 확인한다.
   *  불리언은 다시 마운트되면 되살아나 두 마이크가 열릴 수 있다. */
  const genRef = useRef(0);
  const detectorRef = useRef<HowlDetector | null>(null);
  const startedAtRef = useRef(0);
  const lastHowlAtRef = useRef(0);
  const adviceTimerRef = useRef<number | null>(null);
  const howlsRef = useRef<HowlRecord[]>([]);
  const gapsRef = useRef<Gap[]>([]);
  const peakRef = useRef<number[]>([]);
  const sumRef = useRef<number[]>([]);
  const countRef = useRef(0);

  // 화면이 사라질 때 자원을 확실히 놓는다. 세션 저장은 하지 않는다 —
  // 저장은 화면이 stop() 을 부를 때만 한다. 여기서는 마이크와 타이머만 끈다.
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

    const centers = bandCenters(settings.bandPlan);
    detectorRef.current = new HowlDetector(settings.sensitivity);
    startedAtRef.current = Date.now();
    lastHowlAtRef.current = 0;
    howlsRef.current = [];
    gapsRef.current = [];
    peakRef.current = new Array(centers.length).fill(-Infinity);
    sumRef.current = new Array(centers.length).fill(0);
    countRef.current = 0;

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

          // 리허설 모드에서만 통계를 쌓는다
          if (mode === "rehearsal") {
            for (let i = 0; i < bands.length; i++) {
              if (bands[i] > peakRef.current[i]) peakRef.current[i] = bands[i];
              sumRef.current[i] += bands[i];
            }
            countRef.current += 1;
          }

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
      startedRef.current = true;
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
  }, [settings, mode]);

  const stop = useCallback((): { session: Session; saved: boolean } | null => {
    // handleRef 가 아니라 startedRef 를 본다. 오류로 캡처가 죽으면
    // handleRef 는 null 이지만 그때까지 쌓인 기록은 버리면 안 된다.
    if (!startedRef.current) return null;
    startedRef.current = false;
    handleRef.current?.stop();
    handleRef.current = null;
    if (adviceTimerRef.current) clearTimeout(adviceTimerRef.current);

    const session: Session = {
      id: newSessionId(),
      startedAt: startedAtRef.current,
      endedAt: Date.now(),
      mode,
      bandPlan: settings.bandPlan,
      calibrationDb: settings.calibrationDb,
      howls: howlsRef.current,
      gaps: gapsRef.current,
      ...(mode === "rehearsal" && countRef.current > 0
        ? {
            bandPeak: peakRef.current.map((v) => Math.round(v * 10) / 10),
            bandAvg: sumRef.current.map((v) => Math.round((v / countRef.current) * 10) / 10),
          }
        : {}),
    };

    const saved = saveSession(session);
    setState((p) => ({ ...p, running: false, advice: null }));
    return { session, saved };
  }, [mode, settings]);

  return { ...state, start, stop };
}
