"use client";

import { useState } from "react";
import { ChannelFormModal } from "@/components/ChannelFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  cac,
  cpc,
  cpl,
  ctr,
  dealRate,
  isFreeChannel,
  mqlRate,
  sortByDealRateDesc,
  sqlRate,
} from "@/lib/channel";
import { fmtNum, fmtPct, fmtWon } from "@/lib/format";
import { useAppData } from "@/lib/use-app-data";
import type { ChannelFunnel } from "@/lib/types";

type ModalState =
  | { mode: "add" }
  | { mode: "edit"; funnel: ChannelFunnel }
  | { mode: "delete"; funnel: ChannelFunnel }
  | null;

export default function ChannelsPage() {
  const { data, update } = useAppData();
  const [modal, setModal] = useState<ModalState>(null);

  if (!data) return <p className="py-16 text-center text-sm text-zinc-400">불러오는 중…</p>;

  // 제품별 그룹 (링고 / 뉴로 / 공통) — 데이터가 있는 그룹만 표시
  const groups = (["링고", "뉴로", "공통"] as const)
    .map((product) => ({
      product,
      rows: sortByDealRateDesc(data.funnels.filter((f) => (f.product ?? "공통") === product)),
    }))
    .filter((g) => g.rows.length > 0);

  // 유료 채널 광고 성과 — 소진 금액 큰 순
  const paidFunnels = data.funnels
    .filter((f) => !isFreeChannel(f))
    .sort((a, b) => b.spend - a.spend);

  const saveFunnel = (funnel: ChannelFunnel) =>
    update((d) => {
      const exists = d.funnels.some((f) => f.id === funnel.id);
      return {
        ...d,
        funnels: exists ? d.funnels.map((f) => (f.id === funnel.id ? funnel : f)) : [...d.funnels, funnel],
      };
    });

  const deleteFunnel = (id: string) =>
    update((d) => ({ ...d, funnels: d.funnels.filter((f) => f.id !== id) }));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold">채널별 획득 퍼널</h1>
          <p className="text-xs text-zinc-500">
            계약전환율 높은 순 · <span className="rounded bg-emerald-50 px-1 text-emerald-700">초록 배경</span>{" "}
            = 무료 채널 · &ldquo;–&rdquo; = 분모 0(데이터 없음)
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "add" })}
          className="ml-auto rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + 채널 추가
        </button>
      </div>

      {groups.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white px-3 py-10 text-center text-sm text-zinc-400">
          아직 채널 데이터가 없습니다.
        </div>
      )}
      {groups.map(({ product, rows }) => (
      <div key={product} className="mb-4">
        <h2 className="mb-2 text-sm font-semibold">
          {product === "공통" ? "공통 채널 (링고·뉴로 공용)" : `${product} 채널`}
          <span className="ml-1.5 font-normal text-zinc-400">({rows.length})</span>
        </h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
              <th className="px-3 py-2.5 font-medium">채널</th>
              <th className="px-3 py-2.5 font-medium">기간</th>
              <th className="px-3 py-2.5 text-right font-medium">활동</th>
              <th className="px-3 py-2.5 text-right font-medium">리드</th>
              <th className="px-3 py-2.5 text-right font-medium">MQL</th>
              <th className="px-3 py-2.5 text-right font-medium">유효율</th>
              <th className="px-3 py-2.5 text-right font-medium">SQL</th>
              <th className="px-3 py-2.5 text-right font-medium">상담전환</th>
              <th className="px-3 py-2.5 text-right font-medium">견적</th>
              <th className="px-3 py-2.5 text-right font-medium">계약</th>
              <th className="px-3 py-2.5 text-right font-medium">계약전환율</th>
              <th className="px-3 py-2.5 text-right font-medium">광고비</th>
              <th className="px-3 py-2.5 text-right font-medium">CPL</th>
              <th className="px-3 py-2.5 text-right font-medium">CAC</th>
              <th className="px-3 py-2.5 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr
                key={f.id}
                className={`border-b border-zinc-100 last:border-0 ${
                  isFreeChannel(f) ? "bg-emerald-50/50" : ""
                }`}
              >
                <td className="px-3 py-2.5 font-medium">
                  {f.source}
                  {isFreeChannel(f) && (
                    <span className="ml-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                      무료
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-zinc-500">{f.period}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(f.activities)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(f.leads)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(f.mql)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600">{fmtPct(mqlRate(f))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(f.sql)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600">{fmtPct(sqlRate(f))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(f.quotes)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(f.deals)}</td>
                <td className="px-3 py-2.5 text-right font-bold tabular-nums">{fmtPct(dealRate(f))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600">{fmtWon(f.spend)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600">{fmtWon(cpl(f))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600">{fmtWon(cac(f))}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                  <button
                    onClick={() => setModal({ mode: "edit", funnel: f })}
                    className="text-zinc-500 underline-offset-2 hover:underline"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => setModal({ mode: "delete", funnel: f })}
                    className="ml-2 text-red-500 underline-offset-2 hover:underline"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      ))}

      {/* 유료 채널 광고 성과 상세 */}
      {paidFunnels.length > 0 && (
        <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold">유료 채널 광고 성과</h2>
          <p className="mb-3 text-xs text-zinc-500">
            소진 금액 큰 순 · 노출·클릭은 채널 수정에서 입력합니다
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                  <th className="py-2 font-medium">채널</th>
                  <th className="py-2 font-medium">제품</th>
                  <th className="py-2 font-medium">기간</th>
                  <th className="py-2 text-right font-medium">소진 금액</th>
                  <th className="py-2 text-right font-medium">노출</th>
                  <th className="py-2 text-right font-medium">클릭</th>
                  <th className="py-2 text-right font-medium">CTR</th>
                  <th className="py-2 text-right font-medium">CPC</th>
                  <th className="py-2 text-right font-medium">리드</th>
                  <th className="py-2 text-right font-medium">CPL</th>
                  <th className="py-2 text-right font-medium">계약</th>
                  <th className="py-2 text-right font-medium">CAC</th>
                </tr>
              </thead>
              <tbody>
                {paidFunnels.map((f) => (
                  <tr key={f.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-2.5 font-medium">{f.source}</td>
                    <td className="py-2.5 text-zinc-600">{f.product}</td>
                    <td className="py-2.5 text-zinc-500">{f.period}</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">{fmtWon(f.spend)}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {f.adImpressions != null ? fmtNum(f.adImpressions) : "–"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {f.adClicks != null ? fmtNum(f.adClicks) : "–"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{fmtPct(ctr(f), 2)}</td>
                    <td className="py-2.5 text-right tabular-nums">{fmtWon(cpc(f))}</td>
                    <td className="py-2.5 text-right tabular-nums">{fmtNum(f.leads)}</td>
                    <td className="py-2.5 text-right tabular-nums">{fmtWon(cpl(f))}</td>
                    <td className="py-2.5 text-right tabular-nums">{fmtNum(f.deals)}</td>
                    <td className="py-2.5 text-right tabular-nums">{fmtWon(cac(f))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {modal?.mode === "add" && <ChannelFormModal onSave={saveFunnel} onClose={() => setModal(null)} />}
      {modal?.mode === "edit" && (
        <ChannelFormModal initial={modal.funnel} onSave={saveFunnel} onClose={() => setModal(null)} />
      )}
      {modal?.mode === "delete" && (
        <ConfirmDialog
          title="채널 퍼널 삭제"
          message={`${modal.funnel.period} "${modal.funnel.source}" 데이터를 삭제할까요? 되돌릴 수 없습니다.`}
          onConfirm={() => deleteFunnel(modal.funnel.id)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
