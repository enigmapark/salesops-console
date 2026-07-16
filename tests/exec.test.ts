import { describe, expect, it } from "vitest";
import { seedData } from "../data/seed";
import {
  avgDaysToClose,
  cohortConversion,
  contractsInMonth,
  inflowInMonth,
  newMrrInMonth,
  pipelineValue,
} from "../lib/exec";

// 그린리테일: 6월 유입 → 7월 계약(계약일 2026-07-03, 월 이용료 75,000원)
// → "당월 계약"과 "코호트"가 다른 달로 잡히는 대표 사례
describe("당월 계약 vs 코호트 구분 (lib/exec)", () => {
  it("7월 계약(계약일 기준): 그린리테일 1건 — 6월 유입이지만 7월 계약으로 집계", () => {
    const july = contractsInMonth(seedData.leads, "2026-07");
    expect(july.map((l) => l.name)).toEqual(["그린리테일"]);
    expect(contractsInMonth(seedData.leads, "2026-06")).toHaveLength(0);
  });

  it("7월 유입(코호트): 블루문스튜디오 1건뿐", () => {
    expect(inflowInMonth(seedData.leads, "2026-07").map((l) => l.name)).toEqual([
      "블루문스튜디오",
    ]);
  });

  it("7월 신규 MRR = 75,000원 (그린리테일 월 이용료)", () => {
    expect(newMrrInMonth(seedData.leads, "2026-07")).toBe(75000);
    expect(newMrrInMonth(seedData.leads, "2026-06")).toBe(0);
  });

  it("코호트 전환율: 6월 유입 3건 중 계약 1건 = 33.3%", () => {
    expect(cohortConversion(seedData.leads, "2026-06")).toBeCloseTo(1 / 3);
  });

  it("진행 파이프라인: 활성 리드 4건, 총 계약가치 3,500,000원", () => {
    const p = pipelineValue(seedData.leads);
    expect(p.count).toBe(4); // 한빛·푸른·가온·블루문 (계약·이탈 제외)
    expect(p.amount).toBe(1200000 + 1500000 + 800000 + 0);
  });

  it("평균 계약 소요일: 그린리테일 6/10 → 7/3 = 23일", () => {
    expect(avgDaysToClose(seedData.leads)).toBe(23);
  });

  it("계약 건이 없으면 평균 소요일 null", () => {
    expect(avgDaysToClose(seedData.leads.filter((l) => l.status !== "계약"))).toBeNull();
  });
});
