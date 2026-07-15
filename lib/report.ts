import { dealRate, safeDiv, sortByDealRateDesc, sumFunnels } from "./channel";
import { fmtNum, fmtPct, fmtWon } from "./format";
import { postsInMonth, summarizePosts, type ThreadSummary } from "./threads";
import type { AppData, ChannelFunnel, Lead, Product, ReportComment } from "./types";

// PRD 5.6 — 월간 보고 자동 집계
// 제품별 집계는 "해당 월에 처음 문의한(firstInquiry) 리드" 기준 코호트로 계산한다.
export interface ProductMonthly {
  newLeads: number;
  deals: number;
  conversionRate: number | null;
}

export function productMonthly(leads: Lead[], month: string, product: Product): ProductMonthly {
  const monthLeads = leads.filter(
    (l) => l.product === product && l.firstInquiry.startsWith(month),
  );
  const deals = monthLeads.filter((l) => l.status === "계약").length;
  return {
    newLeads: monthLeads.length,
    deals,
    conversionRate: safeDiv(deals, monthLeads.length),
  };
}

export interface MonthlyReport {
  month: string;
  lingo: ProductMonthly;
  neuro: ProductMonthly;
  funnels: ChannelFunnel[]; // 해당 월 채널 행 (계약전환율 내림차순)
  channelTotals: ReturnType<typeof sumFunnels>;
  channelConversion: number | null;
  threads: ThreadSummary;
}

export function buildMonthlyReport(data: AppData, month: string): MonthlyReport {
  const funnels = sortByDealRateDesc(data.funnels.filter((f) => f.period === month));
  const channelTotals = sumFunnels(funnels);
  return {
    month,
    lingo: productMonthly(data.leads, month, "링고"),
    neuro: productMonthly(data.leads, month, "뉴로"),
    funnels,
    channelTotals,
    channelConversion: safeDiv(channelTotals.deals, channelTotals.leads),
    threads: summarizePosts(postsInMonth(data.threadPosts, month)),
  };
}

// 월 선택 드롭다운용 — 데이터가 존재하는 모든 월 (최신 먼저)
export function availableMonths(data: AppData): string[] {
  const set = new Set<string>();
  data.leads.forEach((l) => set.add(l.firstInquiry.slice(0, 7)));
  data.funnels.forEach((f) => set.add(f.period));
  data.threadPosts.forEach((p) => set.add(p.date.slice(0, 7)));
  return [...set].sort().reverse();
}

// "복사용 텍스트 생성" — 슬랙에 그대로 붙여넣는 플레인 텍스트
export function buildCopyText(r: MonthlyReport, comment?: ReportComment): string {
  const lines: string[] = [];
  lines.push(`[Account Team 월간 보고] ${r.month}`);
  lines.push("");
  lines.push("■ 링고 (인터넷신문 CMS)");
  lines.push(
    `- 신규 리드 ${r.lingo.newLeads}건 · 계약 ${r.lingo.deals}건 · 전환율 ${fmtPct(r.lingo.conversionRate)}`,
  );
  lines.push("■ 뉴로 (AI 광고)");
  lines.push(
    `- 신규 리드 ${r.neuro.newLeads}건 · 계약 ${r.neuro.deals}건 · 전환율 ${fmtPct(r.neuro.conversionRate)}`,
  );
  lines.push("■ 채널 합계");
  lines.push(
    `- 리드 ${fmtNum(r.channelTotals.leads)}건 · 계약 ${fmtNum(r.channelTotals.deals)}건 · 전환율 ${fmtPct(r.channelConversion)} · 광고비 ${fmtWon(r.channelTotals.spend)}`,
  );
  const top = r.funnels.filter((f) => (dealRate(f) ?? 0) > 0).slice(0, 3);
  if (top.length > 0) {
    lines.push(
      `- 전환율 상위: ${top.map((f) => `${f.source} ${fmtPct(dealRate(f))}`).join(" / ")}`,
    );
  }
  lines.push("■ 스레드");
  lines.push(
    `- 게시 ${r.threads.postCount}건 · 노출 ${fmtNum(r.threads.totalImpressions)} · 평균 반응률 ${fmtPct(r.threads.avgEngagementRate)} · 유입 리드 ${r.threads.totalLeads}건`,
  );

  if (comment) {
    const sections: [string, string | undefined][] = [
      ["WHY", comment.why],
      ["HOW", comment.how],
      ["WHAT", comment.what],
      ["링고", comment.lingoNote],
      ["뉴로", comment.neuroNote],
      ["스레드", comment.threadNote],
    ];
    const filled = sections.filter(([, v]) => v && v.trim());
    if (filled.length > 0) lines.push("");
    for (const [label, value] of filled) {
      lines.push(`[${label}] ${value!.trim()}`);
    }
  }
  return lines.join("\n");
}
