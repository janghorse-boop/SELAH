import type { Spectrum } from "../analysis/types";
import { MIC_CONSTRAINTS, checkConstraints, type ConstraintReport } from "./constraints";

export const FFT_SIZE = 16384;
export const FRAME_MS = 1000 / 30;

/**
 * 아래 두 함수는 브라우저를 타지 않는 순수 계산이라 테스트된다.
 * 마이크 자체는 사람이 권한을 눌러야 열리므로 자동 검증이 불가능하다 —
 * 그래서 판단이 들어가는 부분만 밖으로 빼서 시험 가능하게 둔다.
 */

export type CaptureError = { kind: CaptureErrorKind; message: string };

/** getUserMedia 가 던진 것을 사용자에게 보여줄 안내로 바꾼다. */
export function toCaptureError(e: unknown): CaptureError {
  const name = (e as DOMException | undefined)?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return {
      kind: "denied",
      message: "마이크 사용이 허용되지 않았습니다. 브라우저 주소창의 자물쇠에서 마이크를 허용해 주십시오.",
    };
  }
  if (name === "NotFoundError") {
    return { kind: "nodevice", message: "마이크를 찾지 못했습니다." };
  }
  return { kind: "unknown", message: "마이크를 여는 중 알 수 없는 문제가 생겼습니다." };
}

/** 두 프레임 이상 건너뛰었으면 끊긴 것으로 본다(백그라운드 전환 등). */
export function isInterrupt(elapsedMs: number): boolean {
  return elapsedMs > FRAME_MS * 3;
}

export type CaptureErrorKind = "insecure" | "denied" | "nodevice" | "lost" | "unknown";

export type CaptureCallbacks = {
  onFrame: (s: Spectrum) => void;
  onError: (kind: CaptureErrorKind, message: string) => void;
  /** 백그라운드 전환 등으로 끊겼다가 돌아왔을 때. 끊긴 길이(ms). */
  onInterrupt: (durationMs: number) => void;
};

export type CaptureHandle = {
  stop: () => void;
  report: ConstraintReport;
  sampleRate: number;
};

export async function startCapture(cb: CaptureCallbacks): Promise<CaptureHandle> {
  if (!navigator.mediaDevices?.getUserMedia) {
    const msg = "이 주소에서는 마이크를 열 수 없습니다. https:// 로 시작하는 주소로 접속하십시오.";
    cb.onError("insecure", msg);
    throw new Error(msg);
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
  } catch (e) {
    const { kind, message } = toCaptureError(e);
    cb.onError(kind, message);
    throw e;
  }

  const track = stream.getAudioTracks()[0];
  const report = checkConstraints(track.getSettings());

  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = 0; // 평활은 우리가 직접 한다
  source.connect(analyser);
  // analyser 를 destination 에 연결하지 않는다 — 소리를 되돌려보내면 그 자체가 하울링이다

  const buffer = new Float32Array(analyser.frequencyBinCount);
  const binHz = ctx.sampleRate / FFT_SIZE;

  let stopped = false;
  let lastFrameAt = performance.now();

  const timer = setInterval(() => {
    if (stopped) return;

    const now = performance.now();
    const elapsed = now - lastFrameAt;
    // 두 프레임 이상 건너뛰었으면 끊긴 것으로 본다 (백그라운드 전환 등)
    if (isInterrupt(elapsed)) cb.onInterrupt(elapsed);
    lastFrameAt = now;

    analyser.getFloatFrequencyData(buffer);
    cb.onFrame({ db: buffer, binHz });
  }, FRAME_MS);

  track.addEventListener("ended", () => {
    cb.onError("lost", "마이크 연결이 끊겼습니다. 측정을 멈췄습니다.");
    stop();
  });

  function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    track.stop();
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
  }

  return { stop, report, sampleRate: ctx.sampleRate };
}
