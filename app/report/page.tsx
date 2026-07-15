"use client";

import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { dealRate, isFreeChannel } from "@/lib/channel";
import { fmtNum, fmtPct, fmtWon } from "@/lib/format";
import {
  availableMonths,
  buildCopyText,
  buildInsights,
  buildMonthlyReport,
  deltaCountLabel,
  deltaLabel,
  prevMonthOf,
} from "@/lib/report";
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

      {/* 자동 집계 지표 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="링고 · 신규 리드"
          value={fmtNum(report.lingo.newLeads)}
          sub={`${prevReport ? deltaLabel(report.lingo.newLeads, prevReport.lingo.newLeads) : ""} · 계약 ${report.lingo.deals}건 · 전환율 ${fmtPct(report.lingo.conversionRate)}`}
        />
        <KpiCard
          label="뉴로 · 신규 리드"
          value={fmtNum(report.neuro.newLeads)}
          sub={`${prevReport ? deltaLabel(report.neuro.newLeads, prevReport.neuro.newLeads) : ""} · 계약 ${report.neuro.deals}건 · 전환율 ${fmtPct(report.neuro.conversionRate)}`}
        />
        <KpiCard
          label="채널 합계"
          value={`${fmtNum(report.channelTotals.leads)} 리드`}
          sub={`계약 ${report.channelTotals.deals}건 · 전환율 ${fmtPct(report.channelConversion)} · 광고비 ${fmtWon(report.channelTotals.spend)}`}
        />
        <KpiCard
          label="계약 건수"
          value={`${fmtNum(monthDealCount)}건`}
          sub={`${prevReport ? deltaCountLabel(monthDealCount, prevReport.lingo.deals + prevReport.neuro.deals) : ""} · 링고 ${report.lingo.deals}건 · 뉴로 ${report.neuro.deals}건${monthDealAmount > 0 ? ` · 예상 ${fmtWon(monthDealAmount)}` : ""}`}
        />
      </div>

      {/* 자동 요약 + 권장 액션 */}
      {insights && (
        <div className="grid gap-4 lg:grid-cols-2">
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
            <h2 className="mb-3 text-sm font-semibold">다음 달 권장 액션 (자동)</h2>
            <ul className="space-y-1.5 text-sm text-zinc-700">
              {insights.recommendations.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-semibold text-zinc-400">{i + 1}.</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {/* 채널별 상세 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">{month} 채널별 계약전환율</h2>
        {report.funnels.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-400">이 달의 채널 데이터가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
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
                {report.funnels.map((f) => (
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
                    <td className="py-2 text-right font-semibold tabular-nums">{fmtPct(dealRate(f))}</td>
                    <td className="py-2 text-right tabular-nums text-zinc-500">{fmtWon(f.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              <label className={labelCls}>스레드 코멘트 (선택)</label>
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
