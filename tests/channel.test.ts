import { describe, expect, it } from "vitest";
import {
  cac,
  cpl,
  dealRate,
  isFreeChannel,
  mqlRate,
  safeDiv,
  sortByDealRateDesc,
  sqlRate,
  sumFunnels,
} from "../lib/channel";
import type { ChannelFunnel } from "../lib/types";

function makeFunnel(overrides: Partial<ChannelFunnel> = {}): ChannelFunnel {
  return {
    id: "f-1",
    period: "2026-07",
    source: "커뮤니티",
    activities: 10,
    leads: 20,
    contactable: 15,
    mql: 10,
    sql: 5,
    quotes: 3,
    deals: 2,
    spend: 0,
    ...overrides,
  };
}

describe("safeDiv — 분모 0 방어", () => {
  it("분모가 0이면 null (0%가 아니라 '데이터 없음')", () => {
    expect(safeDiv(5, 0)).toBeNull();
  });

  it("정상 나눗셈", () => {
    expect(safeDiv(1, 4)).toBe(0.25);
  });
});

describe("퍼널 지표 (PRD 5.4)", () => {
  it("유효율 = mql/leads", () => {
    expect(mqlRate(makeFunnel())).toBe(10 / 20);
  });

  it("상담전환 = sql/mql", () => {
    expect(sqlRate(makeFunnel())).toBe(5 / 10);
  });

  it("계약전환 = deals/leads", () => {
    expect(dealRate(makeFunnel())).toBe(2 / 20);
  });

  it("leads=0이면 유효율·계약전환·CPL 모두 null", () => {
    const empty = makeFunnel({ leads: 0, mql: 0, sql: 0, deals: 0 });
    expect(mqlRate(empty)).toBeNull();
    expect(dealRate(empty)).toBeNull();
    expect(cpl(empty)).toBeNull();
  });

  it("mql=0이면 상담전환 null", () => {
    expect(sqlRate(makeFunnel({ mql: 0 }))).toBeNull();
  });

  it("deals=0이면 CAC null", () => {
    expect(cac(makeFunnel({ deals: 0, spend: 100000 }))).toBeNull();
  });
});

describe("CPL·CAC", () => {
  it("유료 채널: CPL = spend/leads, CAC = spend/deals", () => {
    const paid = makeFunnel({ source: "메타광고", spend: 1000000 });
    expect(cpl(paid)).toBe(1000000 / 20);
    expect(cac(paid)).toBe(1000000 / 2);
  });

  it("무료 채널: spend=0이면 CPL·CAC 0원", () => {
    const free = makeFunnel({ spend: 0 });
    expect(cpl(free)).toBe(0);
    expect(cac(free)).toBe(0);
  });

  it("isFreeChannel: spend=0이면 무료 채널", () => {
    expect(isFreeChannel(makeFunnel({ spend: 0 }))).toBe(true);
    expect(isFreeChannel(makeFunnel({ spend: 1 }))).toBe(false);
  });
});

describe("sortByDealRateDesc — 계약전환율 내림차순", () => {
  it("전환율 높은 채널이 먼저, 전환율 없는(leads=0) 채널은 맨 뒤", () => {
    const high = makeFunnel({ id: "high", leads: 10, deals: 5 });
    const low = makeFunnel({ id: "low", leads: 10, deals: 1 });
    const none = makeFunnel({ id: "none", leads: 0, deals: 0 });
    const sorted = sortByDealRateDesc([none, low, high]);
    expect(sorted.map((f) => f.id)).toEqual(["high", "low", "none"]);
  });
});

describe("sumFunnels — 퍼널 합산", () => {
  it("여러 행의 수치를 모두 더한다", () => {
    const a = makeFunnel({ leads: 10, deals: 1, spend: 500 });
    const b = makeFunnel({ leads: 5, deals: 2, spend: 0 });
    const sum = sumFunnels([a, b]);
    expect(sum.leads).toBe(15);
    expect(sum.deals).toBe(3);
    expect(sum.spend).toBe(500);
  });

  it("빈 배열이면 전부 0", () => {
    const sum = sumFunnels([]);
    expect(sum.leads).toBe(0);
    expect(sum.deals).toBe(0);
  });
});
