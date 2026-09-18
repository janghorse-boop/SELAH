import { describe, it, expect } from "vitest";
import { toCaptureError, isInterrupt, FRAME_MS } from "../../src/audio/capture";

describe("마이크 오류 안내", () => {
  it("권한 거부는 denied 이고, 어떻게 허용하는지 알려준다", () => {
    for (const name of ["NotAllowedError", "SecurityError"]) {
      const r = toCaptureError({ name });
      expect(r.kind).toBe("denied");
      expect(r.message).toContain("허용");
    }
  });

  it("마이크가 없으면 nodevice 다", () => {
    expect(toCaptureError({ name: "NotFoundError" }).kind).toBe("nodevice");
  });

  it("모르는 오류·null·문자열도 던지지 않고 unknown 으로 받는다", () => {
    for (const e of [{ name: "WeirdError" }, null, undefined, "그냥 문자열", new Error("x")]) {
      const r = toCaptureError(e);
      expect(r.kind).toBe("unknown");
      expect(r.message.length).toBeGreaterThan(0);
    }
  });

  it("안내 문구는 종류마다 다르다", () => {
    const msgs = new Set(
      ["NotAllowedError", "NotFoundError", "WeirdError"].map((name) => toCaptureError({ name }).message),
    );
    expect(msgs.size).toBe(3);
  });
});

describe("끊김 판정", () => {
  it("정상 주기는 끊긴 것이 아니다", () => {
    expect(isInterrupt(FRAME_MS)).toBe(false);
    expect(isInterrupt(FRAME_MS * 2)).toBe(false);
  });

  it("세 프레임을 넘기면 끊긴 것이다", () => {
    expect(isInterrupt(FRAME_MS * 3)).toBe(false);   // 경계는 포함하지 않는다
    expect(isInterrupt(FRAME_MS * 3 + 1)).toBe(true);
    expect(isInterrupt(5000)).toBe(true);
  });
});
