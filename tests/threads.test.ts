import { describe, expect, it } from "vitest";
import { engagementRate, clickRate, postsInMonth, summarizeByTopic, summarizePosts } from "../lib/threads";
import type { ThreadPost } from "../lib/types";

function makePost(overrides: Partial<ThreadPost> = {}): ThreadPost {
  return {
    id: "p-1",
    date: "2026-07-01",
    topic: "신문사",
    product: "링고",
    summary: "테스트 게시글",
    impressions: 1000,
    likes: 20,
    comments: 5,
    reposts: 5,
    profileClicks: 30,
    leadsGenerated: 1,
    ...overrides,
  };
}

describe("스레드 지표 (PRD 5.5)", () => {
  it("반응률 = (likes+comments+reposts)/impressions", () => {
    expect(engagementRate(makePost())).toBe(30 / 1000);
  });

  it("클릭률 = profileClicks/impressions", () => {
    expect(clickRate(makePost())).toBe(30 / 1000);
  });

  it("노출 0이면 반응률·클릭률 null", () => {
    const p = makePost({ impressions: 0 });
    expect(engagementRate(p)).toBeNull();
    expect(clickRate(p)).toBeNull();
  });
});

describe("summarizePosts — 월별 집계", () => {
  it("게시 수·총 노출·평균 반응률(노출 가중)·유입 리드 합계", () => {
    const s = summarizePosts([
      makePost({ impressions: 1000, likes: 30, comments: 0, reposts: 0, leadsGenerated: 2 }),
      makePost({ id: "p-2", impressions: 3000, likes: 30, comments: 0, reposts: 0, leadsGenerated: 1 }),
    ]);
    expect(s.postCount).toBe(2);
    expect(s.totalImpressions).toBe(4000);
    expect(s.avgEngagementRate).toBe(60 / 4000);
    expect(s.totalLeads).toBe(3);
  });

  it("게시글이 없으면 반응률 null", () => {
    const s = summarizePosts([]);
    expect(s.postCount).toBe(0);
    expect(s.avgEngagementRate).toBeNull();
  });
});

describe("postsInMonth", () => {
  it("해당 월 게시글만 필터링", () => {
    const posts = [makePost({ date: "2026-07-15" }), makePost({ id: "p-2", date: "2026-06-30" })];
    expect(postsInMonth(posts, "2026-07")).toHaveLength(1);
  });
});

describe("summarizeByTopic — 토픽별 비교", () => {
  it("토픽별로 묶고 유입 리드 많은 순으로 정렬", () => {
    const posts = [
      makePost({ topic: "신문사", leadsGenerated: 1 }),
      makePost({ id: "p-2", topic: "AI", leadsGenerated: 3 }),
      makePost({ id: "p-3", topic: "신문사", leadsGenerated: 1 }),
    ];
    const byTopic = summarizeByTopic(posts);
    expect(byTopic[0]?.topic).toBe("AI");
    expect(byTopic[1]?.topic).toBe("신문사");
    expect(byTopic[1]?.summary.totalLeads).toBe(2);
  });
});
