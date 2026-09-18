import { useCallback, useRef, useState } from "react";
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
  });

  const handleRef = useRef<CaptureHandle | null>(null);
  const detectorRef = useRef<HowlDetector | null>(null);
  const startedAtRef = useRef(0);
  const lastHowlAtRef = useRef(0);
  const adviceTimerRef = useRef<number | null>(null);
  const howlsRef = useRef<HowlRecord[]>([]);
  const gapsRef = useRef<Gap[]>([]);
  const peakRef = useRef<number[]>([]);
  const sumRef = useRef<number[]>([]);
  const countRef = useRef(0);

  const start = useCallback(async () => {
    if (handleRef.current) return;

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
          const raw = spectrumToBands(s, settings.bandPlan);
          const bands = settings.calibrationDb === null
            ? raw
            : raw.map((v) => v + settings.calibrationDb!);

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

          setState((prev) => ({
            ...prev,
            bands,
            elapsedMs: Date.now() - startedAtRef.current,
            howls: [...howlsRef.current],
            gaps: [...gapsRef.current],
            ...(advice ? { advice } : {}),
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
        },
        onInterrupt: (durationMs) => {
          gapsRef.current.push({
            atMs: Date.now() - startedAtRef.current,
            durationMs: Math.round(durationMs),
          });
          // 끊긴 동안의 이력은 믿을 수 없다
          detectorRef.current?.reset();
        },
      });

      handleRef.current = h;
      setState((p) => ({ ...p, running: true, error: null, warning: h.report.message }));
    } catch {
      /* onError 에서 이미 알렸다 */
    }
  }, [settings, mode]);

  const stop = useCallback((): Session | null => {
    const h = handleRef.current;
    if (!h) return null;
    h.stop();
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

    saveSession(session);
    setState((p) => ({ ...p, running: false, advice: null }));
    return session;
  }, [mode, settings]);

  return { ...state, start, stop };
}
