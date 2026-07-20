import { describe, expect, it } from "vitest";
import { seedData } from "../data/seed";
import { inWeek, listWeeks, prevWeekOf, weekOf } from "../lib/week";
import { buildWeeklyCopyText, productWeekly } from "../lib/weekly";

describe("weekOf — 수요일 시작 주 계산 (수요일 보고 주기)", () => {
  it("2026-07-16(목) → 07/15(수)~07/21(화)", () => {
    const w = weekOf("2026-07-16");
    expect(w.start).toBe("2026-07-15");
    expect(w.end).toBe("2026-07-21");
    expect(w.label).toBe("07/15 ~ 07/21");
  });

  it("월요일(7/20)도 같은 주 07/15~07/21에 속한다", () => {
    const w = weekOf("2026-07-20");
    expect(w.start).toBe("2026-07-15");
    expect(w.end).toBe("2026-07-21");
  });

  it("수요일(7/22)은 새 주의 시작", () => {
    const w = weekOf("2026-07-22");
    expect(w.start).toBe("2026-07-22");
    expect(w.end).toBe("2026-07-28");
  });

  it("전주 계산", () => {
    const prev = prevWeekOf(weekOf("2026-07-16"));
    expect(prev.start).toBe("2026-07-08");
  });

  it("inWeek 경계 포함 (수~화)", () => {
    const w = weekOf("2026-07-16");
    expect(inWeek("2026-07-15", w)).toBe(true);
    expect(inWeek("2026-07-21", w)).toBe(true);
    expect(inWeek("2026-07-14", w)).toBe(false);
    expect(inWeek("2026-07-22", w)).toBe(false);
    expect(inWeek(undefined, w)).toBe(false);
  });

  it("listWeeks: 중복 없이 최신 먼저", () => {
    const weeks = listWeeks(["2026-07-12", "2026-07-10", "2026-07-03"], "2026-07-16");
    expect(weeks.map((w) => w.start)).toEqual(["2026-07-15", "2026-07-08", "2026-07-01"]);
  });
});

describe("productWeekly — 주간 제품별 집계", () => {
  it("07/08~07/14 주: 뉴로 신규 = 블루문스튜디오(07-12 유입)", () => {
    const w = weekOf("2026-07-10");
    const r = productWeekly(seedData.leads, w, "뉴로");
    expect(r.newLeads.map((l) => l.name)).toEqual(["블루문스튜디오"]);
    expect(r.contracts).toHaveLength(0);
  });

  it("07/01~07/07 주: 뉴로 계약 = 그린리테일(07-03 계약), MRR 75,000원", () => {
    const w = weekOf("2026-07-03");
    const r = productWeekly(seedData.leads, w, "뉴로");
    expect(r.contracts.map((l) => l.name)).toEqual(["그린리테일"]);
    expect(r.mrr).toBe(75000);
  });

  it("주간 복사 텍스트에 제품 섹션과 주 라벨이 들어간다", () => {
    const w = weekOf("2026-07-03");
    const text = buildWeeklyCopyText(seedData, w, prevWeekOf(w));
    expect(text).toContain("[Account Team 주간 현황] 07/01 ~ 07/07");
    expect(text).toContain("■ 링고");
    expect(text).toContain("■ 뉴로");
    expect(text).toContain("계약: 그린리테일");
  });
});
