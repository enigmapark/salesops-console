"use client";

import Link from "next/link";
import { GradeBadge } from "@/components/GradeBadge";
import { KpiCard } from "@/components/KpiCard";
import { todaysActions, type ActionType } from "@/lib/actions";
import {
  avgDaysToClose,
  cohortConversion,
  contractsInMonth,
  inflowInMonth,
  newMrrInMonth,
  oneOffInMonth,
  pipelineValue,
} from "@/lib/exec";
import { pipelineBreakdown } from "@/lib/pipeline";
import { buildInsights, deltaCountLabel, deltaLabel, prevMonthOf } from "@/lib/report";
import { ChannelConversionChart } from "@/components/charts/ChannelConversionChart";
import { GradeDistributionChart } from "@/components/charts/GradeDistributionChart";
import { cac, cpl, dealRate, isFreeChannel, safeDiv, sortByDealRateDesc } from "@/lib/channel";
import { fmtNum, fmtPct, fmtWon } from "@/lib/format";
import { GRADES } from "@/lib/options";
import { calcGrade, needsContact, sortByScoreDesc } from "@/lib/scoring";
import { getToday } from "@/lib/today";
import { useAppData } from "@/lib/use-app-data";

export default function DashboardPage() {
  const { data } = useAppData();

  if (!data) return <p className="py-16 text-center text-sm text-zinc-400">불러오는 중…</p>;

  const today = getToday();
  const thisMonth = today.slice(0, 7);

  // 리드 KPI
  const totalLeads = data.leads.length;
  const grades = data.leads.map((l) => calcGrade(l));
  const activeTop = grades.filter((g) => g === "1등급" || g === "2등급").length;
  const contactDue = data.leads.filter((l) => needsContact(l, today)).length;
  const dealLeadList = data.leads.filter((l) => l.status === "계약");
  const dealLeads = dealLeadList.length;
  const dealAmount = dealLeadList.reduce((sum, l) => sum + l.expectedAmount, 0);
  const conversionRate = safeDiv(dealLeads, totalLeads);

  // 최고 무료 채널 (계약전환율 기준)
  const bestFree = data.funnels
    .filter((f) => isFreeChannel(f) && dealRate(f) !== null)
    .reduce<(typeof data.funnels)[number] | null>(
      (best, f) => (best === null || (dealRate(f) ?? 0) > (dealRate(best) ?? 0) ? f : best),
      null,
    );

  // 이번 달 스레드 유입
  const monthPosts = data.threadPosts.filter((p) => p.date.startsWith(thisMonth));
  const threadLeads = monthPosts.reduce((sum, p) => sum + p.leadsGenerated, 0);

  const funnels = sortByDealRateDesc(data.funnels);

  // 제품별 리드·계약 현황 (링고 / 뉴로 / 합계)
  const productRows = (["링고", "뉴로"] as const).map((p) => {
    const rows = data.leads.filter((l) => l.product === p);
    const deals = rows.filter((l) => l.status === "계약");
    return {
      name: p as string,
      leads: rows.length,
      active: rows.filter((l) => {
        const g = calcGrade(l);
        return g === "1등급" || g === "2등급";
      }).length,
      deals: deals.length,
      amount: deals.reduce((s, l) => s + l.expectedAmount, 0),
      rate: safeDiv(deals.length, rows.length),
    };
  });
  const totalRow = {
    name: "합계",
    leads: totalLeads,
    active: activeTop,
    deals: dealLeads,
    amount: dealAmount,
    rate: conversionRate,
  };

  // 오늘의 액션 + 세일즈 퍼널
  const actions = todaysActions(data.leads, today);
  const { funnel, off } = pipelineBreakdown(data.leads);

  // 경영진 KPI — 유입(코호트)과 계약(당월)을 구분해서 집계
  const prevM = prevMonthOf(thisMonth);
  const inflowNow = inflowInMonth(data.leads, thisMonth).length;
  const inflowPrev = inflowInMonth(data.leads, prevM).length;
  const dealsNow = contractsInMonth(data.leads, thisMonth).length;
  const dealsPrev = contractsInMonth(data.leads, prevM).length;
  const mrrNow = newMrrInMonth(data.leads, thisMonth);
  const oneOffNow = oneOffInMonth(data.leads, thisMonth);
  const pipeline = pipelineValue(data.leads);
  const cohortConv = cohortConversion(data.leads, thisMonth);
  const avgClose = avgDaysToClose(data.leads);
  const insights = buildInsights(data, thisMonth, today);

  // 제품별 채널 데이터 (링고/뉴로 구분, 공통은 별도)
  const funnelsBy = (p: "링고" | "뉴로") => funnels.filter((f) => f.product === p);
  const commonFunnels = funnels.filter((f) => f.product === "공통");
  const channelChartDataBy = (p: "링고" | "뉴로") =>
    funnelsBy(p)
      .filter((f) => dealRate(f) !== null)
      .map((f) => ({
        name: f.source,
        rate: Math.round((dealRate(f) ?? 0) * 1000) / 10,
        free: isFreeChannel(f),
      }));

  // 등급 분포 — 제품 비교
  const gradePairs = data.leads.map((l) => ({ product: l.product, grade: calcGrade(l) }));
  const gradeRows = GRADES.map((g) => ({
    grade: g,
    lingo: gradePairs.filter((x) => x.grade === g && x.product === "링고").length,
    neuro: gradePairs.filter((x) => x.grade === g && x.product === "뉴로").length,
    total: gradePairs.filter((x) => x.grade === g).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">대시보드</h1>
        <p className="text-xs text-zinc-500">기준일 {today}</p>
      </div>

      {/* 경영진 KPI — 30초 안에 이번 달 상황 파악 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="이번 달 신규 리드"
          value={`${fmtNum(inflowNow)}건`}
          sub={deltaLabel(inflowNow, inflowPrev)}
        />
        <KpiCard
          label="이번 달 계약"
          value={`${fmtNum(dealsNow)}건`}
          sub={`${deltaCountLabel(dealsNow, dealsPrev)} · 계약일 기준`}
        />
        <KpiCard
          label="신규 MRR"
          value={mrrNow > 0 ? fmtWon(mrrNow) : "0원"}
          sub={oneOffNow > 0 ? `일회성 ${fmtWon(oneOffNow)} 별도` : "이번 달 계약 고객의 월 이용료"}
        />
        <KpiCard
          label="진행 파이프라인"
          value={pipeline.amount > 0 ? fmtWon(pipeline.amount) : "–"}
          sub={`활성 리드 ${pipeline.count}건의 총 계약가치`}
        />
        <KpiCard
          label="코호트 전환율"
          value={fmtPct(cohortConv)}
          sub="이번 달 유입 리드 중 계약 비율"
        />
        <KpiCard
          label="평균 계약 소요일"
          value={avgClose === null ? "–" : `${avgClose}일`}
          sub="유입일 → 계약일"
        />
      </div>

      {/* 경영진 인사이트 — 요약·위험요인·다음 액션 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">
          경영진 인사이트 <span className="font-normal text-zinc-400">({thisMonth} 자동 생성)</span>
        </h2>
        <div className="grid gap-5 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-semibold text-zinc-500">핵심 요약</p>
            <ul className="space-y-1.5 text-sm text-zinc-700">
              {insights.summary.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-zinc-300">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-rose-600">위험요인</p>
            <ul className="space-y-1.5 text-sm text-zinc-700">
              {insights.risks.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-rose-300">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-emerald-700">다음 액션</p>
            <ul className="space-y-1.5 text-sm text-zinc-700">
              {insights.recommendations.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-semibold text-emerald-500">{i + 1}.</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 제품별 리드·계약 현황 — 링고/뉴로 분리 + 합계 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">제품별 리드·계약 현황</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                <th className="py-2 font-medium">제품</th>
                <th className="py-2 text-right font-medium">리드</th>
                <th className="py-2 text-right font-medium">1·2등급 (활성)</th>
                <th className="py-2 text-right font-medium">계약</th>
                <th className="py-2 text-right font-medium">계약 금액 (예상)</th>
                <th className="py-2 text-right font-medium">전환율</th>
              </tr>
            </thead>
            <tbody>
              {productRows.map((r) => (
                <tr key={r.name} className="border-b border-zinc-100">
                  <td className="py-2.5 font-medium">{r.name}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmtNum(r.leads)}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmtNum(r.active)}</td>
                  <td className="py-2.5 text-right tabular-nums">{fmtNum(r.deals)}건</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {r.amount > 0 ? fmtWon(r.amount) : "–"}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{fmtPct(r.rate)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-zinc-300 bg-zinc-50 font-semibold">
                <td className="py-2.5">{totalRow.name}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtNum(totalRow.leads)}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtNum(totalRow.active)}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtNum(totalRow.deals)}건</td>
                <td className="py-2.5 text-right tabular-nums">
                  {totalRow.amount > 0 ? fmtWon(totalRow.amount) : "–"}
                </td>
                <td className="py-2.5 text-right tabular-nums">{fmtPct(totalRow.rate)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 제품별 리드 패널 — 링고 / 뉴로 각각의 리드 목록 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {(["링고", "뉴로"] as const).map((product) => {
          const rows = sortByScoreDesc(data.leads.filter((l) => l.product === product));
          return (
            <section key={product} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  {product} 리드 <span className="text-zinc-400">({rows.length}건)</span>
                </h2>
                <Link
                  href="/leads"
                  className="text-xs text-zinc-500 underline-offset-2 hover:underline"
                >
                  리드 관리로 →
                </Link>
              </div>
              {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-400">등록된 리드가 없습니다.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                      <th className="py-1.5 font-medium">이름</th>
                      <th className="py-1.5 font-medium">단계</th>
                      <th className="py-1.5 font-medium">등급</th>
                      <th className="py-1.5 text-right font-medium">다음 연락</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((l) => (
                      <tr key={l.id} className="border-b border-zinc-100 last:border-0">
                        <td className="max-w-[140px] truncate py-2 font-medium">{l.name}</td>
                        <td className="py-2 text-zinc-600">{l.status}</td>
                        <td className="py-2">
                          <GradeBadge grade={calcGrade(l)} />
                        </td>
                        <td className="py-2 text-right">
                          {needsContact(l, today) ? (
                            <span className="inline-block whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                              연락 요망
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-500">{l.nextContact ?? "–"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 오늘의 액션 */}
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              오늘의 액션 <span className="text-zinc-400">({actions.length}건)</span>
            </h2>
            <Link href="/leads" className="text-xs text-zinc-500 underline-offset-2 hover:underline">
              리드 관리로 →
            </Link>
          </div>
          {actions.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">
              오늘 처리할 액션이 없습니다 🎉
            </p>
          ) : (
            <ul className="space-y-2">
              {actions.map((a, i) => {
                const badge: Record<ActionType, string> = {
                  overdue: "border-rose-200 bg-rose-50 text-rose-700",
                  winback: "border-amber-200 bg-amber-50 text-amber-700",
                  stale: "border-zinc-200 bg-zinc-100 text-zinc-600",
                  "no-next": "border-sky-200 bg-sky-50 text-sky-700",
                };
                return (
                  <li
                    key={`${a.lead.id}-${a.type}-${i}`}
                    className="flex items-center gap-2 rounded-lg border border-zinc-100 px-3 py-2 text-sm"
                  >
                    <span
                      className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${badge[a.type]}`}
                    >
                      {a.reason}
                    </span>
                    <span className="truncate font-medium">{a.lead.name}</span>
                    {a.lead.nextAction && (
                      <span className="hidden truncate text-xs text-zinc-400 sm:inline">
                        — {a.lead.nextAction}
                      </span>
                    )}
                    <span className="ml-auto whitespace-nowrap text-xs text-zinc-400">
                      {a.lead.product} · {a.lead.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 세일즈 퍼널 (단계 × 제품) */}
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">세일즈 퍼널 (현재 단계별 리드)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                <th className="py-2 font-medium">단계</th>
                <th className="py-2 text-right font-medium">링고</th>
                <th className="py-2 text-right font-medium">뉴로</th>
                <th className="py-2 text-right font-medium">전체</th>
              </tr>
            </thead>
            <tbody>
              {funnel.map((r, i) => (
                <tr key={r.stage} className="border-b border-zinc-100">
                  <td className="py-2.5 font-medium">
                    <span className="mr-1.5 text-xs text-zinc-400">{i + 1}</span>
                    {r.stage}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{r.lingo}</td>
                  <td className="py-2.5 text-right tabular-nums">{r.neuro}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">{r.total}</td>
                </tr>
              ))}
              {off.map((r) => (
                <tr key={r.stage} className="border-b border-zinc-100 text-zinc-400 last:border-0">
                  <td className="py-2.5">{r.stage} (퍼널 밖)</td>
                  <td className="py-2.5 text-right tabular-nums">{r.lingo}</td>
                  <td className="py-2.5 text-right tabular-nums">{r.neuro}</td>
                  <td className="py-2.5 text-right tabular-nums">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard label="연락 요망" value={fmtNum(contactDue)} sub="다음 연락일이 오늘이거나 지남" />
        <KpiCard
          label="최고 무료 채널"
          value={bestFree ? bestFree.source : "–"}
          sub={bestFree ? `계약전환율 ${fmtPct(dealRate(bestFree))}` : "데이터 없음"}
        />
        <KpiCard
          label="이번 달 스레드 유입"
          value={fmtNum(threadLeads)}
          sub={`${thisMonth} · 게시 ${monthPosts.length}건`}
        />
      </div>

      {/* 채널별 계약전환율 — 링고 / 뉴로 각각 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {(["링고", "뉴로"] as const).map((p) => {
          const chartData = channelChartDataBy(p);
          return (
            <section key={p} className="rounded-xl border border-zinc-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold">채널별 계약전환율 · {p}</h2>
              {chartData.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-400">
                  {p} 채널 데이터가 없습니다.
                </p>
              ) : (
                <ChannelConversionChart data={chartData} />
              )}
            </section>
          );
        })}
      </div>

      {/* 등급 분포 — 링고/뉴로 비교 (차트 + 표) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">등급 분포 (차트)</h2>
          <GradeDistributionChart
            data={gradeRows.map(({ grade, lingo, neuro }) => ({ grade, lingo, neuro }))}
          />
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">등급 분포 (표)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                <th className="py-2 font-medium">등급</th>
                <th className="py-2 text-right font-medium">링고</th>
                <th className="py-2 text-right font-medium">뉴로</th>
                <th className="py-2 text-right font-medium">전체</th>
                <th className="py-2 text-right font-medium">비중</th>
              </tr>
            </thead>
            <tbody>
              {gradeRows.map(({ grade, lingo, neuro, total }) => (
                <tr key={grade} className="border-b border-zinc-100 last:border-0">
                  <td className="py-2">
                    <GradeBadge grade={grade} />
                  </td>
                  <td className="py-2 text-right tabular-nums">{lingo}</td>
                  <td className="py-2 text-right tabular-nums">{neuro}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{total}</td>
                  <td className="py-2 text-right tabular-nums text-zinc-500">
                    {fmtPct(safeDiv(total, totalLeads), 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* 채널 요약 — 링고 / 뉴로 각각 (계약전환율 순) */}
      <div className="grid gap-4 lg:grid-cols-2">
        {(["링고", "뉴로"] as const).map((p) => {
          const rows = funnelsBy(p);
          return (
            <section key={p} className="rounded-xl border border-zinc-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold">채널 요약 · {p} (계약전환율 순)</h2>
              {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-400">{p} 채널 데이터가 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                        <th className="py-2 font-medium">채널</th>
                        <th className="py-2 text-right font-medium">리드</th>
                        <th className="py-2 text-right font-medium">계약</th>
                        <th className="py-2 text-right font-medium">전환율</th>
                        <th className="py-2 text-right font-medium">CPL</th>
                        <th className="py-2 text-right font-medium">CAC</th>
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
                            {fmtWon(cpl(f))}
                          </td>
                          <td className="py-2 text-right tabular-nums text-zinc-500">
                            {fmtWon(cac(f))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* 공통 채널 (제품 구분 없이 운영 — 예: 스레드) */}
      {commonFunnels.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">공통 채널 (링고·뉴로 공용)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                <th className="py-2 font-medium">채널</th>
                <th className="py-2 text-right font-medium">리드</th>
                <th className="py-2 text-right font-medium">계약</th>
                <th className="py-2 text-right font-medium">전환율</th>
              </tr>
            </thead>
            <tbody>
              {commonFunnels.map((f) => (
                <tr key={f.id} className="border-b border-zinc-100 last:border-0">
                  <td className="py-2">{f.source}</td>
                  <td className="py-2 text-right tabular-nums">{fmtNum(f.leads)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtNum(f.deals)}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{fmtPct(dealRate(f))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
