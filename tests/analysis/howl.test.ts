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
  it("보통은 15프레임(0.5초), 낮음은 21, 높음은 11 이다", () => {
    expect(SENSITIVITY.normal.frames).toBe(15);
    expect(SENSITIVITY.low.frames).toBe(21);
    expect(SENSITIVITY.high.frames).toBe(11);
  });

  it("문턱은 낮음이 가장 높다", () => {
    expect(SENSITIVITY.low.pnprMin).toBe(18);
    expect(SENSITIVITY.normal.pnprMin).toBe(15);
    expect(SENSITIVITY.high.pnprMin).toBe(12);
  });
});

describe("하울링 판정", () => {
  it("한 프레임만으로는 절대 판정하지 않는다", () => {
    const d = new HowlDetector("normal");
    expect(d.push(tonePeak(3184, -20, -100))).toBeNull();
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
