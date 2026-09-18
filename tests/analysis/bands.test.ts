import { describe, it, expect } from "vitest";
import {
  bandCenters, bandEdges, spectrumToBands, nearestBand, formatHz, barPct,
  nextCeilDb, METER_SPAN_DB, MIN_CEIL_DB,
} from "../../src/analysis/bands";
import { tonePeak, pinkNoise } from "../helpers/signals";

describe("밴드 정의", () => {
  it("31밴드는 ISO 1/3 옥타브 중심 주파수 31개다", () => {
    const c = bandCenters(31);
    expect(c).toHaveLength(31);
    expect(c[0]).toBe(20);
    expect(c[22]).toBe(3150);
    expect(c[30]).toBe(20000);
  });

  it("15밴드는 15개, 10밴드는 10개다", () => {
    expect(bandCenters(15)).toHaveLength(15);
    expect(bandCenters(10)).toHaveLength(10);
    expect(bandCenters(10)[7]).toBe(4000);
  });

  it("세 계획의 중심 주파수가 ISO 목록과 정확히 같다", () => {
    // 길이만 세고 몇 군데만 찍으면 가운데 값이 틀려도 통과한다.
    // 여기서는 ISO 표를 독립적으로 옮겨 적어 전수 대조한다.
    expect(bandCenters(31)).toEqual([
      20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630,
      800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000,
      12500, 16000, 20000,
    ]);
    expect(bandCenters(15)).toEqual([
      25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 16000,
    ]);
    expect(bandCenters(10)).toEqual([
      31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
    ]);
  });

  // 경계는 구현과 같은 식을 다시 쓰지 말고 계산해 둔 값으로 못 박는다.
  it("1/3 옥타브 경계는 중심의 2^(±1/6) 이다", () => {
    const { lo, hi } = bandEdges(31, 1000);
    expect(lo).toBeCloseTo(890.9, 1);
    expect(hi).toBeCloseTo(1122.5, 1);
  });

  it("2/3 옥타브 경계는 중심의 2^(±1/3) 이다", () => {
    const { lo, hi } = bandEdges(15, 1000);
    expect(lo).toBeCloseTo(793.7, 1);
    expect(hi).toBeCloseTo(1259.9, 1);
  });

  it("1 옥타브 경계는 중심의 2^(±1/2) 이다", () => {
    const { lo, hi } = bandEdges(10, 1000);
    expect(lo).toBeCloseTo(707.1, 1);
    expect(hi).toBeCloseTo(1414.2, 1);
  });
});

describe("가장 가까운 밴드", () => {
  it("31밴드에서 3184Hz 는 3150 슬라이더다", () => {
    expect(nearestBand(3184, 31)).toBe(3150);
  });

  it("10밴드에서 같은 3184Hz 는 4000 슬라이더다", () => {
    expect(nearestBand(3184, 10)).toBe(4000);
  });

  it("15밴드에서 3184Hz 는 2500 과 4000 중 로그상 가까운 쪽이다", () => {
    // 3184/2500 = 1.274, 4000/3184 = 1.256 → 4000 이 더 가깝다
    expect(nearestBand(3184, 15)).toBe(4000);
  });

  it("중심값과 정확히 같으면 그 값이다", () => {
    expect(nearestBand(1000, 31)).toBe(1000);
  });
});

describe("스펙트럼을 밴드로 묶기", () => {
  it("1kHz 사인파는 1000 밴드가 최대다", () => {
    const bands = spectrumToBands(tonePeak(1000, -20, -100), 31);
    const centers = bandCenters(31);
    let maxIdx = 0;
    for (let i = 1; i < bands.length; i++) if (bands[i] > bands[maxIdx]) maxIdx = i;
    expect(centers[maxIdx]).toBe(1000);
  });

  it("핑크노이즈는 31밴드가 평탄하다 (100Hz~10kHz 안에서 ±1.5dB)", () => {
    const bands = spectrumToBands(pinkNoise(-40), 31);
    const centers = bandCenters(31);
    const inRange = centers
      .map((hz, i) => ({ hz, v: bands[i] }))
      .filter((b) => b.hz >= 100 && b.hz <= 10000)
      .map((b) => b.v);
    const min = Math.min(...inRange);
    const max = Math.max(...inRange);
    expect(max - min).toBeLessThan(1.5);
  });

  it("밴드 개수는 계획과 같다", () => {
    expect(spectrumToBands(pinkNoise(-40), 10)).toHaveLength(10);
  });

  it("같은 신호에서 15밴드는 31밴드보다 약 3dB 높다", () => {
    const s = pinkNoise(-40);
    const at31 = spectrumToBands(s, 31)[bandCenters(31).indexOf(1000)];
    const at15 = spectrumToBands(s, 15)[bandCenters(15).indexOf(1000)];
    // 2/3 옥타브는 1/3 옥타브의 두 배 폭이라 담기는 전력도 두 배 = +3.01dB.
    // 15밴드 반폭 상수가 틀리면 여기서 어긋난다.
    // 평탄도 검사로는 못 잡는다 — 폭이 틀려도 비율만 일정하면 여전히 평탄하다.
    expect(at15 - at31).toBeCloseTo(3.01, 0);
  });

  it("주파수 표기는 1000 이상에서만 k 로 줄인다", () => {
    expect(formatHz(3150)).toBe("3.15k");
    expect(formatHz(1000)).toBe("1k");
    expect(formatHz(16000)).toBe("16k");
    expect(formatHz(630)).toBe("630");
    expect(formatHz(31.5)).toBe("31.5");
  });

  it("bin 간격이 넓어 밴드에 bin 이 하나도 안 들어가도 값을 낸다", () => {
    // 96kHz 로 열리면 bin 간격이 5.86Hz 가 되어 20Hz 밴드(폭 4.6Hz)에
    // bin 이 하나도 안 들어간다. AudioContext 의 샘플레이트는 우리가 정하지 못한다.
    const binHz = 96000 / 16384;
    const db = new Float32Array(8192).fill(-80);
    const bands = spectrumToBands({ db, binHz }, 31);
    expect(Number.isFinite(bands[0])).toBe(true);
    expect(bands[0]).toBeCloseTo(-80, 0);
  });
});

describe("막대 높이", () => {
  it("보정값만큼 창도 함께 움직인다", () => {
    expect(barPct(-55, -100, -10)).toBeCloseTo(50, 0);
    // +100 보정이면 값도 창도 100 올라가 같은 높이여야 한다
    expect(barPct(45, 0, 90)).toBeCloseTo(50, 0);
    // 창을 안 옮기면 천장에 붙는다 — 고치기 전의 동작을 명시해 둔다
    expect(barPct(45, -100, -10)).toBe(100);
  });

  it("범위 밖과 유한하지 않은 값은 0~100 안으로 잡는다", () => {
    expect(barPct(-Infinity, -100, -10)).toBe(0);
    expect(barPct(NaN, -100, -10)).toBe(0);
    expect(barPct(0, -100, -10)).toBe(100);
    expect(barPct(-200, -100, -10)).toBe(0);
  });
});

describe("따라 움직이는 표시 창", () => {
  /** 한 프레임을 n번 돌린다. */
  const settle = (bands: number[], from: number, n: number, min = MIN_CEIL_DB) => {
    let c = from;
    for (let i = 0; i < n; i++) c = nextCeilDb(bands, c, min);
    return c;
  };

  it("큰 소리가 들어오면 곧바로 따라 올라간다", () => {
    // 한 프레임이면 충분해야 한다. 천천히 올라가면 하울링이 시작된 순간
    // 막대가 천장을 뚫고 나가 어느 대역인지 못 읽는다.
    const ceil = nextCeilDb([-30, -70, -70], MIN_CEIL_DB, MIN_CEIL_DB);
    expect(ceil).toBeCloseTo(-27, 5);
  });

  it("조용해지면 천천히 내려온다 — 한 프레임에 확 내려가지 않는다", () => {
    const after1 = nextCeilDb([-90, -90], -20, -200);
    expect(after1).toBeGreaterThan(-21); // 프레임당 0.15dB
    // 30fps 로 2초면 약 9dB 내려온다
    expect(settle([-90, -90], -20, 60, -200)).toBeCloseTo(-29, 0);
  });

  it("아무리 조용해도 하한 밑으로는 내려가지 않는다", () => {
    // 이게 없으면 **조용한 방의 잡음이 화면을 가득 채운다.**
    const ceil = settle([-120, -120, -120], MIN_CEIL_DB, 10000);
    expect(ceil).toBe(MIN_CEIL_DB);
    // 그 상태에서 조용한 방(-95dB)은 바닥 근처에 머문다
    expect(barPct(-95, ceil - METER_SPAN_DB, ceil)).toBeLessThan(15);
  });

  it("보정을 쓰면 하한도 그만큼 함께 올라간다", () => {
    // 보정 +100 이면 막대 값이 통째로 100 올라간다. 하한을 안 올리면
    // 하한이 무의미해져 조용한 방에서도 창이 끝까지 따라 내려간다.
    const min = MIN_CEIL_DB + 100;
    expect(settle([-20, -20], min, 10000, min)).toBe(min);
  });

  it("값이 하나도 없는 프레임에서도 무너지지 않는다", () => {
    // 첫 프레임 전에는 전부 -Infinity 다. NaN 이 새면 막대가 통째로 사라진다.
    const ceil = nextCeilDb([-Infinity, -Infinity], -30, -200);
    expect(Number.isFinite(ceil)).toBe(true);
    expect(ceil).toBeCloseTo(-30.15, 5);
    expect(nextCeilDb([], -30, -200)).toBeCloseTo(-30.15, 5);
  });

  it("실제 예배당 레벨이 막대의 상당 부분을 쓴다", () => {
    // 고치기 전의 고정 창(-100~-10)에서는 이 값들이 전부 아래쪽
    // 3분의 1에 깔려 「레벨이 너무 낮다」는 말이 나왔다.
    const room = [-78, -72, -68, -64, -61, -59, -58, -62, -70, -80];
    // 이 방의 가장 큰 대역(-58)이 하한(-48)보다 조용해서 창은 하한에 머문다.
    // 천천히 내려오므로 몇 프레임으로는 자리를 잡지 않는다 — 30fps 기준
    // 2초쯤 걸린다. 그 사이의 출렁임이 없는 것이 이 느린 하강의 목적이다.
    const ceil = settle(room, MIN_CEIL_DB, 300);
    expect(ceil).toBe(MIN_CEIL_DB);

    const heights = room.map((v) => barPct(v, ceil - METER_SPAN_DB, ceil));
    // 고치기 전 고정 창(-100~-10)에서는 가장 큰 막대가 47%, 가장 작은 것이
    // 22% 였다 — 전부 아래쪽에 깔려 「레벨이 너무 낮다」는 말이 나왔다.
    expect(Math.max(...heights)).toBeGreaterThan(75);
    expect(Math.min(...heights)).toBeGreaterThan(30);
  });
});
