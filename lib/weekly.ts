import { fmtNum, fmtPct, fmtWon } from "./format";
import { summarizePosts, type ThreadSummary } from "./threads";
import { inWeek, type WeekRange } from "./week";
import type { AppData, Lead, Product } from "./types";
import type { MonthlyInsights } from "./report";

// 주간 현황 집계 — 링고/뉴로 각각 계산한다 (다른 상품이므로 합산 금지)
export interface ProductWeekly {
  newLeads: Lead[]; // 이번 주 유입
  contracts: Lead[]; // 이번 주 계약 (계약일 기준)
  mrr: number; // 이번 주 계약의 월 반복매출
  oneOff: number; // 이번 주 계약의 일회성 매출(세팅비)
}

export function productWeekly(leads: Lead[], w: WeekRange, product: Product): ProductWeekly {
  const P = leads.filter((l) => l.product === product);
  const newLeads = P.filter((l) => inWeek(l.firstInquiry, w));
  const contracts = P.filter((l) => l.status === "계약" && inWeek(l.contractDate, w));
  return {
    newLeads,
    contracts,
    mrr: contracts.reduce((s, l) => s + (l.monthlyFee ?? 0), 0),
    oneOff: contracts.reduce((s, l) => s + (l.setupFee ?? 0), 0),
  };
}

export function threadsWeekly(data: AppData, w: WeekRange): ThreadSummary {
  return summarizePosts(data.threadPosts.filter((p) => inWeek(p.date, w)));
}

// 대표 보고용 복사 텍스트 (슬랙 붙여넣기)
export function buildWeeklyCopyText(
  data: AppData,
  w: WeekRange,
  prevW: WeekRange,
  insights?: MonthlyInsights,
): string {
  const lines: string[] = [];
  lines.push(`[Account Team 주간 현황] ${w.label}`);
  lines.push("");
  for (const p of ["링고", "뉴로"] as Product[]) {
    const cur = productWeekly(data.leads, w, p);
    const prev = productWeekly(data.leads, prevW, p);
    lines.push(`■ ${p}`);
    lines.push(
      `- 신규 리드 ${cur.newLeads.length}건 (전주 ${prev.newLeads.length}건) · 계약 ${cur.contracts.length}건 · 신규 MRR ${fmtWon(cur.mrr)}${cur.oneOff > 0 ? ` + 일회성 ${fmtWon(cur.oneOff)}` : ""}`,
    );
    if (cur.newLeads.length > 0) {
      lines.push(`- 신규: ${cur.newLeads.map((l) => `${l.name}(${l.source})`).join(", ")}`);
    }
    if (cur.contracts.length > 0) {
      lines.push(`- 계약: ${cur.contracts.map((l) => l.name).join(", ")}`);
    }
  }
  const t = threadsWeekly(data, w);
  lines.push("■ 스레드(공통)");
  lines.push(
    `- 게시 ${t.postCount}건 · 노출 ${fmtNum(t.totalImpressions)} · 반응률 ${fmtPct(t.avgEngagementRate)} · 유입 리드 ${t.totalLeads}건`,
  );
  if (insights) {
    lines.push("■ 위험요인");
    for (const r of insights.risks) lines.push(`- ${r}`);
    lines.push("■ 다음 액션");
    for (const r of insights.recommendations) lines.push(`- ${r}`);
  }
  return lines.join("\n");
}
