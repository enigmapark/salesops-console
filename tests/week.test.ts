import { describe, expect, it } from "vitest";
import { seedData } from "../data/seed";
import { inWeek, listWeeks, prevWeekOf, weekOf } from "../lib/week";
import { buildWeeklyCopyText, productWeekly } from "../lib/weekly";

describe("weekOf — 월요일 시작 주 계산", () => {
  it("2026-07-16(목) → 07/13(월)~07/19(일)", () => {
    const w = weekOf("2026-07-16");
    expect(w.start).toBe("2026-07-13");
    expect(w.end).toBe("2026-07-19");
    expect(w.label).toBe("07/13 ~ 07/19");
  });

  it("일요일은 그 주의 마지막 날 (2026-07-12 → 07/06~07/12)", () => {
    const w = weekOf("2026-07-12");
    expect(w.start).toBe("2026-07-06");
    expect(w.end).toBe("2026-07-12");
  });

  it("전주 계산", () => {
    const prev = prevWeekOf(weekOf("2026-07-16"));
    expect(prev.start).toBe("2026-07-06");
  });

  it("inWeek 경계 포함", () => {
    const w = weekOf("2026-07-16");
    expect(inWeek("2026-07-13", w)).toBe(true);
    expect(inWeek("2026-07-19", w)).toBe(true);
    expect(inWeek("2026-07-12", w)).toBe(false);
    expect(inWeek(undefined, w)).toBe(false);
  });

  it("listWeeks: 중복 없이 최신 먼저", () => {
    const weeks = listWeeks(["2026-07-12", "2026-07-10", "2026-07-03"], "2026-07-16");
    expect(weeks.map((w) => w.start)).toEqual(["2026-07-13", "2026-07-06", "2026-06-29"]);
  });
});

describe("productWeekly — 주간 제품별 집계", () => {
  it("07/06~07/12 주: 뉴로 신규 = 블루문스튜디오(07-12 유입)", () => {
    const w = weekOf("2026-07-10");
    const r = productWeekly(seedData.leads, w, "뉴로");
    expect(r.newLeads.map((l) => l.name)).toEqual(["블루문스튜디오"]);
    expect(r.contracts).toHaveLength(0);
  });

  it("06/29~07/05 주: 뉴로 계약 = 그린리테일(07-03 계약), MRR 75,000원", () => {
    const w = weekOf("2026-07-03");
    const r = productWeekly(seedData.leads, w, "뉴로");
    expect(r.contracts.map((l) => l.name)).toEqual(["그린리테일"]);
    expect(r.mrr).toBe(75000);
  });

  it("주간 복사 텍스트에 제품 섹션과 주 라벨이 들어간다", () => {
    const w = weekOf("2026-07-03");
    const text = buildWeeklyCopyText(seedData, w, prevWeekOf(w));
    expect(text).toContain("[Account Team 주간 현황] 06/29 ~ 07/05");
    expect(text).toContain("■ 링고");
    expect(text).toContain("■ 뉴로");
    expect(text).toContain("계약: 그린리테일");
  });
});
