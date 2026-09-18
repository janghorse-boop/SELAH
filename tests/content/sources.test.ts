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

  it("하울링 대역은 그 카드의 주파수 지도 안에 있다", () => {
    // 지도에 없는 자리를 가리키면 화면에서 표식이 빈 공간에 뜬다.
    for (const s of SOURCES) {
      for (const hz of s.howlBands ?? []) {
        const inside = s.zones.some((z) => hz >= z.from && hz <= z.to);
        expect(inside, `${s.name} / ${hz}Hz`).toBe(true);
      }
    }
  });

  it("문제 대역이 주파수 지도에 빠짐없이 덮여 있다", () => {
    // 구간이 이어져 있으면 여러 zone 에 걸쳐도 된다. 중간이 비면 안 된다.
    const covered = (zones: typeof SOURCES[number]["zones"], from: number, to: number) => {
      let cursor = from;
      for (const z of [...zones].sort((a, b) => a.from - b.from)) {
        if (z.from > cursor) break;
        if (z.to > cursor) cursor = z.to;
        if (cursor >= to) return true;
      }
      return cursor >= to;
    };
    for (const s of SOURCES) {
      for (const p of s.problems) {
        expect(covered(s.zones, p.range[0], p.range[1]), `${s.name} / ${p.symptom}`).toBe(true);
      }
    }
  });

  it("주파수 지도 구간은 낮은 값이 앞에 온다", () => {
    for (const s of SOURCES) {
      for (const z of s.zones) {
        expect(z.from, `${s.name} / ${z.label}`).toBeLessThan(z.to);
      }
    }
  });

  it("어쿠스틱·일렉기타는 마이크를 쓸 때만 하울링이 난다", () => {
    // 이 둘은 마이크도 라인도 될 수 있어 어느 필터에도 안 걸렸다.
    for (const id of ["acoustic", "eguitar"]) {
      const s = SOURCES.find((x) => x.id === id)!;
      expect(s.howlBands, id).not.toBeNull();
      expect(s.howlBands!.length, id).toBeGreaterThan(0);
      expect(s.conflicts.length, id).toBeGreaterThan(0);
      expect(s.howlNote, id).toContain("때만"); // 조건부임이 문구에 드러나야 한다
    }
  });

  it("하이패스 안내는 마이크·픽업 소스에만 있다", () => {
    const withHp = SOURCES.filter((s) => s.highPass !== null).map((s) => s.id).sort();
    expect(withHp).toEqual(["acoustic", "bass", "eguitar", "preacher", "vocal"]);
  });

  it("화면에 나가는 문장이 비어 있지 않다", () => {
    for (const s of SOURCES) {
      expect(s.name.trim().length, s.id).toBeGreaterThan(0);
      expect(s.subtitle.trim().length, s.id).toBeGreaterThan(0);
      for (const z of s.zones) expect(z.label.trim().length, `${s.id}/zone`).toBeGreaterThan(0);
      for (const p of s.problems) {
        expect(p.symptom.trim().length, s.id).toBeGreaterThan(0);
        expect(p.detail.trim().length, `${s.id}/${p.symptom}`).toBeGreaterThan(0);
      }
      for (const c of s.conflicts) expect(c.trim().length, s.id).toBeGreaterThan(0);
      if (s.howlNote !== null) expect(s.howlNote.trim().length, s.id).toBeGreaterThan(0);
      if (s.highPass !== null) expect(s.highPass.trim().length, s.id).toBeGreaterThan(0);
    }
  });
});
