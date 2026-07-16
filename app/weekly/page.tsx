"use client";

import { useMemo, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { pipelineValue } from "@/lib/exec";
import { fmtNum, fmtPct, fmtWon } from "@/lib/format";
import { buildInsights } from "@/lib/report";
import { getToday } from "@/lib/today";
import { useAppData } from "@/lib/use-app-data";
import { listWeeks, prevWeekOf, weekOf, type WeekRange } from "@/lib/week";
import { buildWeeklyCopyText, productWeekly, threadsWeekly } from "@/lib/weekly";
import type { Product } from "@/lib/types";

const selectCls =
  "rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";

export default function WeeklyPage() {
  const { data } = useAppData();
  const today = getToday();
  const [weekStart, setWeekStart] = useState<string>(() => weekOf(getToday()).start);
  const [copyText, setCopyText] = useState("");
  const [copied, setCopied] = useState(false);

  const weeks = useMemo(() => {
    if (!data) return [weekOf(today)];
    const dates = [
      ...data.leads.map((l) => l.firstInquiry),
      ...data.leads.flatMap((l) => (l.contractDate ? [l.contractDate] : [])),
      ...data.threadPosts.map((p) => p.date),
    ];
    return listWeeks(dates, today);
  }, [data, today]);

  if (!data) return <p className="py-16 text-center text-sm text-zinc-400">불러오는 중…</p>;

  const week: WeekRange = weeks.find((w) => w.start === weekStart) ?? weekOf(today);
  const prevWeek = prevWeekOf(week);
  const insights = buildInsights(data, today.slice(0, 7), today);
  const threads = threadsWeekly(data, week);

  const generate = () => {
    setCopyText(buildWeeklyCopyText(data, week, prevWeek, insights));
    setCopied(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
    } catch {
      // 클립보드 권한이 없으면 직접 선택해 복사
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold">주간 현황</h1>
          <p className="text-xs text-zinc-500">
            매주 수요일 대표 보고용 · 계약은 계약일 기준 · 월 단위는 &ldquo;월간 보고&rdquo; 메뉴
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            className={selectCls}
            value={week.start}
            onChange={(e) => setWeekStart(e.target.value)}
          >
            {weeks.map((w) => (
              <option key={w.start} value={w.start}>
                {w.label}
              </option>
            ))}
          </select>
          <button
            onClick={generate}
            className="whitespace-nowrap rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            복사용 텍스트 생성
          </button>
        </div>
      </div>

      {/* 제품별 주간 패널 — 링고/뉴로 각각 */}
      <div className="grid gap-4 xl:grid-cols-2">
        {(["링고", "뉴로"] as Product[]).map((p) => {
          const cur = productWeekly(data.leads, week, p);
          const prev = productWeekly(data.leads, prevWeek, p);
          const pipe = pipelineValue(data.leads.filter((l) => l.product === p));
          return (
            <section key={p} className="rounded-xl border border-zinc-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold">
                {p} <span className="text-xs font-normal text-zinc-400">{week.label}</span>
              </h2>
              <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard
                  label="신규 리드"
                  value={`${fmtNum(cur.newLeads.length)}건`}
                  sub={`전주 ${prev.newLeads.length}건`}
                />
                <KpiCard
                  label="계약"
                  value={`${fmtNum(cur.contracts.length)}건`}
                  sub={`전주 ${prev.contracts.length}건 · 계약일 기준`}
                />
                <KpiCard
                  label="신규 MRR"
                  value={cur.mrr > 0 ? fmtWon(cur.mrr) : "0원"}
                  sub={cur.oneOff > 0 ? `일회성 ${fmtWon(cur.oneOff)} 별도` : "이번 주 계약분"}
                />
                <KpiCard
                  label="진행 파이프라인"
                  value={pipe.amount > 0 ? fmtWon(pipe.amount) : "–"}
                  sub={`현재 활성 ${pipe.count}건`}
                />
              </div>

              {/* 이번 주 신규 리드 목록 */}
              <p className="mb-1.5 text-xs font-semibold text-zinc-500">이번 주 신규 리드</p>
              {cur.newLeads.length === 0 ? (
                <p className="mb-3 rounded-lg bg-zinc-50 py-2.5 text-center text-xs text-zinc-400">
                  이번 주 신규 리드 없음
                </p>
              ) : (
                <table className="mb-3 w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                      <th className="py-1.5 font-medium">이름</th>
                      <th className="py-1.5 font-medium">채널</th>
                      <th className="py-1.5 font-medium">단계</th>
                      <th className="py-1.5 text-right font-medium">예상 금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cur.newLeads.map((l) => (
                      <tr key={l.id} className="border-b border-zinc-100 last:border-0">
                        <td className="py-1.5 font-medium">{l.name}</td>
                        <td className="py-1.5 text-zinc-600">{l.source}</td>
                        <td className="py-1.5 text-zinc-600">{l.status}</td>
                        <td className="py-1.5 text-right tabular-nums text-zinc-600">
                          {l.expectedAmount > 0 ? fmtWon(l.expectedAmount) : "–"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 이번 주 계약 목록 */}
              <p className="mb-1.5 text-xs font-semibold text-emerald-700">이번 주 계약</p>
              {cur.contracts.length === 0 ? (
                <p className="rounded-lg bg-zinc-50 py-2.5 text-center text-xs text-zinc-400">
                  이번 주 계약 없음
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {cur.contracts.map((l) => (
                    <li key={l.id} className="flex items-center gap-2">
                      <span className="font-medium">{l.name}</span>
                      <span className="text-xs text-zinc-500">
                        {l.source} · 계약일 {l.contractDate}
                        {l.monthlyFee ? ` · 월 ${fmtWon(l.monthlyFee)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* 스레드(공통) 주간 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="스레드 게시 (공통)" value={fmtNum(threads.postCount)} sub={week.label} />
        <KpiCard label="스레드 노출" value={fmtNum(threads.totalImpressions)} />
        <KpiCard label="스레드 반응률" value={fmtPct(threads.avgEngagementRate)} />
        <KpiCard label="스레드 유입 리드" value={fmtNum(threads.totalLeads)} />
      </div>

      {/* 위험요인 & 다음 액션 (현재 시점) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-rose-600">위험요인 (현재)</h2>
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
          <h2 className="mb-3 text-sm font-semibold text-emerald-700">다음 액션</h2>
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

      {/* 복사용 텍스트 */}
      {copyText && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">복사용 텍스트 (대표 보고용)</h2>
            <button
              onClick={copyToClipboard}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50"
            >
              {copied ? "✓ 복사됨" : "클립보드에 복사"}
            </button>
          </div>
          <textarea
            readOnly
            rows={Math.min(22, copyText.split("\n").length + 1)}
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs"
            value={copyText}
            onFocus={(e) => e.target.select()}
          />
        </section>
      )}
    </div>
  );
}
