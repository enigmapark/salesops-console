"use client";

import { useState } from "react";
import { RevenueTrendChart } from "@/components/charts/RevenueTrendChart";
import { fmtNum, fmtWon } from "@/lib/format";
import type { MonthlyRevenue, Product } from "@/lib/types";

const RECENT_MONTHS = 6;

// 제품별 월별 매출 상세 — 표는 최근 6개월만 기본 표시(+더 보기), 그래프는 전체 기간
export function RevenueDetailCard({
  product,
  month,
  rows,
}: {
  product: Product;
  month: string;
  rows: MonthlyRevenue[]; // 최신순(desc), 실데이터(매출 발생)만
}) {
  const [expanded, setExpanded] = useState(false);
  const showAmount = product === "링고"; // 뉴로는 계약서 없이 운영 → 계약금액 열 제외
  const totals = rows.reduce(
    (a, r) => ({
      deals: a.deals + r.deals,
      contractAmount: a.contractAmount + r.contractAmount,
      actualPayment: a.actualPayment + r.actualPayment,
    }),
    { deals: 0, contractAmount: 0, actualPayment: 0 },
  );
  const visible = expanded ? rows : rows.slice(0, RECENT_MONTHS);
  const hiddenCount = rows.length - visible.length;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold">
        {product} 매출 상세{" "}
        <span className="text-xs font-normal text-zinc-400">
          (월별 결제 내역{rows.length > RECENT_MONTHS && !expanded ? ` · 최근 ${RECENT_MONTHS}개월` : ""})
        </span>
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
              <th className="py-2 font-medium">월</th>
              <th className="py-2 text-right font-medium">계약 건수</th>
              {showAmount && <th className="py-2 text-right font-medium">계약금액</th>}
              <th className="py-2 text-right font-medium">실 결제</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const isSel = r.month === month;
              return (
                <tr
                  key={r.id}
                  className={`border-b border-zinc-100 ${isSel ? "bg-indigo-50 font-medium" : ""}`}
                >
                  <td className="py-1.5">{r.month}</td>
                  <td className="py-1.5 text-right tabular-nums">{fmtNum(r.deals)}건</td>
                  {showAmount && (
                    <td className="py-1.5 text-right tabular-nums">
                      {r.contractAmount > 0 ? fmtWon(r.contractAmount) : "–"}
                    </td>
                  )}
                  <td className="py-1.5 text-right tabular-nums">{fmtWon(r.actualPayment)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-300 font-semibold">
              <td className="py-2">전체 누적</td>
              <td className="py-2 text-right tabular-nums">{fmtNum(totals.deals)}건</td>
              {showAmount && (
                <td className="py-2 text-right tabular-nums">
                  {totals.contractAmount > 0 ? fmtWon(totals.contractAmount) : "–"}
                </td>
              )}
              <td className="py-2 text-right tabular-nums">{fmtWon(totals.actualPayment)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {rows.length > RECENT_MONTHS && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs font-medium text-indigo-600 hover:underline print:hidden"
        >
          {expanded ? "접기" : `+ 이전 ${hiddenCount}개월 더 보기 (전체 ${rows.length}개월)`}
        </button>
      )}
      <p className="mt-2 text-[11px] text-zinc-400">
        선택한 달({month})은 파란 강조 · 전체 누적 = 데이터 있는 전체 월 합계 · 실 결제 = 실제 입금액
        {showAmount && " (계약금액과 다를 수 있음)"}
      </p>
      <div className="mt-4 border-t border-zinc-100 pt-4">
        <p className="mb-1 text-xs font-medium text-zinc-500">
          월별 추이{" "}
          <span className="font-normal text-zinc-400">(전체 기간 · 막대: 실 결제 · 선: 계약 건수)</span>
        </p>
        <RevenueTrendChart
          data={[...rows].reverse().map((r) => ({
            month: r.month,
            actualPayment: r.actualPayment,
            deals: r.deals,
          }))}
        />
      </div>
    </section>
  );
}
