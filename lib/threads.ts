import { safeDiv } from "./channel";
import type { ThreadPost, ThreadTopic } from "./types";

// PRD 5.5 — 스레드 지표 (분모 0이면 null = 데이터 없음)
export function engagementRate(p: ThreadPost): number | null {
  return safeDiv(p.likes + p.comments + p.reposts, p.impressions);
}

export function clickRate(p: ThreadPost): number | null {
  return safeDiv(p.profileClicks, p.impressions);
}

export function postsInMonth(posts: ThreadPost[], month: string): ThreadPost[] {
  return posts.filter((p) => p.date.startsWith(month));
}

export interface ThreadSummary {
  postCount: number;
  totalImpressions: number;
  // 평균 반응률 = 총 반응 / 총 노출 (노출 가중 평균 — 게시글별 단순 평균이 아님)
  avgEngagementRate: number | null;
  totalClicks: number;
  totalLeads: number;
}

export function summarizePosts(posts: ThreadPost[]): ThreadSummary {
  const totalImpressions = posts.reduce((s, p) => s + p.impressions, 0);
  const totalReactions = posts.reduce((s, p) => s + p.likes + p.comments + p.reposts, 0);
  return {
    postCount: posts.length,
    totalImpressions,
    avgEngagementRate: safeDiv(totalReactions, totalImpressions),
    totalClicks: posts.reduce((s, p) => s + p.profileClicks, 0),
    totalLeads: posts.reduce((s, p) => s + p.leadsGenerated, 0),
  };
}

// 토픽별 성과 비교 — 유입 리드 많은 순, 동률이면 노출 많은 순
export function summarizeByTopic(
  posts: ThreadPost[],
): { topic: ThreadTopic; summary: ThreadSummary }[] {
  const topics = [...new Set(posts.map((p) => p.topic))];
  return topics
    .map((topic) => ({ topic, summary: summarizePosts(posts.filter((p) => p.topic === topic)) }))
    .sort(
      (a, b) =>
        b.summary.totalLeads - a.summary.totalLeads ||
        b.summary.totalImpressions - a.summary.totalImpressions,
    );
}
