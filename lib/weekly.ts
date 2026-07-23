import { fmtNum, fmtPct, fmtWon } from "./format";
import { summarizePosts, type ThreadSummary } from "./threads";
import { inWeek, type WeekRange } from "./week";
import { safeDiv } from "./channel";
import type { AppData, Lead, Product, WeeklyActivity, WeeklyAdStat } from "./types";
import type { MonthlyInsights } from "./report";

// 해당 주·제품의 매체별 광고 성과 (메타 먼저)
export function adStatsFor(data: AppData, weekStart: string, product: Product): WeeklyAdStat[] {
  return (data.weeklyAdStats ?? [])
    .filter((a) => a.weekStart === weekStart && a.product === product)
    .sort((a, b) => (a.source === b.source ? 0 : a.source === "메타광고" ? -1 : 1));
}

export function adCtr(a: WeeklyAdStat): number | null {
  return safeDiv(a.clicks, a.impressions);
}
export function adCpc(a: WeeklyAdStat): number | null {
  return safeDiv(a.spend, a.clicks);
}
export function adCpl(a: WeeklyAdStat): number | null {
  return safeDiv(a.spend, a.inquiries);
}

// 해당 주·제품의 세일즈 활동 기록 조회
export function activityFor(
  data: AppData,
  weekStart: string,
  product: Product,
): WeeklyActivity | undefined {
  return (data.weeklyActivities ?? []).find(
    (a) => a.weekStart === weekStart && a.product === product,
  );
}

// 주간 현황 집계 — 링고/뉴로 각각 계산한다 (다른 상품이므로 합산 금지)
export interface ProductWeekly {
  newLeads: Lead[]; // 이번 주 유입
  contracts: Lead[]; // 이번 주 신규 계약 (업셀 제외)
  upsells: Lead[]; // 이번 주 기존 고객 부가서비스 업셀
  mrr: number; // 이번 주 계약+업셀의 월 반복매출 (둘 다 매출이므로 포함)
  oneOff: number; // 이번 주 계약의 일회성 매출(세팅비)
}

export function productWeekly(leads: Lead[], w: WeekRange, product: Product): ProductWeekly {
  const P = leads.filter((l) => l.product === product);
  const newLeads = P.filter((l) => inWeek(l.firstInquiry, w));
  const closed = P.filter((l) => l.status === "계약" && inWeek(l.contractDate, w));
  const contracts = closed.filter((l) => !l.isUpsell); // 신규 계약만
  const upsells = closed.filter((l) => l.isUpsell); // 업셀 별도
  return {
    newLeads,
    contracts,
    upsells,
    mrr: closed.reduce((s, l) => s + (l.monthlyFee ?? 0), 0), // 신규+업셀 모두 MRR
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
      `- 신규 리드 ${cur.newLeads.length}건 (전주 ${prev.newLeads.length}건) · 신규 계약 ${cur.contracts.length}건${cur.upsells.length > 0 ? ` · 업셀 ${cur.upsells.length}건` : ""} · 신규 MRR ${fmtWon(cur.mrr)}${cur.oneOff > 0 ? ` + 일회성 ${fmtWon(cur.oneOff)}` : ""}`,
    );
    if (cur.newLeads.length > 0) {
      lines.push(`- 신규: ${cur.newLeads.map((l) => `${l.name}(${l.source})`).join(", ")}`);
    }
    if (cur.contracts.length > 0) {
      lines.push(`- 신규 계약: ${cur.contracts.map((l) => l.name).join(", ")}`);
    }
    if (cur.upsells.length > 0) {
      lines.push(`- 업셀: ${cur.upsells.map((l) => l.name).join(", ")}`);
    }
    for (const a of adStatsFor(data, w.start, p)) {
      const label = a.source === "메타광고" ? "메타" : "네이버";
      const cpl = adCpl(a);
      lines.push(
        `- 광고(${label}): 소진 ${fmtWon(a.spend)} · 노출 ${fmtNum(a.impressions)} · 클릭 ${fmtNum(a.clicks)} (CTR ${fmtPct(adCtr(a), 2)}) · 문의 ${a.inquiries}건${cpl !== null ? ` · CPL ${fmtWon(cpl)}` : ""}`,
      );
    }
    const act = activityFor(data, w.start, p);
    if (act && (act.coldEmails > 0 || act.calls > 0 || act.meetings > 0)) {
      lines.push(
        `- 활동: 콜드메일 ${act.coldEmails}건 · 통화 ${act.calls}건 · 미팅 ${act.meetings}건${act.note ? ` (${act.note})` : ""}`,
      );
    }
  }
  const comp = data.leads.filter((l) => l.competitor);
  if (comp.length > 0) {
    lines.push("■ 경쟁사에서 넘어오는 리드 (이관·경합)");
    for (const l of comp) {
      lines.push(`- [${l.product}] ${l.name} — ${l.competitor}에서 이관 추진 중 (현재 ${l.status})`);
    }
  }
  const compStats = (data.weeklyCompetitorStats ?? []).filter((s) => s.weekStart === w.start);
  if (compStats.length > 0) {
    lines.push("■ 경쟁사 문의 현황 (링고 · 시장 벤치마크)");
    lines.push(`- ${compStats.map((s) => `${s.competitor} ${s.inquiries}건`).join(" · ")}`);
  }
  const t = threadsWeekly(data, w);
  lines.push("■ 무료 채널 게시");
  lines.push(
    `- 게시 ${t.postCount}건 · 노출 ${fmtNum(t.totalImpressions)} · 반응률 ${fmtPct(t.avgEngagementRate)} · 유입 리드 ${t.totalLeads}건`,
  );
  if (insights) {
    lines.push("■ 위험요인");
    for (const r of insights.risks) lines.push(`- ${r}`);
    lines.push("■ 다음 액션");
    for (const r of insights.recommendations) lines.push(`- ${r}`);
  }
  const note = (data.weeklyNotes ?? []).find((n) => n.weekStart === w.start)?.text?.trim();
  if (note) {
    lines.push("■ 코멘트");
    for (const ln of note.split("\n")) lines.push(ln.trim() ? `- ${ln.trim()}` : "");
  }
  return lines.join("\n");
}
