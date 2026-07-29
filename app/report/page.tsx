"use client";

import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { dealRate, isFreeChannel, safeDiv } from "@/lib/channel";
import { contractsInMonth, newMrrInMonth, upsellsInMonth } from "@/lib/exec";
import { fmtNum, fmtPct, fmtWon } from "@/lib/format";
import { revenueTotals, revenuesFor } from "@/lib/revenue";
import { RevenueTrendChart } from "@/components/charts/RevenueTrendChart";
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
  const monthDealAmount = monthDealLeads.reduce((sum, l) => sum + l.expectedAmount, 0);

  // 제품별 광고비 (해당 월 채널 퍼널의 소진 금액 합)
  const spendBy = (p: Product) =>
    report.funnels.filter((f) => f.product === p).reduce((s, f) => s + f.spend, 0);
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

      <h2 className="hidden text-lg font-bold print:block">[Account Team 월간 보고] {month}</h2>

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
                  {fmtWon(report.channelTotals.spend)}
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
        const rows = revenuesFor(data, product);
        if (rows.length === 0) return null;
        const totals = revenueTotals(data, product);
        return (
          <section key={`rev-${product}`} className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">
              {product} 매출 상세{" "}
              <span className="text-xs font-normal text-zinc-400">(월별 결제 내역)</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                    <th className="py-2 font-medium">월</th>
                    <th className="py-2 text-right font-medium">계약 건수</th>
                    <th className="py-2 text-right font-medium">계약금액</th>
                    <th className="py-2 text-right font-medium">실 결제</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isSel = r.month === month;
                    return (
                      <tr
                        key={r.id}
                        className={`border-b border-zinc-100 ${isSel ? "bg-indigo-50 font-medium" : ""}`}
                      >
                        <td className="py-1.5">{r.month}</td>
                        <td className="py-1.5 text-right tabular-nums">{fmtNum(r.deals)}건</td>
                        <td className="py-1.5 text-right tabular-nums">{fmtWon(r.contractAmount)}</td>
                        <td className="py-1.5 text-right tabular-nums">{fmtWon(r.actualPayment)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-zinc-300 font-semibold">
                    <td className="py-2">총계</td>
                    <td className="py-2 text-right tabular-nums">{fmtNum(totals.deals)}건</td>
                    <td className="py-2 text-right tabular-nums">{fmtWon(totals.contractAmount)}</td>
                    <td className="py-2 text-right tabular-nums">{fmtWon(totals.actualPayment)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-zinc-400">
              선택한 달({month})은 파란 강조 · 실 결제 = 실제 입금액(계약금액과 다를 수 있음: 할인·미납·분할 등)
            </p>
            <div className="mt-4 border-t border-zinc-100 pt-4">
              <p className="mb-1 text-xs font-medium text-zinc-500">
                월별 추이 <span className="font-normal text-zinc-400">(막대: 실 결제 · 선: 계약 건수)</span>
              </p>
              <RevenueTrendChart
                data={[...rows]
                  .reverse()
                  .map((r) => ({
                    month: r.month,
                    actualPayment: r.actualPayment,
                    deals: r.deals,
                  }))}
              />
            </div>
          </section>
        );
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
          const amount = monthDealLeads
            .filter((l) => l.product === product)
            .reduce((sum, l) => sum + l.expectedAmount, 0);
          const channels = productChannelBreakdown(data.leads, month, product);
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
                  label="계약 건수"
                  value={`${fmtNum(cur.deals)}건`}
                  sub={`${prev ? deltaCountLabel(cur.deals, prev.deals) : ""}${amount > 0 ? ` · ${fmtWon(amount)}` : ""}`}
                />
                <KpiCard
                  label="광고비 (소진)"
                  value={spendBy(product) > 0 ? fmtWon(spendBy(product)) : "0원"}
                  sub="해당 월 채널 퍼널 합계"
                />
                <KpiCard label="전환율" value={fmtPct(cur.conversionRate)} sub="계약 ÷ 신규 리드" />
              </div>
              {channels.length === 0 ? (
                <p className="rounded-lg bg-zinc-50 py-3 text-center text-xs text-zinc-400">
                  이 달 {product} 신규 리드가 없습니다.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                      <th className="py-1.5 font-medium">유입 채널</th>
                      <th className="py-1.5 text-right font-medium">리드</th>
                      <th className="py-1.5 text-right font-medium">계약</th>
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
              )}
            </section>
          );
        })}
      </div>

      {/* 전체 합계 */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="전체 계약 건수"
          value={`${fmtNum(monthDealCount)}건`}
          sub={`${prevReport ? deltaCountLabel(monthDealCount, prevReport.lingo.deals + prevReport.neuro.deals) : ""}${monthDealAmount > 0 ? ` · 예상 ${fmtWon(monthDealAmount)}` : ""}`}
        />
        <KpiCard
          label="채널 합계 (퍼널 데이터)"
          value={`${fmtNum(report.channelTotals.leads)} 리드`}
          sub={`계약 ${report.channelTotals.deals}건 · 전환율 ${fmtPct(report.channelConversion)} · 광고비 ${fmtWon(report.channelTotals.spend)}`}
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

      {/* 채널별 상세 — 링고 / 뉴로 / 공통 구분 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">{month} 채널별 계약전환율 (퍼널 데이터)</h2>
        {report.funnels.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-400">이 달의 채널 데이터가 없습니다.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {(["링고", "뉴로", "공통"] as const).map((product) => {
              const rows = report.funnels.filter((f) => (f.product ?? "공통") === product);
              if (rows.length === 0) return null;
              return (
                <div key={product} className={product === "공통" ? "lg:col-span-2" : ""}>
                  <h3 className="mb-1.5 text-xs font-semibold text-zinc-500">
                    {product === "공통" ? "공통 (링고·뉴로 공용)" : product}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                          <th className="py-2 font-medium">채널</th>
                          <th className="py-2 text-right font-medium">리드</th>
                          <th className="py-2 text-right font-medium">계약</th>
                          <th className="py-2 text-right font-medium">전환율</th>
                          <th className="py-2 text-right font-medium">광고비</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((f) => (
                          <tr key={f.id} className="border-b border-zinc-100 last:border-0">
                            <td className="py-2">
                              {f.source}
                              {isFreeChannel(f) && (
                                <span className="ml-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  무료
                                </span>
                              )}
                            </td>
                            <td className="py-2 text-right tabular-nums">{fmtNum(f.leads)}</td>
                            <td className="py-2 text-right tabular-nums">{fmtNum(f.deals)}</td>
                            <td className="py-2 text-right font-semibold tabular-nums">
                              {fmtPct(dealRate(f))}
                            </td>
                            <td className="py-2 text-right tabular-nums text-zinc-500">
                              {fmtWon(f.spend)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* WHY-HOW-WHAT 코멘트 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">코멘트 (WHY · HOW · WHAT)</h2>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>WHY — 이번 달 상황·배경</label>
            <textarea
              rows={2}
              className={inputCls}
              value={draft.why}
              onChange={(e) => setField("why", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>HOW — 어떻게 대응했나</label>
            <textarea
              rows={2}
              className={inputCls}
              value={draft.how}
              onChange={(e) => setField("how", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>WHAT — 결과·다음 달 계획</label>
            <textarea
              rows={2}
              className={inputCls}
              value={draft.what}
              onChange={(e) => setField("what", e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>링고 코멘트 (선택)</label>
              <textarea
                rows={2}
                className={inputCls}
                value={draft.lingoNote ?? ""}
                onChange={(e) => setField("lingoNote", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>뉴로 코멘트 (선택)</label>
              <textarea
                rows={2}
                className={inputCls}
                value={draft.neuroNote ?? ""}
                onChange={(e) => setField("neuroNote", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>무료 채널 게시 코멘트 (선택)</label>
              <textarea
                rows={2}
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
