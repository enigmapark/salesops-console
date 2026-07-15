import { describe, expect, it } from "vitest";
import { seedData } from "../data/seed";
import { availableMonths, buildCopyText, buildMonthlyReport, productMonthly } from "../lib/report";

describe("productMonthly — 월·제품 기준 코호트 집계", () => {
  it("2026-06 링고: 한빛일보·푸른경제 2건, 계약 0건", () => {
    const r = productMonthly(seedData.leads, "2026-06", "링고");
    expect(r.newLeads).toBe(2);
    expect(r.deals).toBe(0);
    expect(r.conversionRate).toBe(0);
  });

  it("2026-06 뉴로: 그린리테일 1건, 계약 1건 → 전환율 100%", () => {
    const r = productMonthly(seedData.leads, "2026-06", "뉴로");
    expect(r.newLeads).toBe(1);
    expect(r.deals).toBe(1);
    expect(r.conversionRate).toBe(1);
  });

  it("리드가 없는 월이면 전환율 null (0%가 아님)", () => {
    const r = productMonthly(seedData.leads, "2025-01", "링고");
    expect(r.newLeads).toBe(0);
    expect(r.conversionRate).toBeNull();
  });
});

describe("buildMonthlyReport — 2026-07", () => {
  const r = buildMonthlyReport(seedData, "2026-07");

  it("채널 합계: 리드 64건·계약 7건·광고비 240만원", () => {
    expect(r.channelTotals.leads).toBe(64);
    expect(r.channelTotals.deals).toBe(7);
    expect(r.channelTotals.spend).toBe(2400000);
  });

  it("채널 행은 계약전환율 내림차순 — 첫 번째가 커뮤니티", () => {
    expect(r.funnels[0]?.source).toBe("커뮤니티");
  });

  it("스레드: 게시 4건·유입 리드 6건", () => {
    expect(r.threads.postCount).toBe(4);
    expect(r.threads.totalLeads).toBe(6);
  });

  it("데이터 없는 월이면 모두 0/null", () => {
    const empty = buildMonthlyReport(seedData, "2025-01");
    expect(empty.channelTotals.leads).toBe(0);
    expect(empty.channelConversion).toBeNull();
    expect(empty.threads.postCount).toBe(0);
  });
});

describe("availableMonths", () => {
  it("데이터가 있는 월을 최신순으로 나열한다", () => {
    const months = availableMonths(seedData);
    expect(months[0]).toBe("2026-07");
    expect(months).toContain("2026-03");
    // 내림차순 확인
    expect([...months].sort().reverse()).toEqual(months);
  });
});

describe("buildCopyText", () => {
  const r = buildMonthlyReport(seedData, "2026-07");

  it("핵심 수치가 텍스트에 포함된다", () => {
    const text = buildCopyText(r);
    expect(text).toContain("[SalesOps 월간 보고] 2026-07");
    expect(text).toContain("리드 64건");
    expect(text).toContain("유입 리드 6건");
  });

  it("코멘트가 있으면 WHY/HOW/WHAT 섹션이 붙는다", () => {
    const text = buildCopyText(r, {
      month: "2026-07",
      why: "여름 비수기",
      how: "무료 채널 집중",
      what: "커뮤니티 전환율 25%",
    });
    expect(text).toContain("[WHY] 여름 비수기");
    expect(text).toContain("[HOW] 무료 채널 집중");
    expect(text).toContain("[WHAT] 커뮤니티 전환율 25%");
  });

  it("빈 코멘트 섹션은 생략된다", () => {
    const text = buildCopyText(r, { month: "2026-07", why: "", how: "", what: "" });
    expect(text).not.toContain("[WHY]");
  });
});
