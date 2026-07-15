"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { KpiCard } from "@/components/KpiCard";
import { ThreadPostFormModal } from "@/components/ThreadPostFormModal";
import { ThreadImpressionsChart } from "@/components/charts/ThreadImpressionsChart";
import { fmtNum, fmtPct } from "@/lib/format";
import { availableMonths } from "@/lib/report";
import { clickRate, engagementRate, summarizeByTopic, summarizePosts } from "@/lib/threads";
import { useAppData } from "@/lib/use-app-data";
import type { ThreadPost } from "@/lib/types";

const filterCls =
  "rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";

type ModalState =
  | { mode: "add" }
  | { mode: "edit"; post: ThreadPost }
  | { mode: "delete"; post: ThreadPost }
  | null;

export default function ThreadsPage() {
  const { data, update } = useAppData();
  const [modal, setModal] = useState<ModalState>(null);
  const [monthFilter, setMonthFilter] = useState<string>("전체");

  const months = useMemo(() => (data ? availableMonths(data) : []), [data]);

  if (!data) return <p className="py-16 text-center text-sm text-zinc-400">불러오는 중…</p>;

  const posts = [...data.threadPosts]
    .filter((p) => monthFilter === "전체" || p.date.startsWith(monthFilter))
    .sort((a, b) => b.date.localeCompare(a.date));

  const summary = summarizePosts(posts);
  const byTopic = summarizeByTopic(posts);
  const chartData = [...posts]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({
      date: p.date.slice(5),
      impressions: p.impressions,
      leads: p.leadsGenerated,
      summary: p.summary,
    }));

  const savePost = (post: ThreadPost) =>
    update((d) => {
      const exists = d.threadPosts.some((p) => p.id === post.id);
      return {
        ...d,
        threadPosts: exists
          ? d.threadPosts.map((p) => (p.id === post.id ? post : p))
          : [...d.threadPosts, post],
      };
    });

  const deletePost = (id: string) =>
    update((d) => ({ ...d, threadPosts: d.threadPosts.filter((p) => p.id !== id) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold">스레드 운영</h1>
          <p className="text-xs text-zinc-500">
            게시글 로그·반응·유입 리드 · 스레드는 채널 퍼널의 &ldquo;스레드&rdquo; 소스와 연결됩니다
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            className={filterCls}
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            <option>전체</option>
            {months.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <button
            onClick={() => setModal({ mode: "add" })}
            className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + 게시글 추가
          </button>
        </div>
      </div>

      {/* 집계 카드 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="게시 수" value={fmtNum(summary.postCount)} sub={monthFilter} />
        <KpiCard label="총 노출" value={fmtNum(summary.totalImpressions)} />
        <KpiCard
          label="평균 반응률"
          value={fmtPct(summary.avgEngagementRate)}
          sub="총 반응 ÷ 총 노출"
        />
        <KpiCard label="유입 리드" value={fmtNum(summary.totalLeads)} sub="게시글 경유 문의" />
      </div>

      {/* 게시별 노출 추이 차트 */}
      {chartData.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">게시별 노출 (마우스를 올리면 유입 리드도 표시)</h2>
          <ThreadImpressionsChart data={chartData} />
        </section>
      )}

      {/* 토픽별 성과 비교 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">토픽별 성과 (유입 리드 순)</h2>
        {byTopic.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-400">데이터가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                  <th className="py-2 font-medium">토픽</th>
                  <th className="py-2 text-right font-medium">게시</th>
                  <th className="py-2 text-right font-medium">노출</th>
                  <th className="py-2 text-right font-medium">반응률</th>
                  <th className="py-2 text-right font-medium">클릭</th>
                  <th className="py-2 text-right font-medium">유입 리드</th>
                </tr>
              </thead>
              <tbody>
                {byTopic.map(({ topic, summary: s }) => (
                  <tr key={topic} className="border-b border-zinc-100 last:border-0">
                    <td className="py-2 font-medium">{topic}</td>
                    <td className="py-2 text-right tabular-nums">{fmtNum(s.postCount)}</td>
                    <td className="py-2 text-right tabular-nums">{fmtNum(s.totalImpressions)}</td>
                    <td className="py-2 text-right tabular-nums">{fmtPct(s.avgEngagementRate)}</td>
                    <td className="py-2 text-right tabular-nums">{fmtNum(s.totalClicks)}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{fmtNum(s.totalLeads)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 게시글 로그 */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
              <th className="px-3 py-2.5 font-medium">게시일</th>
              <th className="px-3 py-2.5 font-medium">토픽</th>
              <th className="px-3 py-2.5 font-medium">제품</th>
              <th className="px-3 py-2.5 font-medium">내용 요약</th>
              <th className="px-3 py-2.5 text-right font-medium">노출</th>
              <th className="px-3 py-2.5 text-right font-medium">반응률</th>
              <th className="px-3 py-2.5 text-right font-medium">클릭률</th>
              <th className="px-3 py-2.5 text-right font-medium">유입 리드</th>
              <th className="px-3 py-2.5 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-zinc-400">
                  게시글이 없습니다.
                </td>
              </tr>
            )}
            {posts.map((p) => (
              <tr key={p.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                <td className="whitespace-nowrap px-3 py-2.5 text-zinc-500">{p.date}</td>
                <td className="px-3 py-2.5">
                  <span className="whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs">
                    {p.topic}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-zinc-600">{p.product}</td>
                <td className="max-w-[280px] truncate px-3 py-2.5" title={p.summary}>
                  {p.summary}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(p.impressions)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtPct(engagementRate(p))}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtPct(clickRate(p))}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                  {fmtNum(p.leadsGenerated)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                  <button
                    onClick={() => setModal({ mode: "edit", post: p })}
                    className="text-zinc-500 underline-offset-2 hover:underline"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => setModal({ mode: "delete", post: p })}
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

      {modal?.mode === "add" && <ThreadPostFormModal onSave={savePost} onClose={() => setModal(null)} />}
      {modal?.mode === "edit" && (
        <ThreadPostFormModal initial={modal.post} onSave={savePost} onClose={() => setModal(null)} />
      )}
      {modal?.mode === "delete" && (
        <ConfirmDialog
          title="게시글 삭제"
          message={`"${modal.post.summary}" 게시글을 삭제할까요? 되돌릴 수 없습니다.`}
          onConfirm={() => deletePost(modal.post.id)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
