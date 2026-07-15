"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { GradeBadge } from "@/components/GradeBadge";
import { KpiCard } from "@/components/KpiCard";
import { LeadFormModal } from "@/components/LeadFormModal";
import { fmtNum, fmtWon } from "@/lib/format";
import { GRADES, PRODUCTS, SOURCES } from "@/lib/options";
import { calcGrade, calcScore, needsContact, sortByScoreDesc } from "@/lib/scoring";
import { getToday } from "@/lib/today";
import { useAppData } from "@/lib/use-app-data";
import type { AcquisitionSource, Grade, Lead, Product } from "@/lib/types";

const filterCls =
  "rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";

type ModalState =
  | { mode: "add" }
  | { mode: "edit"; lead: Lead }
  | { mode: "delete"; lead: Lead }
  | null;

export default function LeadsPage() {
  const { data, update } = useAppData();
  const [modal, setModal] = useState<ModalState>(null);
  const [productFilter, setProductFilter] = useState<"전체" | Product>("전체");
  const [gradeFilter, setGradeFilter] = useState<"전체" | Grade>("전체");
  const [sourceFilter, setSourceFilter] = useState<"전체" | AcquisitionSource>("전체");

  if (!data) return <p className="py-16 text-center text-sm text-zinc-400">불러오는 중…</p>;

  const today = getToday();

  const filtered = data.leads.filter(
    (l) =>
      (productFilter === "전체" || l.product === productFilter) &&
      (gradeFilter === "전체" || calcGrade(l) === gradeFilter) &&
      (sourceFilter === "전체" || l.source === sourceFilter),
  );
  const leads = sortByScoreDesc(filtered);
  const contactCount = data.leads.filter((l) => needsContact(l, today)).length;

  // 상단 요약 — 링고/뉴로 구분 집계
  const summaryBy = (p: Product) => {
    const rows = data.leads.filter((l) => l.product === p);
    return { total: rows.length, deals: rows.filter((l) => l.status === "계약").length };
  };
  const lingoSum = summaryBy("링고");
  const neuroSum = summaryBy("뉴로");

  const saveLead = (lead: Lead) =>
    update((d) => {
      const exists = d.leads.some((l) => l.id === lead.id);
      return {
        ...d,
        leads: exists ? d.leads.map((l) => (l.id === lead.id ? lead : l)) : [...d.leads, lead],
      };
    });

  const deleteLead = (id: string) =>
    update((d) => ({ ...d, leads: d.leads.filter((l) => l.id !== id) }));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold">리드</h1>
          <p className="text-xs text-zinc-500">
            전체 {data.leads.length}건 · 연락 요망 {contactCount}건 · 점수 높은 순
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            className={filterCls}
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value as typeof productFilter)}
          >
            <option>전체</option>
            {PRODUCTS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select
            className={filterCls}
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value as typeof gradeFilter)}
          >
            <option>전체</option>
            {GRADES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <select
            className={filterCls}
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
          >
            <option>전체</option>
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => setModal({ mode: "add" })}
            className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + 리드 추가
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="전체 리드"
          value={fmtNum(data.leads.length)}
          sub={`계약 ${lingoSum.deals + neuroSum.deals}건`}
        />
        <KpiCard label="링고 리드" value={fmtNum(lingoSum.total)} sub={`계약 ${lingoSum.deals}건`} />
        <KpiCard label="뉴로 리드" value={fmtNum(neuroSum.total)} sub={`계약 ${neuroSum.deals}건`} />
        <KpiCard label="연락 요망" value={fmtNum(contactCount)} sub="다음 연락일이 오늘이거나 지남" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
              <th className="px-3 py-2.5 font-medium">이름</th>
              <th className="px-3 py-2.5 font-medium">제품</th>
              <th className="px-3 py-2.5 font-medium">채널</th>
              <th className="px-3 py-2.5 font-medium">상태</th>
              <th className="px-3 py-2.5 text-right font-medium">점수</th>
              <th className="px-3 py-2.5 font-medium">등급</th>
              <th className="px-3 py-2.5 font-medium">다음 연락</th>
              <th className="px-3 py-2.5 text-right font-medium">예상 금액</th>
              <th className="px-3 py-2.5 font-medium">이탈 사유</th>
              <th className="px-3 py-2.5 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-zinc-400">
                  조건에 맞는 리드가 없습니다.
                </td>
              </tr>
            )}
            {leads.map((l) => (
              <tr key={l.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                <td className="px-3 py-2.5 font-medium">{l.name}</td>
                <td className="px-3 py-2.5 text-zinc-600">
                  {l.product}
                  <span className="ml-1 text-xs text-zinc-400">{l.type}</span>
                </td>
                <td className="px-3 py-2.5 text-zinc-600">{l.source}</td>
                <td className="px-3 py-2.5 text-zinc-600">{l.status}</td>
                <td className="px-3 py-2.5 text-right font-bold tabular-nums">{calcScore(l)}</td>
                <td className="px-3 py-2.5">
                  <GradeBadge grade={calcGrade(l)} />
                </td>
                <td className="px-3 py-2.5">
                  {needsContact(l, today) ? (
                    <span className="inline-block whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                      연락 요망
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">{l.nextContact ?? "–"}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600">
                  {l.expectedAmount > 0 ? fmtWon(l.expectedAmount) : "–"}
                </td>
                <td className="px-3 py-2.5">
                  {l.lostReason ? (
                    <span className="text-xs">
                      <span className="whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-zinc-600">
                        {l.lostReason} · {l.lostReasonConfirmed ? "확인됨" : "추정"}
                      </span>
                      {l.winbackDate && (
                        <span className="ml-1 whitespace-nowrap text-zinc-400">
                          윈백 {l.winbackDate}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-300">–</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                  <button
                    onClick={() => setModal({ mode: "edit", lead: l })}
                    className="text-zinc-500 underline-offset-2 hover:underline"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => setModal({ mode: "delete", lead: l })}
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

      {modal?.mode === "add" && (
        <LeadFormModal onSave={saveLead} onClose={() => setModal(null)} />
      )}
      {modal?.mode === "edit" && (
        <LeadFormModal initial={modal.lead} onSave={saveLead} onClose={() => setModal(null)} />
      )}
      {modal?.mode === "delete" && (
        <ConfirmDialog
          title="리드 삭제"
          message={`"${modal.lead.name}" 리드를 삭제할까요? 되돌릴 수 없습니다.`}
          onConfirm={() => deleteLead(modal.lead.id)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
