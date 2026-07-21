"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { genId } from "@/lib/id";
import { PRODUCT_SCOPES } from "@/lib/options";
import { getToday } from "@/lib/today";
import { useAppData } from "@/lib/use-app-data";
import type { AppData, InsightStatus, ProductScope, SalesInsight } from "@/lib/types";

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";

const STATUSES: InsightStatus[] = ["발굴", "진행중", "완료", "보류"];
const STATUS_STYLE: Record<InsightStatus, string> = {
  발굴: "border-sky-200 bg-sky-50 text-sky-700",
  진행중: "border-amber-200 bg-amber-50 text-amber-700",
  완료: "border-emerald-200 bg-emerald-50 text-emerald-700",
  보류: "border-zinc-200 bg-zinc-100 text-zinc-500",
};

export default function InsightsPage() {
  const { data, update } = useAppData();
  const [product, setProduct] = useState<ProductScope>("링고");
  const [title, setTitle] = useState("");
  const [action, setAction] = useState("");
  const [delId, setDelId] = useState<string | null>(null);

  if (!data) return <p className="py-16 text-center text-sm text-zinc-400">불러오는 중…</p>;

  const insights = [...data.salesInsights].sort((a, b) => b.date.localeCompare(a.date));

  const add = () => {
    if (!title.trim()) {
      alert("무엇을 발견했는지 제목을 입력해주세요.");
      return;
    }
    const item: SalesInsight = {
      id: genId(),
      date: getToday(),
      product,
      title: title.trim(),
      action: action.trim(),
      status: "발굴",
    };
    update((d: AppData) => ({ ...d, salesInsights: [...d.salesInsights, item] }));
    setTitle("");
    setAction("");
  };

  const setStatus = (id: string, status: InsightStatus) =>
    update((d: AppData) => ({
      ...d,
      salesInsights: d.salesInsights.map((x) => (x.id === id ? { ...x, status } : x)),
    }));

  const remove = (id: string) =>
    update((d: AppData) => ({ ...d, salesInsights: d.salesInsights.filter((x) => x.id !== id) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">영업 기회 · 타겟 아이디어</h1>
        <p className="text-xs text-zinc-500">
          시장 신호에서 발견한 영업 아이디어를 쌓고 실행 상태를 관리합니다.
        </p>
      </div>

      {/* 추가 폼 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">제품</label>
            <select
              className={inputCls}
              value={product}
              onChange={(e) => setProduct(e.target.value as ProductScope)}
            >
              {PRODUCT_SCOPES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">발견한 신호</label>
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 최근 인터넷신문 등록에 필라테스 매체 5건"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">실행 아이디어</label>
            <input
              className={inputCls}
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="예: 필라테스 커뮤니티·카페에 링고 게시"
            />
          </div>
          <button
            onClick={add}
            className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + 추가
          </button>
        </div>
      </section>

      {/* 목록 */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
              <th className="px-3 py-2.5 font-medium">발견일</th>
              <th className="px-3 py-2.5 font-medium">제품</th>
              <th className="px-3 py-2.5 font-medium">발견한 신호</th>
              <th className="px-3 py-2.5 font-medium">실행 아이디어</th>
              <th className="px-3 py-2.5 font-medium">상태</th>
              <th className="px-3 py-2.5 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {insights.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-zinc-400">
                  아직 등록된 영업 기회가 없습니다. 위에서 추가해보세요.
                </td>
              </tr>
            )}
            {insights.map((it) => (
              <tr key={it.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                <td className="whitespace-nowrap px-3 py-2.5 text-zinc-500">{it.date}</td>
                <td className="px-3 py-2.5 text-zinc-600">{it.product}</td>
                <td className="px-3 py-2.5 font-medium">{it.title}</td>
                <td className="px-3 py-2.5 text-zinc-600">{it.action || "–"}</td>
                <td className="px-3 py-2.5">
                  <select
                    value={it.status}
                    onChange={(e) => setStatus(it.id, e.target.value as InsightStatus)}
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[it.status]}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                  <button
                    onClick={() => setDelId(it.id)}
                    className="text-red-500 underline-offset-2 hover:underline"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {delId && (
        <ConfirmDialog
          title="영업 기회 삭제"
          message="이 항목을 삭제할까요? 되돌릴 수 없습니다."
          onConfirm={() => remove(delId)}
          onClose={() => setDelId(null)}
        />
      )}
    </div>
  );
}
