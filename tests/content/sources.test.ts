import { describe, it, expect } from "vitest";
import { SOURCES, GUIDE_FOOTER } from "../../src/content/sources";

describe("소스별 가이드", () => {
  it("7종이 있다", () => {
    expect(SOURCES).toHaveLength(7);
  });

  it("id 가 겹치지 않는다", () => {
    const ids = SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(7);
  });

  it("모든 소스에 흔한 문제가 3가지씩 있다", () => {
    for (const s of SOURCES) {
      expect(s.problems, s.name).toHaveLength(3);
    }
  });

  it("모든 문제의 주파수 범위는 낮은 값이 앞에 온다", () => {
    for (const s of SOURCES) {
      for (const p of s.problems) {
        expect(p.range[0], `${s.name} / ${p.symptom}`).toBeLessThan(p.range[1]);
      }
    }
  });

  it("라인으로 들어오는 소스는 하울링 대역이 없다", () => {
    const line = SOURCES.filter((s) => ["synth", "edrum", "bass"].includes(s.id));
    expect(line).toHaveLength(3);
    for (const s of line) {
      expect(s.howlBands, s.name).toBeNull();
      expect(s.conflicts.length, s.name).toBeGreaterThan(0);
    }
  });

  it("마이크를 쓰는 소스에는 하울링 대역이 있다", () => {
    const mic = SOURCES.filter((s) => ["preacher", "vocal"].includes(s.id));
    expect(mic).toHaveLength(2);
    for (const s of mic) {
      expect(s.howlBands, s.name).not.toBeNull();
      expect(s.howlBands!.length, s.name).toBeGreaterThan(0);
    }
  });

  it("설교자 카드의 하울링 대역은 250·1000·3150 을 포함한다", () => {
    const p = SOURCES.find((s) => s.id === "preacher")!;
    expect(p.howlBands).toContain(250);
    expect(p.howlBands).toContain(1000);
    expect(p.howlBands).toContain(3150);
  });

  it("공통 하단 문구에 「출발점이지 정답이 아닙니다」가 있다", () => {
    expect(GUIDE_FOOTER).toContain("출발점이지 정답이 아닙니다");
  });
});
