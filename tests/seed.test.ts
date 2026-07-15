import { describe, expect, it } from "vitest";
import { seedData } from "../data/seed";
import { calcGrade, needsContact } from "../lib/scoring";

// seed가 PRD 9장의 스토리와 어긋나지 않는지 고정해 두는 테스트.
// (더미 데이터를 수정하다가 스토리가 깨지는 것을 방지)
describe("seed 스토리 검증", () => {
  const byId = (id: string) => {
    const lead = seedData.leads.find((l) => l.id === id);
    if (!lead) throw new Error(`seed에 ${id}가 없습니다`);
    return lead;
  };

  it("리드 A(한빛일보): 1등급 + 연락 요망", () => {
    const a = byId("lead-a");
    expect(calcGrade(a)).toBe("1등급");
    expect(needsContact(a, "2026-07-15")).toBe(true);
  });

  it("리드 B(가온뉴스): 3개월 미응답 → 3등급", () => {
    expect(calcGrade(byId("lead-b"))).toBe("3등급");
  });

  it("리드 C(푸른경제): 도입예정일 언급 → 2등급", () => {
    expect(calcGrade(byId("lead-c"))).toBe("2등급");
  });

  it("리드 D(미르타임즈): 이탈 → 후순위, 사유는 추정(미확정) + 윈백일 있음", () => {
    const d = byId("lead-d");
    expect(calcGrade(d)).toBe("후순위");
    expect(d.lostReasonConfirmed).toBe(false);
    expect(d.winbackDate).toBeTruthy();
  });

  it("리드 E(그린리테일): 계약 → 계약완료", () => {
    expect(calcGrade(byId("lead-e"))).toBe("계약완료");
  });

  it("스레드 게시글의 유입 리드 합계 = 스레드 채널 퍼널의 리드 수", () => {
    const threadLeads = seedData.threadPosts.reduce((sum, p) => sum + p.leadsGenerated, 0);
    const threadFunnel = seedData.funnels.find((f) => f.source === "스레드");
    expect(threadFunnel?.leads).toBe(threadLeads);
  });

  it("무료 채널과 유료 채널이 모두 포함되어 있다", () => {
    expect(seedData.funnels.some((f) => f.spend === 0)).toBe(true);
    expect(seedData.funnels.some((f) => f.spend > 0)).toBe(true);
  });
});
