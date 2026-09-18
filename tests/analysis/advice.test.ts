import { describe, it, expect } from "vitest";
import { toCutAdvice } from "../../src/analysis/advice";
import type { HowlCandidate } from "../../src/analysis/types";

const at = (hz: number, prominence: number): HowlCandidate => ({ hz, db: -20, prominence });

describe("컷 권고량", () => {
  it("prominence 15dB 면 3dB 컷", () => {
    expect(toCutAdvice(at(3184, 15), 31).cutDb).toBe(3);
  });

  it("prominence 18dB 면 6dB 컷", () => {
    expect(toCutAdvice(at(3184, 18), 31).cutDb).toBe(6);
  });

  it("prominence 21dB 라도 6dB 를 넘지 않는다", () => {
    expect(toCutAdvice(at(3184, 21), 31).cutDb).toBe(6);
  });

  it("prominence 40dB 라도 6dB 를 넘지 않는다", () => {
    expect(toCutAdvice(at(3184, 40), 31).cutDb).toBe(6);
  });

  it("prominence 가 낮아도 3dB 아래로 내려가지 않는다", () => {
    expect(toCutAdvice(at(3184, 12), 31).cutDb).toBe(3);
  });
});

describe("슬라이더 이름", () => {
  it("31밴드면 3150 슬라이더", () => {
    const a = toCutAdvice(at(3184, 18), 31);
    expect(a.bandHz).toBe(3150);
    expect(a.exactHz).toBe(3184);
  });

  it("10밴드면 같은 주파수가 4000 슬라이더", () => {
    expect(toCutAdvice(at(3184, 18), 10).bandHz).toBe(4000);
  });
});

describe("좁은 밴드 경고", () => {
  it("31밴드에서는 경고가 없다", () => {
    expect(toCutAdvice(at(3184, 18), 31).wideBandWarning).toBeNull();
  });

  it("15밴드에서는 경고가 있다", () => {
    const w = toCutAdvice(at(3184, 18), 15).wideBandWarning;
    expect(w).not.toBeNull();
    expect(w).toContain("함께 내려갑니다");
  });

  it("10밴드에서도 경고가 있다", () => {
    expect(toCutAdvice(at(3184, 18), 10).wideBandWarning).not.toBeNull();
  });
});

describe("파라메트릭 EQ 용 Q", () => {
  it("Q 는 8 이다", () => {
    expect(toCutAdvice(at(3184, 18), 31).q).toBe(8);
  });
});
