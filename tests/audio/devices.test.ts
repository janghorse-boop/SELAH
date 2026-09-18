import { describe, it, expect } from "vitest";
import { labelFor, pickDevice, micConstraints, SYSTEM_DEFAULT_ID } from "../../src/audio/devices";
import type { AudioInput } from "../../src/audio/devices";

describe("기기 이름", () => {
  it("이름이 있으면 그대로 쓴다", () => {
    expect(labelFor({ deviceId: "a", label: "USB Audio CODEC" }, 0)).toBe("USB Audio CODEC");
  });

  it("권한 전이라 이름이 비어 있으면 번호로 부른다", () => {
    // 브라우저는 마이크 권한을 한 번 허용하기 전까지 label 을 빈 문자열로 준다.
    // 이름을 지어내면 안 되고, 번호로 부르되 화면에서 그 사정을 안내한다.
    expect(labelFor({ deviceId: "a", label: "" }, 0)).toBe("마이크 1");
    expect(labelFor({ deviceId: "b", label: "" }, 2)).toBe("마이크 3");
  });

  it("공백뿐인 이름도 비어 있는 것으로 본다", () => {
    expect(labelFor({ deviceId: "a", label: "   " }, 0)).toBe("마이크 1");
  });
});

describe("기기 고르기", () => {
  const inputs: AudioInput[] = [
    { deviceId: "built-in", label: "내장 마이크" },
    { deviceId: "usb-1", label: "USB Audio CODEC" },
  ];

  it("저장해 둔 기기가 있으면 그것을 고른다", () => {
    expect(pickDevice(inputs, "usb-1")?.deviceId).toBe("usb-1");
  });

  it("저장된 것이 없으면 null — 시스템 기본을 쓴다", () => {
    expect(pickDevice(inputs, null)).toBeNull();
  });

  it("시스템 기본을 고른 상태도 null 이다", () => {
    expect(pickDevice(inputs, SYSTEM_DEFAULT_ID)).toBeNull();
  });

  it("저장해 둔 기기가 사라졌으면 null 을 준다 — 몰래 다른 기기를 고르지 않는다", () => {
    // 외부 마이크를 뽑은 상태. 내장으로 말없이 넘어가면
    // 사용자는 외부로 재고 있다고 믿은 채 다른 숫자를 본다.
    // 여기서 null 을 주고, 화면에서 「기기가 바뀌었다」를 알린다.
    expect(pickDevice(inputs, "usb-gone")).toBeNull();
  });

  it("목록이 비어 있어도 던지지 않는다", () => {
    expect(pickDevice([], "usb-1")).toBeNull();
  });
});

describe("마이크 제약 — 기기 지정", () => {
  it("기기를 안 고르면 deviceId 를 넣지 않는다", () => {
    const a = micConstraints(null).audio as MediaTrackConstraints;
    expect(a.deviceId).toBeUndefined();
    expect(a.autoGainControl).toBe(false);
  });

  it("기기를 고르면 exact 로 지정한다", () => {
    // exact 여야 「없으면 실패」한다. 없을 때 몰래 다른 기기로 넘어가면 안 된다.
    const a = micConstraints("usb-1").audio as MediaTrackConstraints;
    expect(a.deviceId).toEqual({ exact: "usb-1" });
  });

  it("기기를 골라도 처리 3종은 그대로 끈다", () => {
    const a = micConstraints("usb-1").audio as MediaTrackConstraints;
    expect(a.echoCancellation).toBe(false);
    expect(a.noiseSuppression).toBe(false);
    expect(a.autoGainControl).toBe(false);
  });
});
