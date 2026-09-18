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

  // 위 다섯 값(12·15·18·21·40)은 전부 경계에 딱 걸려서,
  // 계산식을 clamp(p-12, 3, 6) 같은 단순 뺄셈으로 바꿔도 모두 통과한다.
  // 3dB 단위로 끊는다는 규칙은 중간값으로만 확인된다.
  it("3dB 단위로만 끊는다 — 중간값에서 4나 5가 나오면 안 된다", () => {
    // 16 → round(4/3)=1 → 3.  단순 뺄셈이면 4 가 나온다.
    expect(toCutAdvice(at(3184, 16), 31).cutDb).toBe(3);
    // 17 → round(5/3)=2 → 6.  단순 뺄셈이면 5 가 나온다.
    expect(toCutAdvice(at(3184, 17), 31).cutDb).toBe(6);
  });

  it("어떤 prominence 에서도 3 아니면 6 만 나온다", () => {
    // 권고 폭이 정확히 한 단계라 유효한 답은 둘뿐이다.
    for (let p = 0; p <= 60; p += 1) {
      expect([3, 6]).toContain(toCutAdvice(at(3184, p), 31).cutDb);
    }
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
    const w = toCutAdvice(at(3184, 18), 10).wideBandWarning;
    expect(w).not.toBeNull();
    // 「있는가」만 보면 문구가 엉뚱한 말로 바뀌어도 통과한다.
    expect(w).toContain("함께 내려갑니다");
  });
});

describe("파라메트릭 EQ 용 Q", () => {
  it("Q 는 8 이다", () => {
    expect(toCutAdvice(at(3184, 18), 31).q).toBe(8);
  });
});
