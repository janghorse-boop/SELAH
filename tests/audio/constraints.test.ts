import { describe, it, expect } from "vitest";
import { MIC_CONSTRAINTS, checkConstraints } from "../../src/audio/constraints";

describe("마이크 제약 정의", () => {
  it("세 가지 처리를 모두 끈다", () => {
    const a = MIC_CONSTRAINTS.audio as MediaTrackConstraints;
    expect(a.echoCancellation).toBe(false);
    expect(a.noiseSuppression).toBe(false);
    expect(a.autoGainControl).toBe(false);
    expect(MIC_CONSTRAINTS.video).toBe(false);
  });
});

describe("적용 여부 확인", () => {
  it("셋 다 false 로 적용됐으면 통과", () => {
    const r = checkConstraints({
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    });
    expect(r.applied).toBe(true);
    expect(r.notApplied).toEqual([]);
    expect(r.message).toBeNull();
  });

  it("자동 음량 조절이 켜져 있으면 잡아낸다", () => {
    const r = checkConstraints({
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: true,
    });
    expect(r.applied).toBe(false);
    expect(r.notApplied).toContain("자동 음량 조절");
    // 문구가 「무엇이」 안 꺼졌는지를 실제로 담아야 한다.
    // 항상 세 개를 다 나열하는 문구여도 아래 「수치가 흔들릴…」 검사만으로는 통과한다.
    expect(r.message).toContain("자동 음량 조절");
    expect(r.message).not.toContain("에코 제거");
    expect(r.message).not.toContain("노이즈 억제");
    expect(r.message).toContain("수치가 흔들릴 수 있습니다");
    // 받침이 있으므로 「조절을」이다. 「조절를」은 틀린 한국어다.
    expect(r.message).toContain("자동 음량 조절을 끄지 못했습니다");
  });

  it("브라우저가 값을 알려주지 않아도(undefined) 켜진 것으로 본다", () => {
    const r = checkConstraints({});
    expect(r.applied).toBe(false);
    expect(r.notApplied).toHaveLength(3);
  });

  it("여러 개가 안 꺼졌으면 모두 나열한다", () => {
    const r = checkConstraints({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false,
    });
    expect(r.notApplied).toContain("에코 제거");
    expect(r.notApplied).toContain("노이즈 억제");
    expect(r.notApplied).not.toContain("자동 음량 조절");
    // 마지막 항목이 「억제」(받침 없음)라 여기서는 「를」이 맞다.
    expect(r.message).toContain("에코 제거·노이즈 억제를 끄지 못했습니다");
    expect(r.message).not.toContain("자동 음량 조절");
  });
});
