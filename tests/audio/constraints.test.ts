import { describe, it, expect } from "vitest";
import { MIC_CONSTRAINTS, checkConstraints } from "../../src/audio/constraints";

describe("마이크 제약 정의", () => {
  it("세 가지 처리를 모두 끈다", () => {
    const a = MIC_CONSTRAINTS.audio as MediaTrackConstraints;
    expect(a.echoCancellation).toBe(false);
    expect(a.noiseSuppression).toBe(false);
    expect(a.autoGainControl).toBe(false);
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
    expect(r.message).toContain("수치가 흔들릴 수 있습니다");
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
  });
});
