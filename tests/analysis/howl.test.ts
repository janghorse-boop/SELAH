import { describe, it, expect } from "vitest";
import { HowlDetector, SENSITIVITY } from "../../src/analysis/howl";
import { tonePeak, harmonicTone, pinkNoise } from "../helpers/signals";

/** n 프레임 동안 같은 주파수의 봉우리가 startDb → endDb 로 자란다. */
function feedGrowing(d: HowlDetector, hz: number, n: number, startDb: number, endDb: number) {
  let last = null;
  for (let i = 0; i < n; i++) {
    const db = startDb + ((endDb - startDb) * i) / Math.max(1, n - 1);
    last = d.push(tonePeak(hz, db, -100));
  }
  return last;
}

describe("감도 설정", () => {
  it("세 감도의 여섯 값이 모두 정확하다", () => {
    // 몇 개만 찍으면 나머지가 틀려도 통과한다. toEqual 로 전수 대조하면
    // 값이 바뀐 것도, 없어야 할 필드가 생긴 것도 함께 잡힌다.
    expect(SENSITIVITY.low).toEqual({
      pnprMin: 18, paprMin: 23, phprMin: 15, shprMin: 15, holdMs: 700, frames: 21,
    });
    expect(SENSITIVITY.normal).toEqual({
      pnprMin: 15, paprMin: 20, phprMin: 15, shprMin: 15, holdMs: 500, frames: 15,
    });
    expect(SENSITIVITY.high).toEqual({
      pnprMin: 12, paprMin: 17, phprMin: 15, shprMin: 15, holdMs: 350, frames: 11,
    });
  });
});

describe("하울링 판정", () => {
  it("한 프레임만으로는 절대 판정하지 않는다", () => {
    const d = new HowlDetector("normal");
    expect(d.push(tonePeak(3184, -20, -100))).toBeNull();
  });

  it("창이 다 차기 직전까지는 판정하지 않는다 (경계)", () => {
    // 「1프레임으로는 안 된다」만으로는 문턱이 3이든 13이든 통과한다.
    // n-1 에서 null, n 에서 판정으로 경계를 정확히 못 박는다.
    const d = new HowlDetector("normal");
    const n = SENSITIVITY.normal.frames;
    let got = null;
    for (let i = 0; i < n - 1; i++) got = d.push(tonePeak(3184, -40 + i, -100));
    expect(got).toBeNull();
    expect(d.push(tonePeak(3184, -40 + (n - 1), -100))).not.toBeNull();
  });

  it("전체 추세로 판단한다 (마지막 한 프레임만 보지 않는다)", () => {
    // 쭉 줄다가 마지막에 한 번 튀는 소리.
    // 최소제곱 기울기는 -1.28 로 음수 → 하울링 아님(올바름).
    // 「마지막 - 처음」으로 재면 +1 → 하울링으로 오판한다.
    // 이 테스트가 없으면 slope() 를 그 지름길로 바꿔도 아무도 모른다 —
    // 다른 테스트는 전부 한 방향으로만 변하는 신호라 두 방식이 같은 답을 낸다.
    const d = new HowlDetector("normal");
    const levels = [-20, -22, -24, -26, -28, -30, -32, -34, -36, -38, -40, -42, -44, -46, -19];
    let got = null;
    for (const db of levels) got = d.push(tonePeak(3184, db, -100));
    expect(got).toBeNull();
  });

  it("같은 주파수에서 자라며 지속되면 하울링이다", () => {
    const d = new HowlDetector("normal");
    const got = feedGrowing(d, 3184, 20, -40, -20);
    expect(got).not.toBeNull();
    expect(got!.hz).toBeCloseTo(3184, -1);
    expect(got!.prominence).toBeGreaterThan(15);
  });

  it("배음이 있는 소리(목소리 흉내)는 하울링이 아니다", () => {
    const d = new HowlDetector("normal");
    let got = null;
    for (let i = 0; i < 30; i++) {
      got = d.push(harmonicTone(220, -40 + i * 0.7, -100));
    }
    expect(got).toBeNull();
  });

  it("음정이 움직이면 하울링이 아니다", () => {
    const d = new HowlDetector("normal");
    let got = null;
    for (let i = 0; i < 30; i++) {
      got = d.push(tonePeak(2000 + i * 40, -40 + i * 0.7, -100));
    }
    expect(got).toBeNull();
  });

  it("레벨이 줄어들면 하울링이 아니다", () => {
    const d = new HowlDetector("normal");
    const got = feedGrowing(d, 3184, 20, -20, -45);
    expect(got).toBeNull();
  });

  it("봉우리가 없는 핑크노이즈에서는 아무것도 나오지 않는다", () => {
    const d = new HowlDetector("normal");
    let got = null;
    for (let i = 0; i < 30; i++) got = d.push(pinkNoise(-40));
    expect(got).toBeNull();
  });

  it("reset 하면 쌓인 이력이 사라진다", () => {
    const d = new HowlDetector("normal");
    feedGrowing(d, 3184, 20, -40, -20);
    d.reset();
    expect(d.push(tonePeak(3184, -20, -100))).toBeNull();
  });

  it("감도 high 는 normal 보다 적은 프레임으로 잡는다", () => {
    const hi = new HowlDetector("high");
    const no = new HowlDetector("normal");
    expect(feedGrowing(hi, 3184, 12, -40, -22)).not.toBeNull();
    expect(feedGrowing(no, 3184, 12, -40, -22)).toBeNull();
  });
});
