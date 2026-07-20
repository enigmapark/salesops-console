"use client";

import { useMemo, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { contractsInMonth, pipelineValue } from "@/lib/exec";
import { fmtNum, fmtPct, fmtWon } from "@/lib/format";
import { buildInsights } from "@/lib/report";
import { getToday } from "@/lib/today";
import { useAppData } from "@/lib/use-app-data";
import { listWeeks, prevWeekOf, weekOf, type WeekRange } from "@/lib/week";
import {
  activityFor,
  adCpc,
  adCpl,
  adCtr,
  adStatsFor,
  buildWeeklyCopyText,
  productWeekly,
  threadsWeekly,
} from "@/lib/weekly";
import type { AppData, Product, WeeklyActivity } from "@/lib/types";

const selectCls =
  "rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";

// 세일즈 활동 직접 입력 (콜드메일 발송·통화·미팅)
function ActivityEditor({
  product,
  week,
  existing,
  onSave,
}: {
  product: Product;
  week: WeekRange;
  existing?: WeeklyActivity;
  onSave: (a: WeeklyActivity) => void;
}) {
  const [cold, setCold] = useState(existing?.coldEmails ?? 0);
  const [calls, setCalls] = useState(existing?.calls ?? 0);
  const [meetings, setMeetings] = useState(existing?.meetings ?? 0);
  const [note, setNote] = useState(existing?.note ?? "");
  const [saved, setSaved] = useState(false);
  const num = (v: string) => Math.max(0, Number(v) || 0);
  const inputCls =
    "w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none";
  return (
    <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
      <p className="mb-2 text-xs font-semibold text-zinc-500">세일즈 활동 · {week.label} (직접 입력)</p>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-0.5 block text-[11px] text-zinc-500">콜드메일 발송</label>
          <input type="number" min={0} className={inputCls} value={cold} onChange={(e) => setCold(num(e.target.value))} />
        </div>
        <div>
          <label className="mb-0.5 block text-[11px] text-zinc-500">통화</label>
          <input type="number" min={0} className={inputCls} value={calls} onChange={(e) => setCalls(num(e.target.value))} />
        </div>
        <div>
          <label className="mb-0.5 block text-[11px] text-zinc-500">미팅</label>
          <input type="number" min={0} className={inputCls} value={meetings} onChange={(e) => setMeetings(num(e.target.value))} />
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className={inputCls}
          placeholder="메모 (예: 언론사 명단 200곳 발송)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          onClick={() => {
            onSave({
              id: `${week.start}:${product}`,
              weekStart: week.start,
              product,
              coldEmails: cold,
              calls,
              meetings,
              note: note || undefined,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          }}
          className="whitespace-nowrap rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700"
        >
          {saved ? "✓ 저장됨" : "저장"}
        </button>
      </div>
    </div>
  );
}

export default function WeeklyPage() {
  const { data, update } = useAppData();
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

  const saveActivity = (a: WeeklyActivity) =>
    update((d: AppData) => ({
      ...d,
      weeklyActivities: [
        ...(d.weeklyActivities ?? []).filter((x) => x.id !== a.id),
        a,
      ],
    }));

  const competitorLeads = data.leads.filter((l) => l.competitor);

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
            수요일 보고 주기 (수~화 7일) · 계약은 계약일 기준 · 월 단위는 &ldquo;월간 보고&rdquo; 메뉴
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

      {/* 대표용 한 줄 요약 — 광고비 → 문의 → 계약 흐름을 제품별로 */}
      <section className="rounded-xl bg-zinc-900 p-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          이번 주 한 줄 요약 · {week.label}
        </p>
        {(["링고", "뉴로"] as Product[]).map((p) => {
          const stats = adStatsFor(data, week.start, p);
          const spend = stats.reduce((s, a) => s + a.spend, 0);
          const inq = stats.reduce((s, a) => s + a.inquiries, 0);
          const wk = productWeekly(data.leads, week, p);
          const monthDeals = contractsInMonth(
            data.leads.filter((l) => l.product === p),
            week.start.slice(0, 7),
          ).length;
          const cpl = inq > 0 ? spend / inq : null;
          return (
            <p key={p} className="mt-2 text-sm leading-relaxed">
              <span className="mr-1.5 rounded bg-white/15 px-1.5 py-0.5 text-xs font-bold">{p}</span>
              광고비 {fmtWon(spend)} → 문의 {inq}건
              {cpl !== null && <span className="text-zinc-300"> (CPL {fmtWon(cpl)})</span>} · 신규
              리드 {wk.newLeads.length}건 · 계약 {wk.contracts.length}건
              <span className="text-zinc-400"> (월 누적 {monthDeals}건)</span>
              {wk.mrr > 0 && <span> · 신규 MRR {fmtWon(wk.mrr)}</span>}
            </p>
          );
        })}
        {(() => {
          const all = (data.weeklyAdStats ?? []).filter((a) => a.weekStart === week.start);
          const spend = all.reduce((s, a) => s + a.spend, 0);
          const inq = all.reduce((s, a) => s + a.inquiries, 0);
          const newLeads =
            productWeekly(data.leads, week, "링고").newLeads.length +
            productWeekly(data.leads, week, "뉴로").newLeads.length;
          const deals =
            productWeekly(data.leads, week, "링고").contracts.length +
            productWeekly(data.leads, week, "뉴로").contracts.length;
          return (
            <p className="mt-2.5 border-t border-white/10 pt-2 text-xs text-zinc-400">
              전체 합계 — 광고비 {fmtWon(spend)} · 문의 {inq}건 · 신규 리드 {newLeads}건 · 계약{" "}
              {deals}건
            </p>
          );
        })()}
      </section>

      {/* 제품별 주간 패널 — 링고/뉴로 각각 */}
      <div className="grid gap-4 xl:grid-cols-2">
        {(["링고", "뉴로"] as Product[]).map((p) => {
          const cur = productWeekly(data.leads, week, p);
          const prev = productWeekly(data.leads, prevWeek, p);
          const pipe = pipelineValue(data.leads.filter((l) => l.product === p));
          const weekMonth = week.start.slice(0, 7);
          const monthDeals = contractsInMonth(
            data.leads.filter((l) => l.product === p),
            weekMonth,
          ).length;
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
                  sub={`${parseInt(weekMonth.slice(5), 10)}월 누적 ${monthDeals}건`}
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

              {/* 주간 광고 성과 (매체별) */}
              {(() => {
                const stats = adStatsFor(data, week.start, p);
                if (stats.length === 0) return null;
                return (
                  <div className="mb-3">
                    <p className="mb-1.5 text-xs font-semibold text-zinc-500">
                      주간 광고 성과 ({week.label})
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                            <th className="py-1.5 font-medium">매체</th>
                            <th className="py-1.5 text-right font-medium">소진</th>
                            <th className="py-1.5 text-right font-medium">노출</th>
                            <th className="py-1.5 text-right font-medium">클릭</th>
                            <th className="py-1.5 text-right font-medium">CTR</th>
                            <th className="py-1.5 text-right font-medium">CPC</th>
                            <th className="py-1.5 text-right font-medium">문의</th>
                            <th className="py-1.5 text-right font-medium">CPL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.map((a) => (
                            <tr key={a.id} className="border-b border-zinc-100 last:border-0">
                              <td className="py-1.5 font-medium">
                                {a.source === "메타광고" ? "메타" : "네이버"}
                              </td>
                              <td className="py-1.5 text-right font-semibold tabular-nums">
                                {fmtWon(a.spend)}
                              </td>
                              <td className="py-1.5 text-right tabular-nums">{fmtNum(a.impressions)}</td>
                              <td className="py-1.5 text-right tabular-nums">{fmtNum(a.clicks)}</td>
                              <td className="py-1.5 text-right tabular-nums">{fmtPct(adCtr(a), 2)}</td>
                              <td className="py-1.5 text-right tabular-nums">{fmtWon(adCpc(a))}</td>
                              <td className="py-1.5 text-right tabular-nums">{a.inquiries}건</td>
                              <td className="py-1.5 text-right font-semibold tabular-nums">
                                {fmtWon(adCpl(a))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

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

              <ActivityEditor
                key={`${p}-${week.start}`}
                product={p}
                week={week}
                existing={activityFor(data, week.start, p)}
                onSave={saveActivity}
              />
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

      {/* 경쟁사 리드 현황 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">
          경쟁사에서 넘어오는 리드 (이관·경합)
          <span className="ml-1.5 text-xs font-normal text-zinc-400">
            경쟁사 이용 고객을 우리 쪽으로 유치 중인 딜
          </span>
        </h2>
        {competitorLeads.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-400">
            해당 리드 없음 — 리드 수정에서 &ldquo;경쟁사&rdquo; 칸을 채우면 여기에 표시됩니다.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                <th className="py-2 font-medium">제품</th>
                <th className="py-2 font-medium">리드</th>
                <th className="py-2 font-medium">기존 이용 중인 경쟁사</th>
                <th className="py-2 font-medium">단계</th>
                <th className="py-2 font-medium">가능성</th>
              </tr>
            </thead>
            <tbody>
              {competitorLeads.map((l) => (
                <tr key={l.id} className="border-b border-zinc-100 last:border-0">
                  <td className="py-2 text-zinc-600">{l.product}</td>
                  <td className="py-2 font-medium">{l.name}</td>
                  <td className="py-2">{l.competitor}</td>
                  <td className="py-2 text-zinc-600">{l.status}</td>
                  <td className="py-2 text-zinc-600">{l.dealProbability ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

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
