import { MIC_CONSTRAINTS } from "./constraints";

export type AudioInput = { deviceId: string; label: string };

/** 「시스템 기본」. 설정에 이 값이 저장돼 있으면 deviceId 를 지정하지 않는다. */
export const SYSTEM_DEFAULT_ID = "";

/**
 * 브라우저는 마이크 권한을 한 번 허용하기 전까지 label 을 빈 문자열로 준다.
 * 이름을 지어내지 말고 번호로 부른다 — 화면에서 그 사정을 따로 안내한다.
 */
export function labelFor(info: { deviceId: string; label: string }, index: number): string {
  const label = info.label.trim();
  return label.length > 0 ? label : `마이크 ${index + 1}`;
}

/**
 * 저장해 둔 기기가 지금도 있으면 그것을, 아니면 null(시스템 기본)을 준다.
 * **사라진 기기를 다른 기기로 말없이 바꾸지 않는다** — 호출한 쪽이 그 사실을
 * 알고 화면에 띄워야 한다.
 */
export function pickDevice(inputs: AudioInput[], savedId: string | null): AudioInput | null {
  if (!savedId || savedId === SYSTEM_DEFAULT_ID) return null;
  return inputs.find((d) => d.deviceId === savedId) ?? null;
}

/** 기기를 고르면 exact 로 지정한다 — 없으면 실패해야 하고, 몰래 넘어가면 안 된다. */
export function micConstraints(deviceId: string | null): MediaStreamConstraints {
  const base = MIC_CONSTRAINTS.audio as MediaTrackConstraints;
  return {
    audio: deviceId ? { ...base, deviceId: { exact: deviceId } } : { ...base },
    video: false,
  };
}

/** 입력 기기 목록. 권한 전에는 이름이 비어 있을 수 있다. */
export async function listAudioInputs(): Promise<AudioInput[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return all
      .filter((d) => d.kind === "audioinput")
      .map((d) => ({ deviceId: d.deviceId, label: d.label }));
  } catch {
    // 아이폰 사파리 등. 목록을 못 얻어도 측정 자체는 기본 기기로 계속된다.
    return [];
  }
}

/** 기기가 꽂히거나 빠지면 부른다. 해제 함수를 돌려준다. */
export function onDeviceChange(cb: () => void): () => void {
  const md = navigator.mediaDevices;
  if (!md?.addEventListener) return () => {};
  md.addEventListener("devicechange", cb);
  return () => md.removeEventListener("devicechange", cb);
}
