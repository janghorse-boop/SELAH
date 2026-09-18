/**
 * 이 세 개를 끄지 않으면 큰 소리가 날 때 폰이 알아서 감도를 낮춰
 * 그래프가 거짓말을 한다. 요청만 하지 말고 적용 여부를 반드시 확인한다.
 */
export const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  },
  video: false,
};

export type ConstraintReport = {
  applied: boolean;
  notApplied: string[];
  message: string | null;
};

const LABELS: Array<[keyof MediaTrackSettings, string]> = [
  ["echoCancellation", "에코 제거"],
  ["noiseSuppression", "노이즈 억제"],
  ["autoGainControl", "자동 음량 조절"],
];

/**
 * 목록을 「A·B·C을/를」로 잇는다. 마지막 낱말의 받침에 따라 조사가 갈린다 —
 * 「자동 음량 조절을」은 맞고 「자동 음량 조절를」은 틀린 한국어다.
 */
function listed(items: string[]): string {
  const joined = items.join("·");
  const last = joined.charCodeAt(joined.length - 1);
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  const hasBatchim = isHangul && (last - 0xac00) % 28 !== 0;
  return joined + (hasBatchim ? "을" : "를");
}

/**
 * track.getSettings() 결과를 보고 실제로 꺼졌는지 판정한다.
 * 값이 undefined 면 「모른다」가 아니라 「켜져 있다」로 본다 —
 * 모르는 채로 정확한 척하는 것이 가장 나쁘다.
 */
export function checkConstraints(settings: MediaTrackSettings): ConstraintReport {
  const notApplied = LABELS.filter(([key]) => settings[key] !== false).map(([, label]) => label);

  return {
    applied: notApplied.length === 0,
    notApplied,
    message:
      notApplied.length === 0
        ? null
        : `이 브라우저에서 ${listed(notApplied)} 끄지 못했습니다. 수치가 흔들릴 수 있습니다.`,
  };
}
