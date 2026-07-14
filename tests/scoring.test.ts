import { describe, expect, it } from "vitest";
import { calcGrade, calcScore, needsContact, sortByScoreDesc } from "../lib/scoring";
import type { Lead } from "../lib/types";

// 테스트용 기본 리드: 체크박스 전부 해제, 상태 "상담중"
function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "test-1",
    name: "테스트 신문사",
    source: "커뮤니티",
    product: "링고",
    type: "신규창간",
    status: "상담중",
    hasQuote: false,
    hadMeeting: false,
    mentionedDate: false,
    talkedDM: false,
    stale3m: false,
    businessStopped: false,
    expectedAmount: 0,
    firstInquiry: "2026-07-01",
    contactAttempts: 0,
    lostReasonConfirmed: false,
    ...overrides,
  };
}

describe("calcScore — 리드 점수 (PRD 5.1)", () => {
  it("모든 체크 해제면 0점", () => {
    expect(calcScore(makeLead())).toBe(0);
  });

  it("가중치: hasQuote +3", () => {
    expect(calcScore(makeLead({ hasQuote: true }))).toBe(3);
  });

  it("가중치: hadMeeting +3", () => {
    expect(calcScore(makeLead({ hadMeeting: true }))).toBe(3);
  });

  it("가중치: mentionedDate +2", () => {
    expect(calcScore(makeLead({ mentionedDate: true }))).toBe(2);
  });

  it("가중치: talkedDM +2", () => {
    expect(calcScore(makeLead({ talkedDM: true }))).toBe(2);
  });

  it("감점: stale3m -1", () => {
    expect(calcScore(makeLead({ stale3m: true }))).toBe(-1);
  });

  it("감점: businessStopped -3", () => {
    expect(calcScore(makeLead({ businessStopped: true }))).toBe(-3);
  });

  it("만점: 긍정 4개 전부 체크 = 10점", () => {
    expect(
      calcScore(makeLead({ hasQuote: true, hadMeeting: true, mentionedDate: true, talkedDM: true })),
    ).toBe(10);
  });

  it("조합: 견적 + 미팅 + 3개월 미응답 = 3+3-1 = 5점", () => {
    expect(calcScore(makeLead({ hasQuote: true, hadMeeting: true, stale3m: true }))).toBe(5);
  });
});

describe("calcGrade — 등급 경계값", () => {
  it("8점 이상 → 1등급 (견적3+미팅3+도입일2 = 8)", () => {
    expect(calcGrade(makeLead({ hasQuote: true, hadMeeting: true, mentionedDate: true }))).toBe("1등급");
  });

  it("7점 → 2등급 (견적3+도입일2+DM통화2 = 7)", () => {
    expect(calcGrade(makeLead({ hasQuote: true, mentionedDate: true, talkedDM: true }))).toBe("2등급");
  });

  it("5점 → 2등급 (견적3+도입일2 = 5)", () => {
    expect(calcGrade(makeLead({ hasQuote: true, mentionedDate: true }))).toBe("2등급");
  });

  it("4점 → 3등급 (도입일2+DM통화2 = 4)", () => {
    expect(calcGrade(makeLead({ mentionedDate: true, talkedDM: true }))).toBe("3등급");
  });

  it("2점 → 3등급 (도입일2 = 2)", () => {
    expect(calcGrade(makeLead({ mentionedDate: true }))).toBe("3등급");
  });

  it("1점 → 후순위 (도입일2-미응답1 = 1)", () => {
    expect(calcGrade(makeLead({ mentionedDate: true, stale3m: true }))).toBe("후순위");
  });

  it("0점(신규 기본값) → 후순위", () => {
    expect(calcGrade(makeLead())).toBe("후순위");
  });
});

describe("calcGrade — 강제 규칙이 점수보다 우선", () => {
  const fullScore = {
    hasQuote: true,
    hadMeeting: true,
    mentionedDate: true,
    talkedDM: true,
  } as const;

  it("10점이어도 status=계약이면 계약완료", () => {
    expect(calcGrade(makeLead({ ...fullScore, status: "계약" }))).toBe("계약완료");
  });

  it("10점이어도 status=이탈이면 후순위", () => {
    expect(calcGrade(makeLead({ ...fullScore, status: "이탈" }))).toBe("후순위");
  });

  it("점수가 높아도 businessStopped면 후순위", () => {
    // businessStopped -3을 더해도 7점(2등급 범위)이지만 강제 규칙으로 후순위
    expect(calcGrade(makeLead({ ...fullScore, businessStopped: true }))).toBe("후순위");
  });

  it("계약이면서 businessStopped면 계약완료가 우선 (규칙 순서)", () => {
    expect(calcGrade(makeLead({ status: "계약", businessStopped: true }))).toBe("계약완료");
  });
});

describe("needsContact — 연락 요망 (PRD 5.3)", () => {
  const TODAY = "2026-07-14";

  it("nextContact가 오늘이면 true", () => {
    expect(needsContact(makeLead({ nextContact: "2026-07-14" }), TODAY)).toBe(true);
  });

  it("nextContact가 과거면 true", () => {
    expect(needsContact(makeLead({ nextContact: "2026-07-01" }), TODAY)).toBe(true);
  });

  it("nextContact가 미래면 false", () => {
    expect(needsContact(makeLead({ nextContact: "2026-07-15" }), TODAY)).toBe(false);
  });

  it("nextContact가 없으면 false", () => {
    expect(needsContact(makeLead(), TODAY)).toBe(false);
  });

  it("status=계약이면 날짜가 지났어도 false", () => {
    expect(needsContact(makeLead({ nextContact: "2026-07-01", status: "계약" }), TODAY)).toBe(false);
  });

  it("status=이탈이면 날짜가 지났어도 false", () => {
    expect(needsContact(makeLead({ nextContact: "2026-07-01", status: "이탈" }), TODAY)).toBe(false);
  });

  it("status=보류는 제외 대상이 아니므로 true (PRD 그대로)", () => {
    expect(needsContact(makeLead({ nextContact: "2026-07-01", status: "보류" }), TODAY)).toBe(true);
  });
});

describe("sortByScoreDesc — 점수 내림차순 정렬", () => {
  it("점수 높은 리드가 먼저 온다", () => {
    const low = makeLead({ id: "low" });
    const high = makeLead({ id: "high", hasQuote: true, hadMeeting: true });
    const mid = makeLead({ id: "mid", mentionedDate: true });
    const sorted = sortByScoreDesc([low, high, mid]);
    expect(sorted.map((l) => l.id)).toEqual(["high", "mid", "low"]);
  });

  it("동점이면 최초 문의일이 오래된 리드가 먼저", () => {
    const newer = makeLead({ id: "newer", firstInquiry: "2026-07-10" });
    const older = makeLead({ id: "older", firstInquiry: "2026-06-01" });
    const sorted = sortByScoreDesc([newer, older]);
    expect(sorted.map((l) => l.id)).toEqual(["older", "newer"]);
  });
});
