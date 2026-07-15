import { describe, expect, it } from "vitest";
import { todaysActions } from "../lib/actions";
import { pipelineBreakdown } from "../lib/pipeline";
import type { Lead } from "../lib/types";

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "t",
    name: "테스트",
    source: "커뮤니티",
    product: "링고",
    type: "신규창간",
    status: "1차 연락",
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

const TODAY = "2026-07-15";

describe("todaysActions — 오늘의 액션", () => {
  it("다음 연락일이 지난 리드: overdue + 며칠 지남", () => {
    const items = todaysActions([makeLead({ nextContact: "2026-07-12" })], TODAY);
    expect(items[0]?.type).toBe("overdue");
    expect(items[0]?.reason).toBe("다음 연락일 3일 지남");
  });

  it("다음 연락일이 오늘이면 '오늘' 문구", () => {
    const items = todaysActions([makeLead({ nextContact: TODAY })], TODAY);
    expect(items[0]?.reason).toBe("다음 연락일이 오늘");
  });

  it("활성 리드에 다음 연락일이 없으면 no-next (관리 누락)", () => {
    const items = todaysActions([makeLead()], TODAY);
    expect(items[0]?.type).toBe("no-next");
  });

  it("계약·이탈 리드는 no-next 대상에서 제외", () => {
    expect(todaysActions([makeLead({ status: "계약" })], TODAY)).toHaveLength(0);
  });

  it("윈백 예정일이 지난 이탈 리드는 winback", () => {
    const items = todaysActions(
      [makeLead({ status: "이탈", winbackDate: "2026-07-10" })],
      TODAY,
    );
    expect(items[0]?.type).toBe("winback");
  });

  it("정렬: overdue가 no-next보다 먼저", () => {
    const items = todaysActions(
      [makeLead({ id: "a" }), makeLead({ id: "b", nextContact: "2026-07-01" })],
      TODAY,
    );
    expect(items[0]?.type).toBe("overdue");
    expect(items[1]?.type).toBe("no-next");
  });
});

describe("pipelineBreakdown — 단계별 제품 비교", () => {
  it("단계·제품별로 집계된다", () => {
    const { funnel, off } = pipelineBreakdown([
      makeLead({ status: "신규", product: "링고" }),
      makeLead({ id: "2", status: "신규", product: "뉴로" }),
      makeLead({ id: "3", status: "제안·견적", product: "링고" }),
      makeLead({ id: "4", status: "이탈", product: "링고" }),
    ]);
    const 신규 = funnel.find((r) => r.stage === "신규");
    expect(신규).toMatchObject({ lingo: 1, neuro: 1, total: 2 });
    expect(funnel.find((r) => r.stage === "제안·견적")?.total).toBe(1);
    expect(off.find((r) => r.stage === "이탈")?.lingo).toBe(1);
  });
});
