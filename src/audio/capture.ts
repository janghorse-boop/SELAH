import type { Spectrum } from "../analysis/types";
import { checkConstraints, type ConstraintReport } from "./constraints";
import { micConstraints } from "./devices";

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
  if (name === "OverconstrainedError" || name === "NotReadableError") {
    return {
      kind: "deviceGone",
      message: "고른 마이크를 찾을 수 없습니다. 연결을 확인하거나 설정에서 다시 고르십시오.",
    };
  }
  return { kind: "unknown", message: "마이크를 여는 중 알 수 없는 문제가 생겼습니다." };
}

/** 두 프레임 이상 건너뛰었으면 끊긴 것으로 본다(백그라운드 전환 등). */
export function isInterrupt(elapsedMs: number): boolean {
  return elapsedMs > FRAME_MS * 3;
}

/** https 가 아니면 마이크를 열 수 없다. 던져진 오류가 아니라 사전 점검이라 따로 둔다. */
export const INSECURE_ERROR: CaptureError = {
  kind: "insecure",
  message: "이 주소에서는 마이크를 열 수 없습니다. https:// 로 시작하는 주소로 접속하십시오.",
};

/**
 * bin 하나가 몇 Hz 인가. 모든 주파수 계산이 여기서 나오므로
 * 나누기를 뒤집으면 전 대역이 조용히 어긋난다.
 */
export function binHzFor(sampleRate: number, fftSize: number): number {
  return sampleRate / fftSize;
}

export type CaptureErrorKind = "insecure" | "denied" | "nodevice" | "lost" | "deviceGone" | "unknown";

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
  /** 실제로 열린 기기. 고른 기기와 다르면 호출한 쪽이 화면에 알려야 한다. */
  device: { deviceId: string; deviceLabel: string };
};

export async function startCapture(
  cb: CaptureCallbacks,
  deviceId: string | null = null,
): Promise<CaptureHandle> {
  if (!navigator.mediaDevices?.getUserMedia) {
    cb.onError(INSECURE_ERROR.kind, INSECURE_ERROR.message);
    throw new Error(INSECURE_ERROR.message);
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(micConstraints(deviceId));
  } catch (e) {
    const { kind, message } = toCaptureError(e);
    cb.onError(kind, message);
    throw e;
  }

  // 여기서부터는 마이크가 이미 켜져 있다. 중간에 실패하면 반드시 꺼야 한다 —
  // 안 끄면 호출한 쪽은 handle 조차 못 받으므로 멈출 방법이 없고,
  // 폰의 녹음 표시가 켜진 채로 남는다.
  let track: MediaStreamTrack;
  let report: ConstraintReport;
  let ctx: AudioContext;
  let analyser: AnalyserNode;
  try {
    track = stream.getAudioTracks()[0];
    report = checkConstraints(track.getSettings());

    ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0; // 평활은 우리가 직접 한다
    source.connect(analyser);
    // analyser 를 destination 에 연결하지 않는다 — 소리를 되돌려보내면 그 자체가 하울링이다
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    const { kind, message } = toCaptureError(e);
    cb.onError(kind, message);
    throw e;
  }

  const buffer = new Float32Array(analyser.frequencyBinCount);
  const binHz = binHzFor(ctx.sampleRate, FFT_SIZE);

  let stopped = false;
  let lastFrameAt = performance.now();

  const timer = setInterval(() => {
    if (stopped) return;

    const now = performance.now();
    const elapsed = now - lastFrameAt;
    // 두 프레임 이상 건너뛰었으면 끊긴 것으로 본다 (백그라운드 전환 등)
    if (isInterrupt(elapsed)) cb.onInterrupt(elapsed);
    lastFrameAt = now;

    try {
      analyser.getFloatFrequencyData(buffer);
      cb.onFrame({ db: buffer, binHz });
    } catch (e) {
      // setInterval 은 예외가 나도 멈추지 않는다. 그냥 두면 같은 오류를
      // 초당 30번 영원히 던지면서 화면에는 아무 말도 안 나온다.
      cb.onError("unknown", "분석 중 문제가 생겨 측정을 멈췄습니다.");
      stop();
    }
  }, FRAME_MS);

  track.addEventListener("ended", () => {
    // 우리가 부른 stop() 때문에 온 것이면 「연결이 끊겼다」가 아니다.
    // 표준상 stop() 은 ended 를 쏘지 않게 되어 있지만, 표준을 안 지키는
    // 브라우저에서도 안전하도록 막아 둔다.
    if (stopped) return;
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

  const openedSettings = track.getSettings();
  return {
    stop,
    report,
    sampleRate: ctx.sampleRate,
    device: { deviceId: openedSettings.deviceId ?? "", deviceLabel: track.label },
  };
}
