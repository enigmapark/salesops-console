"use client";

import { GradeBadge } from "@/components/GradeBadge";
import { KpiCard } from "@/components/KpiCard";
import { ChannelConversionChart } from "@/components/charts/ChannelConversionChart";
import { GradeDistributionChart } from "@/components/charts/GradeDistributionChart";
import { cac, cpl, dealRate, isFreeChannel, safeDiv, sortByDealRateDesc } from "@/lib/channel";
import { fmtNum, fmtPct, fmtWon } from "@/lib/format";
import { GRADES } from "@/lib/options";
import { calcGrade, needsContact } from "@/lib/scoring";
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

  const gradeCounts = GRADES.map((g) => ({
    grade: g,
    count: grades.filter((x) => x === g).length,
  }));

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

  // 차트 데이터
  const channelChartData = funnels
    .filter((f) => dealRate(f) !== null)
    .map((f) => ({
      name: f.source,
      rate: Math.round((dealRate(f) ?? 0) * 1000) / 10,
      free: isFreeChannel(f),
    }));
  const gradeChartData = gradeCounts.map(({ grade, count }) => ({ grade, count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">대시보드</h1>
        <p className="text-xs text-zinc-500">기준일 {today}</p>
      </div>

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

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 채널별 계약전환율 차트 */}
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">채널별 계약전환율</h2>
          {channelChartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">데이터가 없습니다.</p>
          ) : (
            <ChannelConversionChart data={channelChartData} />
          )}
        </section>

        {/* 등급 분포 차트 */}
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">등급 분포 (차트)</h2>
          <GradeDistributionChart data={gradeChartData} />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 등급 분포 */}
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">등급 분포</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                <th className="py-2 font-medium">등급</th>
                <th className="py-2 text-right font-medium">리드 수</th>
                <th className="py-2 text-right font-medium">비중</th>
              </tr>
            </thead>
            <tbody>
              {gradeCounts.map(({ grade, count }) => (
                <tr key={grade} className="border-b border-zinc-100 last:border-0">
                  <td className="py-2">
                    <GradeBadge grade={grade} />
                  </td>
                  <td className="py-2 text-right tabular-nums">{count}</td>
                  <td className="py-2 text-right tabular-nums text-zinc-500">
                    {fmtPct(safeDiv(count, totalLeads), 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 채널 요약 */}
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">채널 요약 (계약전환율 순)</h2>
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
                {funnels.map((f) => (
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
                    <td className="py-2 text-right tabular-nums text-zinc-500">{fmtWon(cpl(f))}</td>
                    <td className="py-2 text-right tabular-nums text-zinc-500">{fmtWon(cac(f))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
