"use client";

import { useState } from "react";
import { PnlSection } from "@/components/PnlSection";
import { FileAttach } from "@/components/FileAttach";
import { fmtNum, fmtWon } from "@/lib/format";
import { getToday } from "@/lib/today";
import { useAppData } from "@/lib/use-app-data";
import type { DevReview, MonthlyPnl } from "@/lib/types";

function Stat({
  label,
  value,
  sub,
  color = "text-zinc-900",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 whitespace-nowrap text-base font-bold tracking-tight ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-zinc-400">{sub}</p>}
    </div>
  );
}

// 뉴로 손익 상세 — 원가 분류 + 구독중 조직별 마진
function PnlDetail({ pnl }: { pnl: MonthlyPnl }) {
  const cat = pnl.categoryCost;
  return (
    <>
      {cat && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold">
            토큰 원가 분류{" "}
            <span className="text-xs font-normal text-zinc-400">절반이 매출 없는 원가</span>
          </h2>
          <p className="mb-3 text-[11px] text-zinc-400">
            구독중 조직만 매출로 이어지고, 내부·테스트는 청구가 발생하지 않는다.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="구독중 8곳" value={fmtWon(cat.subscribed)} sub="매출 발생" color="text-emerald-600" />
            <Stat label="내부 5곳" value={fmtWon(cat.internal)} sub="미청구" color="text-zinc-500" />
            <Stat label="테스트 3곳" value={fmtWon(cat.test)} sub="미청구" color="text-zinc-500" />
            <Stat label="기타 1곳" value={fmtWon(cat.other)} sub="미청구" color="text-zinc-400" />
          </div>
        </section>
      )}
      {pnl.orgs && pnl.orgs.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold">
            구독중 조직별 마진{" "}
            {pnl.subscribedMarginRate != null && (
              <span className="text-xs font-normal text-zinc-400">
                소계 마진율 {pnl.subscribedMarginRate.toFixed(1)}%
              </span>
            )}
          </h2>
          <p className="mb-3 text-[11px] text-zinc-400">단, 2개 조직이 마진을 깎는다.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                  <th className="py-2 font-medium">조직</th>
                  <th className="py-2 text-right font-medium">원가</th>
                  <th className="py-2 text-right font-medium">공급가</th>
                  <th className="py-2 text-right font-medium">마진</th>
                  <th className="py-2 text-right font-medium">마진율</th>
                </tr>
              </thead>
              <tbody>
                {pnl.orgs.map((o) => {
                  const neg = o.margin < 0;
                  return (
                    <tr key={o.name} className="border-b border-zinc-100 last:border-0">
                      <td className="py-1.5">
                        {o.name}
                        {o.plan && (
                          <span className="ml-1 text-[10px] text-zinc-400">({o.plan})</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-1.5 text-right tabular-nums text-zinc-500">
                        {fmtWon(o.cost)}
                      </td>
                      <td className="whitespace-nowrap py-1.5 text-right tabular-nums">
                        {fmtWon(o.supply)}
                      </td>
                      <td
                        className={`whitespace-nowrap py-1.5 text-right tabular-nums ${neg ? "text-rose-600" : "text-emerald-600"}`}
                      >
                        {fmtWon(o.margin)}
                      </td>
                      <td className="whitespace-nowrap py-1.5 text-right tabular-nums">
                        {o.marginRate == null ? "—" : `${o.marginRate.toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

// 링고 광고 운영 (7월 말 재세팅)
function LingoAd({ r }: { r: DevReview }) {
  return (
    <section className="rounded-xl border-2 border-indigo-600 bg-white p-4">
      <h2 className="mb-1 text-sm font-bold">
        링고 광고 운영{" "}
        <span className="text-xs font-normal text-indigo-400">개발팀 · {r.month} · 7월 말 재세팅</span>
      </h2>
      <p className="mb-3 text-[11px] text-zinc-400">
        측정 정비 → 캠페인 구조 재편 → 비용 통제 순서로 진행. 7/29 메타·네이버·구글 집행 시작.
      </p>
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {r.adDailyTotal != null && (
          <Stat label="하루 실집행 합계" value={`${fmtWon(r.adDailyTotal)}/일`} sub="3개 매체 · VAT 별도" />
        )}
        {r.adTargetCpa && (
          <Stat label="실측 문의당 비용" value={r.adTargetCpa} sub="메타·네이버 기준" color="text-indigo-700" />
        )}
      </div>
      {r.adChannels && r.adChannels.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                <th className="py-2 font-medium">매체</th>
                <th className="py-2 text-right font-medium">하루 집행</th>
                <th className="py-2 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {r.adChannels.map((c) => (
                <tr key={c.name} className="border-b border-zinc-100 last:border-0">
                  <td className="py-1.5 font-medium">{c.name}</td>
                  <td className="whitespace-nowrap py-1.5 text-right tabular-nums">{fmtWon(c.daily)}</td>
                  <td className="py-1.5 text-xs text-zinc-500">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {r.adTopCreatives && r.adTopCreatives.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold text-zinc-500">인기 소재 (메타)</p>
          <div className="space-y-1.5">
            {r.adTopCreatives.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-zinc-700">
                <span className="mt-0.5 shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                  {i + 1}
                </span>
                <span>
                  <b>{c.label}</b> — {c.metric}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {r.adDirection && (
        <p className="mt-3 rounded-md bg-zinc-50 p-2.5 text-xs leading-relaxed text-zinc-600">
          <b className="text-zinc-500">세팅 방향</b> · {r.adDirection}
        </p>
      )}
      {r.adDiscussion && (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50/60 p-2.5 text-xs leading-relaxed text-amber-900">
          <b>논의 필요</b> · {r.adDiscussion}
        </p>
      )}
    </section>
  );
}

// 링고 서버비 × 트래픽
function LingoInfra({ r }: { r: DevReview }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-bold">
        링고 서버비 × 트래픽{" "}
        <span className="text-xs font-normal text-zinc-400">개발팀 · {r.month}</span>
      </h2>
      <p className="mb-3 text-[11px] text-zinc-400">
        트래픽에 비례해 늘어나는 구조 · 조회수는 4배, 서버비는 2.4배로 완만.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {r.serverCost != null && (
          <Stat
            label="실질 서버비"
            value={fmtWon(r.serverCost)}
            sub={r.serverCostMoM != null ? `전월 대비 +${r.serverCostMoM}%` : undefined}
            color="text-rose-600"
          />
        )}
        {r.views != null && (
          <Stat
            label="조회수"
            value={`${fmtNum(r.views)}뷰`}
            sub={r.viewsMoM != null ? `전월 대비 +${r.viewsMoM}%` : undefined}
          />
        )}
        {r.costPer1000 != null && (
          <Stat label="1,000뷰당 비용" value={fmtWon(r.costPer1000)} sub="1월 대비 -39%" color="text-emerald-600" />
        )}
        {r.revenueVsCostRate != null && (
          <Stat
            label="매출 대비 서버·AI"
            value={`${r.revenueVsCostRate}%`}
            sub="1월 38% → 7월"
            color="text-amber-600"
          />
        )}
      </div>
      {r.infraNote && <p className="mt-3 text-[11px] text-zinc-400">{r.infraNote}</p>}
    </section>
  );
}

// 링고 크레딧 소진 분석 (고객사 AI 사용량)
function LingoCredit({ r }: { r: DevReview }) {
  if (r.creditTotal == null) return null;
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-bold">
        링고 크레딧 소진 분석{" "}
        <span className="text-xs font-normal text-zinc-400">고객사 AI 사용량 · 우상향 성장세</span>
      </h2>
      <p className="mb-3 text-[11px] text-zinc-400">
        누적 {fmtNum(r.creditTotal)} 크레딧 · 최근월이 역대 최고.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="누적 소진" value={`${fmtNum(r.creditTotal)}`} sub="크레딧" />
        {r.creditMonthAvg != null && (
          <Stat label="월평균" value={`${fmtNum(r.creditMonthAvg)}`} sub="크레딧" />
        )}
        {r.creditLatest != null && (
          <Stat
            label="최근월 (역대 최고)"
            value={`${fmtNum(r.creditLatest)}`}
            sub={r.creditLatestMoM != null ? `전월 대비 +${r.creditLatestMoM}%` : undefined}
            color="text-emerald-600"
          />
        )}
        {r.creditTop3Rate != null && (
          <Stat label="상위 3개사 집중도" value={`${r.creditTop3Rate}%`} sub="의존도 높음" color="text-amber-600" />
        )}
      </div>
      <p className="mt-3 text-[11px] text-zinc-400">
        {r.creditActiveOrgs && `월 활성 고객사 ${r.creditActiveOrgs} · `}
        {r.creditTranslationRate != null && `유형별 번역 ${r.creditTranslationRate}% · `}
        {r.creditNote}
      </p>
    </section>
  );
}

export default function DevReviewPage() {
  const { data, update } = useAppData();
  const [month, setMonth] = useState<string | null>(null);

  if (!data) return <p className="py-16 text-center text-sm text-zinc-400">불러오는 중…</p>;

  const pnls = (data.monthlyPnls ?? []).filter((p) => p.product === "뉴로");
  const reviews = (data.devReviews ?? []).filter((r) => r.product === "링고");
  const months = [...new Set([...pnls.map((p) => p.month), ...reviews.map((r) => r.month)])].sort(
    (a, b) => (a < b ? 1 : -1),
  );
  const cur = month ?? months[0] ?? getToday().slice(0, 7);
  const pnl = pnls.find((p) => p.month === cur);
  const review = reviews.find((r) => r.month === cur);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold">개발팀 리뷰</h1>
          <p className="text-xs text-zinc-500">
            뉴로 손익·원가 · 링고 광고 운영·서버비 (개발팀 소유 · 세일즈 보고와 분리)
          </p>
        </div>
        {months.length > 0 && (
          <select
            className="ml-auto rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
            value={cur}
            onChange={(e) => setMonth(e.target.value)}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
      </div>

      {months.length === 0 && (
        <p className="rounded-xl border border-zinc-200 bg-white py-16 text-center text-sm text-zinc-400">
          아직 개발팀 리뷰 데이터가 없습니다.
        </p>
      )}

      {pnl && (
        <>
          <PnlSection pnl={pnl} />
          <PnlDetail pnl={pnl} />
          <FileAttach
            label="뉴로 원본 자료"
            fileUrl={pnl.sourceFileUrl}
            fileName={pnl.sourceFileName}
            onChange={(url, name) =>
              update((d) => ({
                ...d,
                monthlyPnls: d.monthlyPnls.map((x) =>
                  x.id === pnl.id ? { ...x, sourceFileUrl: url, sourceFileName: name } : x,
                ),
              }))
            }
          />
        </>
      )}
      {review && (
        <>
          <LingoAd r={review} />
          <LingoInfra r={review} />
          <LingoCredit r={review} />
          <FileAttach
            label="링고 원본 자료"
            fileUrl={review.sourceFileUrl}
            fileName={review.sourceFileName}
            onChange={(url, name) =>
              update((d) => ({
                ...d,
                devReviews: d.devReviews.map((x) =>
                  x.id === review.id ? { ...x, sourceFileUrl: url, sourceFileName: name } : x,
                ),
              }))
            }
          />
        </>
      )}
    </div>
  );
}
