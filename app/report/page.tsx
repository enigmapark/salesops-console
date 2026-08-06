"use client";

import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { safeDiv } from "@/lib/channel";
import { contractsInMonth, newMrrInMonth, upsellsInMonth } from "@/lib/exec";
import { fmtNum, fmtPct, fmtWon } from "@/lib/format";
import { revenueOf, revenueTotals, revenuesFor } from "@/lib/revenue";
import { AD_LABEL, adCplMonthly, adSpendInMonth, adTotals, monthlyAdStatsFor } from "@/lib/ads";
import { RevenueDetailCard } from "@/components/RevenueDetailCard";
import {
  availableMonths,
  buildCopyText,
  buildInsights,
  buildMonthlyReport,
  deltaCountLabel,
  deltaLabel,
  prevMonthOf,
  productChannelBreakdown,
} from "@/lib/report";
import type { Product } from "@/lib/types";
import { getToday } from "@/lib/today";
import { useAppData } from "@/lib/use-app-data";
import type { ReportComment } from "@/lib/types";

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

function emptyComment(month: string): ReportComment {
  return { month, why: "", how: "", what: "" };
}

export default function ReportPage() {
  const { data, update } = useAppData();
  const [month, setMonth] = useState<string>(getToday().slice(0, 7));
  const [draft, setDraft] = useState<ReportComment>(emptyComment(month));
  const [copyText, setCopyText] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // 월이 바뀌면(또는 데이터가 처음 로드되면) 저장된 코멘트를 불러온다.
  // loadedMonth 가드가 없으면 코멘트 저장 때마다 data가 바뀌면서
  // 방금 생성한 복사용 텍스트까지 초기화돼 버린다.
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  useEffect(() => {
    if (!data || loadedMonth === month) return;
    const saved = data.reportComments.find((c) => c.month === month);
    setDraft(saved ? { ...saved } : emptyComment(month));
    setCopyText("");
    setCopied(false);
    setLoadedMonth(month);
  }, [data, month, loadedMonth]);

  const months = useMemo(() => (data ? availableMonths(data) : []), [data]);
  const report = useMemo(() => (data ? buildMonthlyReport(data, month) : null), [data, month]);
  const prevReport = useMemo(
    () => (data ? buildMonthlyReport(data, prevMonthOf(month)) : null),
    [data, month],
  );
  const insights = useMemo(
    () => (data ? buildInsights(data, month, getToday()) : null),
    [data, month],
  );

  if (!data || !report) {
    return <p className="py-16 text-center text-sm text-zinc-400">불러오는 중…</p>;
  }

  // 이 달(첫 문의 기준)에 들어와 계약된 리드 — 건수·예상 금액
  const monthDealLeads = data.leads.filter(
    (l) => l.firstInquiry.startsWith(month) && l.status === "계약",
  );
  const monthDealCount = monthDealLeads.length;

  // 제품별 광고비 (해당 월 매체별 광고 성과의 소진 금액 합 — 실데이터)
  const spendBy = (p: Product) => adSpendInMonth(data, month, p);
  const totalNewLeads = report.lingo.newLeads + report.neuro.newLeads;

  // 당월 계약(계약일 기준) — 유입 월과 무관하게 이 달에 계약된 고객 (건수는 업셀 제외)
  const closedThisMonth = contractsInMonth(data.leads, month);
  const closedBy = (p: Product) => closedThisMonth.filter((l) => l.product === p);
  // MRR은 업셀도 반복매출이므로 신규 계약 + 업셀을 함께 합산 (총합 newMrrInMonth과 일치)
  const mrrLeads = [...closedThisMonth, ...upsellsInMonth(data.leads, month)];
  const mrrBy = (p: Product) =>
    mrrLeads.filter((l) => l.product === p).reduce((s, l) => s + (l.monthlyFee ?? 0), 0);
  const totalNewMrr = newMrrInMonth(data.leads, month);

  const setField = (key: keyof ReportComment, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const saveComment = () => {
    update((d) => ({
      ...d,
      reportComments: [...d.reportComments.filter((c) => c.month !== month), { ...draft, month }],
    }));
  };

  const generateCopyText = () => {
    // 화면의 최신 코멘트(저장 전 입력 포함)로 생성하고, 저장도 같이 해 둔다
    saveComment();
    setCopyText(buildCopyText(report, { ...draft, month }, insights ?? undefined));
    setCopied(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
    } catch {
      // 클립보드 권한이 없으면 사용자가 텍스트를 직접 선택해 복사하면 된다
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold">월간 보고</h1>
          <p className="text-xs text-zinc-500">지표는 자동 집계 · 코멘트만 작성하면 됩니다</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)}>
            {!months.includes(month) && <option value={month}>{month}</option>}
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            onClick={() => window.print()}
            className="whitespace-nowrap rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            인쇄
          </button>
        </div>
      </div>

      <h2 className="hidden text-lg font-bold print:block">[Lingo·Neuro 월간 보고] {month}</h2>

      {/* 이번 달 결론 — 맨 위 10초 요약 (성과·리스크·결정 필요) */}
      {(() => {
        const cmt = data.reportComments.find((c) => c.month === month);
        if (!cmt?.headline && !cmt?.decisions) return null;
        return (
          <section className="rounded-xl border-2 border-indigo-600 bg-indigo-50/40 p-4">
            <h2 className="mb-1.5 text-sm font-bold text-indigo-900">
              이번 달 결론{" "}
              <span className="text-xs font-normal text-indigo-400">{month} · 10초 요약</span>
            </h2>
            {cmt.headline && (
              <p className="text-sm leading-relaxed text-zinc-800">{cmt.headline}</p>
            )}
            {(() => {
              const pnl = (data.monthlyPnls ?? []).find(
                (p) => p.month === month && p.product === "뉴로",
              );
              const dev = (data.devReviews ?? []).find(
                (r) => r.month === month && r.product === "링고",
              );
              const lingoRev = revenueOf(data, month, "링고")?.actualPayment;
              if (!pnl && !dev && lingoRev == null) return null;
              const parts: string[] = [];
              if (lingoRev != null && dev?.serverAiCost != null) {
                const lm = lingoRev - dev.serverAiCost - spendBy("링고");
                const lr = lingoRev > 0 ? (lm / lingoRev) * 100 : 0;
                parts.push(`링고 마진 ${fmtWon(lm)} · ${lr.toFixed(1)}%`);
              } else if (lingoRev != null || dev?.revenueVsCostRate != null) {
                parts.push(
                  `링고 실결제 ${lingoRev != null ? fmtWon(lingoRev) : "–"}${dev?.revenueVsCostRate != null ? ` · 서버·AI 비용율 ${dev.revenueVsCostRate}%` : ""}`,
                );
              }
              if (pnl) {
                const m = pnl.revenueSupply - pnl.totalCost - spendBy("뉴로");
                const rate = pnl.revenueSupply > 0 ? (m / pnl.revenueSupply) * 100 : 0;
                parts.push(`뉴로 마진 ${fmtWon(m)} · ${rate.toFixed(1)}%`);
              }
              if (parts.length === 0) return null;
              return (
                <div className="mt-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-700">
                  <span className="font-semibold text-emerald-700">수익성</span>{" "}
                  <span className="text-[11px] font-normal text-zinc-400">(원가·광고비 차감)</span> ·{" "}
                  {parts.join(" / ")}
                  <p className="mt-1 text-[10px] font-normal text-zinc-400">
                    ※ 마진율 분모 = 뉴로는 공급가(VAT 제외) · 링고는 실결제 기준
                  </p>
                </div>
              );
            })()}
            {cmt.decisions && (
              <div className="mt-2 rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm text-zinc-700">
                <span className="font-semibold text-indigo-700">경영진 결정·지원 필요</span>
                <div className="mt-1 whitespace-pre-line">{cmt.decisions}</div>
              </div>
            )}
            {cmt.nextTargets && (
              <div className="mt-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700">
                <span className="font-semibold text-zinc-800">다음 달(8월) 목표</span>
                <div className="mt-1 whitespace-pre-line">{cmt.nextTargets}</div>
              </div>
            )}
          </section>
        );
      })()}

      {/* 월간 Sales 현황 — 한 장 요약 (제품별: 돈·효율·전망) */}
      <section className="rounded-xl border-2 border-zinc-900 bg-white p-4">
        <h2 className="mb-1 text-sm font-bold">
          월간 Sales 현황
          <span className="ml-1.5 text-xs font-normal text-zinc-400">{month} · 제품별</span>
        </h2>
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <span className="rounded-full bg-zinc-900 px-2 py-0.5 font-semibold text-white">
            {month === getToday().slice(0, 7) ? "잠정 실적 (마감 전)" : "확정 실적"}
          </span>
          <span className="text-zinc-400">
            최종 업데이트:{" "}
            {data.lastUpdated
              ? new Date(data.lastUpdated).toLocaleString("ko-KR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "미기록"}
          </span>
          <span className="text-zinc-400">· 돈(실결제·MRR) · 효율(CAC) · 전망(마감 예상)</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {(["링고", "뉴로"] as Product[]).map((product) => {
            const pLeads = data.leads.filter((l) => l.product === product);
            const prevM = prevMonthOf(month);
            const deals = contractsInMonth(pLeads, month).length;
            // 전월 계약 수는 매출 원장(월별 체결)에 과거 이력이 있어 그쪽을 우선 사용
            const prevDeals = revenueOf(data, prevM, product)?.deals ?? contractsInMonth(pLeads, prevM).length;
            const mrr = newMrrInMonth(pLeads, month);
            const prevMrr = newMrrInMonth(pLeads, prevM);
            const rev = revenueOf(data, month, product);
            const prevRev = revenueOf(data, prevM, product);
            const spend = spendBy(product);
            const cac = deals > 0 ? Math.round(spend / deals) : null;
            const fc = (data.monthlyForecasts ?? []).find(
              (f) => f.month === month && f.product === product,
            );
            const tgt = (data.monthlyTargets ?? []).find(
              (t) => t.month === month && t.product === product,
            );
            const pctOf = (a: number, t: number) => (t > 0 ? `${Math.round((a / t) * 100)}%` : "–");
            const cumDeals = revenueTotals(data, product).deals; // 지금까지 누적 계약(체결)
            return (
              <div key={product} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="mb-2 text-xs font-semibold text-zinc-600">
                  {product}{" "}
                  <span className="font-normal text-zinc-400">
                    {product === "링고" ? "인터넷신문 CMS" : "AI 광고"}
                  </span>
                  {cumDeals > 0 && (
                    <span className="ml-1.5 font-normal text-zinc-400">· 누적 계약 {cumDeals}건</span>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <KpiCard
                    label="이번 달 실결제"
                    value={rev ? fmtWon(rev.actualPayment) : "–"}
                    sub={
                      rev && prevRev
                        ? deltaLabel(rev.actualPayment, prevRev.actualPayment)
                        : rev
                          ? "전월 데이터 없음"
                          : "매출 데이터 미입력"
                    }
                  />
                  <KpiCard
                    label="신규 MRR"
                    value={fmtWon(mrr)}
                    sub={`신규 계약 ${deals}건 · ${deltaCountLabel(deals, prevDeals)}`}
                  />
                  <KpiCard
                    label="광고 CAC"
                    value={cac !== null ? fmtWon(cac) : "–"}
                    sub={deals > 0 ? `광고비 ${fmtWon(spend)} ÷ ${deals}건` : `광고비 ${fmtWon(spend)} · 계약 0건`}
                  />
                  <KpiCard
                    label="이달 마감 예상"
                    value={fc ? `${fc.expectedDeals}건` : "–"}
                    sub={fc ? `현재 ${deals}건 완료` : "예상치 미입력"}
                  />
                </div>
                {tgt ? (
                  <div className="mt-2 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] text-zinc-600">
                    <span className="font-semibold text-zinc-500">목표 대비</span> · 실결제{" "}
                    {rev ? pctOf(rev.actualPayment, tgt.revenueTarget) : "–"} · MRR{" "}
                    {pctOf(mrr, tgt.mrrTarget)} · 계약 {pctOf(deals, tgt.dealTarget)}
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-zinc-400">목표 미설정</div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-zinc-400">
          CAC = 이 달 광고비 ÷ 신규 계약 수(업셀 제외) · 실결제는 결제 원장 기준(리드 계약수와 별개) · MRR은
          신규+업셀 월 반복매출
        </p>
      </section>

      {/* SaaS 유닛 이코노믹스 — 총이익률·CAC 회수기간 (단월 마진보다 정확한 SaaS 수익성) */}
      {(() => {
        const rows = (["링고", "뉴로"] as Product[]).map((product) => {
          const pnl = (data.monthlyPnls ?? []).find(
            (p) => p.month === month && p.product === product,
          );
          const dev = (data.devReviews ?? []).find(
            (r) => r.month === month && r.product === product,
          );
          const rev =
            product === "링고"
              ? (revenueOf(data, month, "링고")?.actualPayment ?? null)
              : (pnl?.revenueSupply ?? null);
          const cogs = product === "링고" ? (dev?.serverAiCost ?? null) : (pnl?.totalCost ?? null);
          const gm = rev != null && cogs != null && rev > 0 ? ((rev - cogs) / rev) * 100 : null;
          const pLeads = data.leads.filter((l) => l.product === product);
          const deals = contractsInMonth(pLeads, month).length;
          const cac = deals > 0 ? spendBy(product) / deals : null;
          const mrrPer = deals > 0 ? newMrrInMonth(pLeads, month) / deals : null;
          const monthlyGP = mrrPer != null && gm != null ? mrrPer * (gm / 100) : null;
          const payback = cac != null && monthlyGP != null && monthlyGP > 0 ? cac / monthlyGP : null;
          // LTV = 고객당 월 총이익 × 유지 개월수
          // 링고: 계약 12개월 약정 기준 / 뉴로: 약정 없음 → 보수적 12개월 가정(churn 데이터 확보 전)
          const LIFETIME = 12;
          const ltvBasis = product === "링고" ? "계약 12개월 기준" : "약정 없음 · 12개월 가정";
          const ltv = monthlyGP != null ? monthlyGP * LIFETIME : null;
          const ltvCac = ltv != null && cac != null && cac > 0 ? ltv / cac : null;
          // 링고 개선 가능 영역: 세팅비(약 20만) 일회성 별도 + 1년 계약 후 월요금 7만→15만원 인상 → 실제 4~5:1
          const ltvNote =
            product === "링고"
              ? "세팅비 별도 + 1년 후 월 7만→15만원↑ 반영 시 실제 4~5:1"
              : null;
          return { product, gm, cac, payback, ltv, ltvCac, ltvBasis, ltvNote };
        });
        if (!rows.some((r) => r.gm != null || r.cac != null)) return null;
        return (
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-1 text-sm font-semibold">
              {month} SaaS 유닛 이코노믹스{" "}
              <span className="text-xs font-normal text-zinc-400">단월 마진보다 정확한 SaaS 수익성</span>
            </h2>
            <p className="mb-3 text-[11px] text-zinc-400">
              단월 마진은 이번 달 광고비를 한 달 매출에만 붙여 SaaS(구독)를 과소평가한다. 총이익률과 CAC
              회수기간이 실제 그림.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {rows.map((r) => (
                <div key={r.product} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-zinc-600">{r.product}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[11px] text-zinc-500">총이익률</p>
                      <p className="text-base font-bold">
                        {r.gm != null ? `${r.gm.toFixed(1)}%` : "–"}
                      </p>
                      <p className="text-[10px] text-zinc-400">매출−원가(광고 전)</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-zinc-500">광고 CAC</p>
                      <p className="text-base font-bold">
                        {r.cac != null ? fmtWon(Math.round(r.cac)) : "–"}
                      </p>
                      <p className="text-[10px] text-zinc-400">계약당 광고비</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-zinc-500">CAC 회수</p>
                      <p className="text-base font-bold">
                        {r.payback != null ? `~${r.payback.toFixed(1)}개월` : "–"}
                      </p>
                      <p className="text-[10px] text-zinc-400">12개월↓ 건강</p>
                    </div>
                  </div>
                  <div className="mt-2 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-indigo-700">
                        LTV / CAC <span className="font-normal text-indigo-400">(12개월 가정)</span>
                      </span>
                      <span className="text-sm font-bold text-indigo-700">
                        {r.ltvCac != null ? `${r.ltvCac.toFixed(1)} : 1` : "–"}
                      </span>
                    </div>
                    {r.ltv != null && (
                      <p className="mt-0.5 text-[10px] text-indigo-400">
                        LTV ~{fmtWon(r.ltv)} · {r.ltvBasis}
                      </p>
                    )}
                    {r.ltvNote && (
                      <p className="mt-1 rounded bg-white px-1.5 py-1 text-[10px] font-medium text-emerald-600">
                        ↑ {r.ltvNote}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-md bg-zinc-50 p-2.5 text-[11px] leading-relaxed text-zinc-500">
              <b>해석</b> · SaaS 총이익률 벤치마크는 70~80%인데 AI 토큰·추론 원가로 저희는 42~44%로
              낮습니다 — 원가 절감·가격 인상이 수익 천장을 올리는 레버입니다. 반면 CAC 회수기간이 짧아
              (구독 누적) LTV/CAC가 업계 건강 기준(<b>3:1</b> · CAC가 고객가치의 33% 이하)을 웃돕니다 —
              링고는 12개월 계약 기준 3.1:1(순수 구독·보수 하한)이고, 여기에 <b>세팅비(별도)</b>와 <b>1년
              계약 후 월요금 7만→15만원 인상</b>을 반영하면 <b>실제 4~5:1</b>까지 개선 가능합니다. 뉴로는
              약정이 없어도 6.3:1로, 둘 다 광고를 더 써도 되는 여력이 있다는 뜻입니다(특히 뉴로는 회수
              1.9개월). 단, 이 마진은 인건비·고정비 전이라 순이익은 아직입니다(성장기 정상) — 규모로
              고정비를 희석하는 국면입니다.
            </p>
            <div className="mt-2 rounded-md border border-zinc-200 bg-white p-3 text-[11px] leading-relaxed text-zinc-500">
              <p className="mb-1.5 font-semibold text-zinc-600">지표 읽는 법 · 측정 기준</p>
              <ul className="space-y-1">
                <li>
                  · <b>총이익률</b> — 높을수록 좋고, 업계 평균(SaaS 70~80%)이 기준선입니다.
                </li>
                <li>
                  · <b>CAC 회수기간</b> — 짧을수록 좋고, 12개월 이내면 건강합니다.
                </li>
                <li>
                  · <b>LTV/CAC</b> — 3:1 이상이면 건강하고, 5:1을 넘으면 광고 여력이 큽니다(더 써도 됩니다).
                </li>
              </ul>
              <p className="mt-2 border-t border-zinc-100 pt-2 text-zinc-400">
                <b>측정 기준</b> · CAC는 <b>광고비만</b> 반영합니다(영업·마케팅 인건비·공통 운영비 제외) · LTV는
                유지기간 가정치입니다(<b>링고=계약 12개월</b>, <b>뉴로=약정 없어 12개월 보수 가정</b>) · 실제
                LTV·해지율·NRR은 <b>8월부터 신규·업셀·다운셀·해지 MRR을 구분해 측정할 예정</b>입니다.
              </p>
            </div>
          </section>
        );
      })()}

      {/* 제품 비교 — 광고비·리드·계약을 한눈에 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">{month} 제품 비교 (한눈에)</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                <th className="py-2 font-medium">구분</th>
                <th className="py-2 text-right font-medium">링고</th>
                <th className="py-2 text-right font-medium">뉴로</th>
                <th className="py-2 text-right font-medium">전체</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-100">
                <td className="py-2.5 font-medium">광고비 (소진)</td>
                <td className="py-2.5 text-right tabular-nums">{fmtWon(spendBy("링고"))}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtWon(spendBy("뉴로"))}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">
                  {fmtWon(spendBy("링고") + spendBy("뉴로"))}
                </td>
              </tr>
              <tr className="border-b border-zinc-100">
                <td className="py-2.5 font-medium">리드 획득</td>
                <td className="py-2.5 text-right tabular-nums">{fmtNum(report.lingo.newLeads)}건</td>
                <td className="py-2.5 text-right tabular-nums">{fmtNum(report.neuro.newLeads)}건</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">
                  {fmtNum(totalNewLeads)}건
                </td>
              </tr>
              <tr className="border-b border-zinc-100">
                <td className="py-2.5 font-medium">당월 계약 (계약일 기준)</td>
                <td className="py-2.5 text-right tabular-nums">{fmtNum(closedBy("링고").length)}건</td>
                <td className="py-2.5 text-right tabular-nums">{fmtNum(closedBy("뉴로").length)}건</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">
                  {fmtNum(closedThisMonth.length)}건
                </td>
              </tr>
              <tr className="border-b border-zinc-100">
                <td className="py-2.5 font-medium">신규 MRR (월 반복매출)</td>
                <td className="py-2.5 text-right tabular-nums">{fmtWon(mrrBy("링고"))}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtWon(mrrBy("뉴로"))}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">{fmtWon(totalNewMrr)}</td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium">코호트 전환율 (유입월 기준)</td>
                <td className="py-2.5 text-right tabular-nums">{fmtPct(report.lingo.conversionRate)}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtPct(report.neuro.conversionRate)}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">
                  {fmtPct(safeDiv(monthDealCount, totalNewLeads))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-zinc-400">
          당월 계약 = 이 달에 계약된 고객(이전 달 유입 포함) · 코호트 전환율 = 이 달 유입 리드 중
          최종 계약 비율 · 광고비의 공통 채널분은 전체에만 포함
        </p>
      </section>

      {/* 매출 상세 — 제품별 월별 결제 원장 (실데이터, 데이터 있는 제품만 표시) */}
      {(["링고", "뉴로"] as Product[]).map((product) => {
        // 매출 발생 행만 (카운트 전용 placeholder 행 제외), 최신순
        const rows = revenuesFor(data, product).filter(
          (r) => r.actualPayment > 0 || r.contractAmount > 0,
        );
        if (rows.length === 0) return null;
        return <RevenueDetailCard key={`rev-${product}`} product={product} month={month} rows={rows} />;
      })}

      {/* 제품별 집계 — 링고 / 뉴로 각각 신규 리드·계약·채널 내역 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {(["링고", "뉴로"] as Product[]).map((product) => {
          const cur = product === "링고" ? report.lingo : report.neuro;
          const prev = prevReport
            ? product === "링고"
              ? prevReport.lingo
              : prevReport.neuro
            : null;
          const channels = productChannelBreakdown(data.leads, month, product);
          const pLeads = data.leads.filter((l) => l.product === product);
          const dealsCM = contractsInMonth(pLeads, month).length;
          // 전월 계약 수는 매출 원장(월별 체결)에 과거 이력이 있어 그쪽을 우선 사용
          const dealsCMPrev =
            revenueOf(data, prevMonthOf(month), product)?.deals ??
            (prevReport ? contractsInMonth(pLeads, prevMonthOf(month)).length : 0);
          const amountCM = contractsInMonth(pLeads, month).reduce((s, l) => s + l.expectedAmount, 0);
          return (
            <section key={product} className="rounded-xl border border-zinc-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold">
                {product}
                <span className="ml-1.5 text-xs font-normal text-zinc-400">
                  {product === "링고" ? "인터넷신문 CMS" : "AI 광고"}
                </span>
              </h2>
              <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard
                  label="신규 리드"
                  value={fmtNum(cur.newLeads)}
                  sub={prev ? deltaLabel(cur.newLeads, prev.newLeads) : undefined}
                />
                <KpiCard
                  label="당월 계약"
                  value={`${fmtNum(dealsCM)}건`}
                  sub={`${prev ? deltaCountLabel(dealsCM, dealsCMPrev) : ""}${amountCM > 0 ? ` · ${fmtWon(amountCM)}` : ""}`}
                />
                <KpiCard
                  label="광고비 (소진)"
                  value={spendBy(product) > 0 ? fmtWon(spendBy(product)) : "0원"}
                  sub="해당 월 매체 광고비 합계"
                  small
                />
                <KpiCard
                  label="코호트 전환율"
                  value={fmtPct(cur.conversionRate)}
                  sub="이 달 유입 리드 중 계약"
                />
              </div>
              {channels.length === 0 ? (
                <p className="rounded-lg bg-zinc-50 py-3 text-center text-xs text-zinc-400">
                  이 달 {product} 신규 리드가 없습니다.
                </p>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                        <th className="py-1.5 font-medium">유입 채널</th>
                        <th className="py-1.5 text-right font-medium">유입 리드</th>
                        <th className="py-1.5 text-right font-medium">그중 계약</th>
                      </tr>
                    </thead>
                    <tbody>
                      {channels.map((c) => (
                        <tr key={c.source} className="border-b border-zinc-100 last:border-0">
                          <td className="py-1.5">{c.source}</td>
                          <td className="py-1.5 text-right tabular-nums">{fmtNum(c.leads)}</td>
                          <td className="py-1.5 text-right tabular-nums">{fmtNum(c.deals)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-[11px] text-zinc-400">
                    이 표·코호트 전환율은 <b>이 달 유입 리드</b> 기준 · 위 &ldquo;당월 계약&rdquo;({dealsCM}건)은
                    계약일 기준이라 숫자가 다를 수 있음(이전 달 유입분이 이번 달 계약된 경우 포함)
                  </p>
                </>
              )}
            </section>
          );
        })}
      </div>

      {/* 전체 합계 — 실제 리드·계약 기준으로 통일 (계약일 기준) */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="당월 계약 (계약일 기준)"
          value={`${fmtNum(closedThisMonth.length)}건`}
          sub={`${prevReport ? deltaCountLabel(closedThisMonth.length, contractsInMonth(data.leads, prevMonthOf(month)).length) : ""} · 업셀 제외`}
        />
        <KpiCard
          label="전체 신규 MRR"
          value={fmtWon(totalNewMrr)}
          sub="이 달 신규+업셀 월 반복매출"
        />
      </div>

      {/* 자동 요약 + 위험요인 + 권장 액션 */}
      {insights && (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">{month} 핵심 요약 (자동)</h2>
            <ul className="space-y-1.5 text-sm text-zinc-700">
              {insights.summary.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-zinc-300">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-rose-600">위험요인 (자동)</h2>
            <ul className="space-y-1.5 text-sm text-zinc-700">
              {insights.risks.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-rose-300">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-emerald-700">다음 달 권장 액션 (자동)</h2>
            <ul className="space-y-1.5 text-sm text-zinc-700">
              {insights.recommendations.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-semibold text-emerald-500">{i + 1}.</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {/* 월간 광고 성과 — 매체별 (실데이터: 광고비·노출·클릭·문의·CPL) */}
      {(["링고", "뉴로"] as Product[]).some((p) => monthlyAdStatsFor(data, month, p).length > 0) && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">
            {month} 월간 광고 성과{" "}
            <span className="text-xs font-normal text-zinc-400">(매체별 · 광고비·문의·CPL)</span>
          </h2>
          <div className="space-y-6">
            {(["링고", "뉴로"] as Product[]).map((product) => {
              const rows = monthlyAdStatsFor(data, month, product);
              if (rows.length === 0) return null;
              const t = adTotals(rows);
              return (
                <div key={product}>
                  <h3 className="mb-1.5 text-xs font-semibold text-zinc-500">
                    {product}{" "}
                    <span className="font-normal text-zinc-400">
                      광고비 {fmtWon(t.spend)} · 문의 {t.inquiries}건
                    </span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                          <th className="py-2 font-medium">매체</th>
                          <th className="py-2 text-right font-medium">광고비</th>
                          <th className="py-2 text-right font-medium">노출</th>
                          <th className="py-2 text-right font-medium">클릭</th>
                          <th className="py-2 text-right font-medium">문의</th>
                          <th className="py-2 text-right font-medium">CPL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((a) => {
                          const cpl = adCplMonthly(a);
                          return (
                            <tr key={a.id} className="border-b border-zinc-100 last:border-0">
                              <td className="py-2 align-top">
                                <span className="whitespace-nowrap">{AD_LABEL[a.source]}</span>
                                {a.note && (
                                  <span className="ml-1 text-[10px] text-amber-600">({a.note})</span>
                                )}
                              </td>
                              <td className="whitespace-nowrap py-2 text-right tabular-nums">
                                {fmtWon(a.spend)}
                              </td>
                              <td className="whitespace-nowrap py-2 text-right tabular-nums text-zinc-500">
                                {fmtNum(a.impressions)}
                              </td>
                              <td className="whitespace-nowrap py-2 text-right tabular-nums text-zinc-500">
                                {fmtNum(a.clicks)}
                              </td>
                              <td className="whitespace-nowrap py-2 text-right tabular-nums">
                                {a.inquiries}건
                              </td>
                              <td className="whitespace-nowrap py-2 text-right tabular-nums">
                                {cpl !== null ? fmtWon(cpl) : "–"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-zinc-300 font-semibold">
                          <td className="py-2">소계</td>
                          <td className="whitespace-nowrap py-2 text-right tabular-nums">
                            {fmtWon(t.spend)}
                          </td>
                          <td className="whitespace-nowrap py-2 text-right tabular-nums">
                            {fmtNum(t.impressions)}
                          </td>
                          <td className="whitespace-nowrap py-2 text-right tabular-nums">
                            {fmtNum(t.clicks)}
                          </td>
                          <td className="whitespace-nowrap py-2 text-right tabular-nums">
                            {t.inquiries}건
                          </td>
                          <td className="whitespace-nowrap py-2 text-right tabular-nums">
                            {t.inquiries > 0 ? fmtWon(Math.round(t.spend / t.inquiries)) : "–"}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            CPL = 광고비 ÷ 광고 기여 문의 · GPT는 전환 추적 없음(미측정) · 네이버는 파워링크/오가닉 구분 불명
          </p>
        </section>
      )}

      {/* 코멘트 — 읽기용 (색상 구분 카드) */}
      {(() => {
        const cmt = data.reportComments.find((c) => c.month === month);
        if (
          !cmt ||
          (!cmt.why && !cmt.how && !cmt.what && !cmt.lingoNote && !cmt.neuroNote && !cmt.threadNote)
        )
          return null;
        const rows = [
          { label: "WHY", desc: "상황·배경", text: cmt.why, badge: "bg-amber-500" },
          { label: "HOW", desc: "대응", text: cmt.how, badge: "bg-blue-500" },
          { label: "WHAT", desc: "결과·다음 달", text: cmt.what, badge: "bg-emerald-600" },
        ].filter((r) => r.text);
        const notes = [
          { label: "링고", text: cmt.lingoNote, cls: "border-indigo-200 bg-indigo-50/60 text-indigo-900" },
          { label: "뉴로", text: cmt.neuroNote, cls: "border-amber-200 bg-amber-50/60 text-amber-900" },
          { label: "무료 채널", text: cmt.threadNote, cls: "border-emerald-200 bg-emerald-50/60 text-emerald-900" },
        ].filter((n) => n.text);
        return (
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">{month} 코멘트</h2>
            <div className="space-y-2.5">
              {rows.map((r) => (
                <div key={r.label} className="flex gap-3">
                  <span
                    className={`mt-0.5 h-fit shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold text-white ${r.badge}`}
                  >
                    {r.label}
                  </span>
                  <p className="text-sm leading-relaxed text-zinc-700">
                    <span className="mr-1 text-xs font-medium text-zinc-400">{r.desc}</span>
                    {r.text}
                  </p>
                </div>
              ))}
            </div>
            {notes.length > 0 && (
              <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                {notes.map((n) => (
                  <div
                    key={n.label}
                    className={`rounded-lg border p-3 text-xs leading-relaxed ${n.cls}`}
                  >
                    <p className="mb-1 text-[11px] font-bold">{n.label}</p>
                    <p>{n.text}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })()}

      {/* WHY-HOW-WHAT 코멘트 편집 (접이식) */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4 print:hidden">
        <details>
          <summary className="cursor-pointer select-none text-sm font-semibold text-zinc-600">
            ✏️ 코멘트 편집 (펼쳐서 수정)
          </summary>
          <div className="mt-3 space-y-3">
          <div>
            <label className={labelCls}>이번 달 결론 — 맨 위 10초 요약 (성과·리스크 한 줄)</label>
            <textarea
              rows={5}
              className={inputCls}
              value={draft.headline ?? ""}
              onChange={(e) => setField("headline", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>경영진 결정·지원 필요 (1~2줄, 줄바꿈 가능)</label>
            <textarea
              rows={5}
              className={inputCls}
              value={draft.decisions ?? ""}
              onChange={(e) => setField("decisions", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>WHY — 이번 달 상황·배경</label>
            <textarea
              rows={5}
              className={inputCls}
              value={draft.why}
              onChange={(e) => setField("why", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>HOW — 어떻게 대응했나</label>
            <textarea
              rows={5}
              className={inputCls}
              value={draft.how}
              onChange={(e) => setField("how", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>WHAT — 결과·다음 달 계획</label>
            <textarea
              rows={5}
              className={inputCls}
              value={draft.what}
              onChange={(e) => setField("what", e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>링고 코멘트 (선택)</label>
              <textarea
                rows={4}
                className={inputCls}
                value={draft.lingoNote ?? ""}
                onChange={(e) => setField("lingoNote", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>뉴로 코멘트 (선택)</label>
              <textarea
                rows={4}
                className={inputCls}
                value={draft.neuroNote ?? ""}
                onChange={(e) => setField("neuroNote", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>무료 채널 게시 코멘트 (선택)</label>
              <textarea
                rows={4}
                className={inputCls}
                value={draft.threadNote ?? ""}
                onChange={(e) => setField("threadNote", e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={saveComment}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
            >
              코멘트 저장
            </button>
            <button
              onClick={generateCopyText}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              복사용 텍스트 생성
            </button>
          </div>
        </div>
        </details>
      </section>

      {/* 복사용 텍스트 */}
      {copyText && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4 print:hidden">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">복사용 텍스트 (슬랙 붙여넣기용)</h2>
            <button
              onClick={copyToClipboard}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50"
            >
              {copied ? "✓ 복사됨" : "클립보드에 복사"}
            </button>
          </div>
          <textarea
            readOnly
            rows={Math.min(20, copyText.split("\n").length + 1)}
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs"
            value={copyText}
            onFocus={(e) => e.target.select()}
          />
        </section>
      )}
    </div>
  );
}
