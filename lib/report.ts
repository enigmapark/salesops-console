import { dealRate, safeDiv, sortByDealRateDesc, sumFunnels } from "./channel";
import { fmtNum, fmtPct, fmtWon } from "./format";
import { postsInMonth, summarizePosts, type ThreadSummary } from "./threads";
import type {
  AcquisitionSource,
  AppData,
  ChannelFunnel,
  Lead,
  Product,
  ReportComment,
} from "./types";

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

// 제품별 채널 내역 — 해당 월 신규 리드의 유입 채널 기준 (리드 많은 순)
export interface ProductChannelRow {
  source: AcquisitionSource;
  leads: number;
  deals: number;
}

export function productChannelBreakdown(
  leads: Lead[],
  month: string,
  product: Product,
): ProductChannelRow[] {
  const monthLeads = leads.filter(
    (l) => l.product === product && l.firstInquiry.startsWith(month),
  );
  const map = new Map<AcquisitionSource, ProductChannelRow>();
  for (const l of monthLeads) {
    const row = map.get(l.source) ?? { source: l.source, leads: 0, deals: 0 };
    row.leads += 1;
    if (l.status === "계약") row.deals += 1;
    map.set(l.source, row);
  }
  return [...map.values()].sort((a, b) => b.leads - a.leads || b.deals - a.deals);
}

// 전월 계산: "2026-01" → "2025-12"
export function prevMonthOf(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 전월 대비 증감 표기 — 비율(리드처럼 모수가 있을 때)
export function deltaLabel(cur: number, prev: number): string {
  if (prev === 0) return cur === 0 ? "전월과 동일" : `전월 0건 → ${cur}건`;
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return "전월과 동일";
  return pct > 0 ? `전월 대비 +${pct}%` : `전월 대비 ${pct}%`;
}

// 전월 대비 증감 표기 — 건수(계약처럼 수가 작을 때)
export function deltaCountLabel(cur: number, prev: number): string {
  const diff = cur - prev;
  if (diff === 0) return "전월과 동일";
  return diff > 0 ? `전월 대비 +${diff}건` : `전월 대비 ${diff}건`;
}

// 자동 요약 + 위험요인 + 다음 달 권장 액션 (규칙 기반)
export interface MonthlyInsights {
  summary: string[];
  risks: string[];
  recommendations: string[];
}

export function buildInsights(data: AppData, month: string, today: string): MonthlyInsights {
  const cur = buildMonthlyReport(data, month);
  const prev = buildMonthlyReport(data, prevMonthOf(month));

  const summary: string[] = [];
  const risks: string[] = [];
  const recommendations: string[] = [];

  // 1) 신규 리드 증감
  const totalNew = cur.lingo.newLeads + cur.neuro.newLeads;
  const prevNew = prev.lingo.newLeads + prev.neuro.newLeads;
  summary.push(`전체 신규 리드 ${totalNew}건 — ${deltaLabel(totalNew, prevNew)}`);

  // 2) 제품별 계약 증감
  summary.push(
    `링고 계약 ${cur.lingo.deals}건(${deltaCountLabel(cur.lingo.deals, prev.lingo.deals)}) · ` +
      `뉴로 계약 ${cur.neuro.deals}건(${deltaCountLabel(cur.neuro.deals, prev.neuro.deals)})`,
  );

  // 3) 전환율 최고 채널
  const top = cur.funnels.find((f) => (dealRate(f) ?? 0) > 0);
  if (top) {
    summary.push(`계약 전환율 최고 채널: ${top.source} (${fmtPct(dealRate(top))})`);
    recommendations.push(`전환율이 가장 높은 채널(${top.source})의 활동을 확대`);
  }

  // 4) 견적·계약 검토 단계 정체
  const stuck = data.leads.filter((l) => l.status === "제안·견적" || l.status === "계약 검토");
  const stuckOverdue = stuck.filter((l) => l.nextContact && l.nextContact <= today);
  const stuckNoNext = stuck.filter((l) => !l.nextContact);
  if (stuck.length > 0) {
    summary.push(
      `제안·견적/계약 검토 단계 리드 ${stuck.length}건 (연락일 지남 ${stuckOverdue.length}건 · 다음 연락일 미입력 ${stuckNoNext.length}건)`,
    );
  }
  if (stuckOverdue.length > 0) {
    recommendations.push(`견적·계약 검토 단계에서 연락일이 지난 ${stuckOverdue.length}건 우선 팔로업`);
  }
  if (stuckNoNext.length > 0) {
    recommendations.push(`견적·계약 검토 단계 ${stuckNoNext.length}건에 다음 연락일 등록`);
  }

  // 5) 미계약(이탈) 사유 분포 — 누적 기준
  const lost = data.leads.filter((l) => l.status === "이탈" && l.lostReason);
  if (lost.length > 0) {
    const counts = new Map<string, number>();
    for (const l of lost) counts.set(l.lostReason!, (counts.get(l.lostReason!) ?? 0) + 1);
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    summary.push(`주요 미계약 사유(누적): ${sorted.map(([r, n]) => `${r} ${n}건`).join(" · ")}`);
    const [topReason] = sorted[0];
    if (topReason === "가격부담") {
      recommendations.push("이탈 사유 '가격부담' 고객 대상 요금제 재제안 검토");
    } else if (topReason === "연락두절") {
      recommendations.push("연락두절 이탈 고객의 윈백 일정 점검");
    }
  }

  // 6) 관리 누락
  const noNextActive = data.leads.filter(
    (l) => l.status !== "계약" && l.status !== "이탈" && !l.nextContact,
  );
  if (noNextActive.length > 0) {
    recommendations.push(`다음 연락일이 비어 있는 활성 리드 ${noNextActive.length}건 입력`);
  }

  // 위험요인 — 경영진이 바로 물어볼 항목
  const activeLeads = data.leads.filter((l) => l.status !== "계약" && l.status !== "이탈");
  const overdueAll = activeLeads.filter((l) => l.nextContact && l.nextContact <= today);
  const staleAll = activeLeads.filter((l) => l.stale3m);
  const winbackDue = data.leads.filter(
    (l) => l.status === "이탈" && l.winbackDate && l.winbackDate <= today,
  );
  if (overdueAll.length > 0) risks.push(`다음 액션 예정일이 지난 리드 ${overdueAll.length}건`);
  if (stuck.length > 0)
    risks.push(`제안·견적/계약 검토 단계 정체 ${stuck.length}건 — 여기서 매출이 막혀 있음`);
  if (staleAll.length > 0) risks.push(`3개월 이상 미응답 리드 ${staleAll.length}건`);
  if (noNextActive.length > 0)
    risks.push(`다음 액션이 입력되지 않은 활성 리드 ${noNextActive.length}건 — 관리 누락 위험`);
  if (winbackDue.length > 0) risks.push(`윈백 예정일이 지난 이탈 고객 ${winbackDue.length}건`);
  if (risks.length === 0) risks.push("특이 위험요인 없음");

  if (recommendations.length === 0) {
    recommendations.push("특이 리스크 없음 — 현재 퍼널 유지");
  }
  return { summary, risks, recommendations };
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
export function buildCopyText(
  r: MonthlyReport,
  comment?: ReportComment,
  insights?: MonthlyInsights,
): string {
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

  if (insights) {
    lines.push("");
    lines.push("■ 핵심 요약");
    for (const s of insights.summary) lines.push(`- ${s}`);
    lines.push("■ 위험요인");
    for (const r of insights.risks) lines.push(`- ${r}`);
    lines.push("■ 다음 달 권장 액션");
    for (const rec of insights.recommendations) lines.push(`- ${rec}`);
  }

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
