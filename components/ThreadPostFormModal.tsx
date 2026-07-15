"use client";

import { useState } from "react";
import { genId } from "@/lib/id";
import { THREAD_TOPICS } from "@/lib/options";
import { getToday } from "@/lib/today";
import type { ThreadPost } from "@/lib/types";
import { Modal } from "./Modal";

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

const THREAD_PRODUCTS: ThreadPost["product"][] = ["링고", "뉴로", "공통"];

const NUMBER_FIELDS: { key: keyof ThreadPost & string; label: string }[] = [
  { key: "impressions", label: "노출" },
  { key: "likes", label: "좋아요" },
  { key: "comments", label: "댓글" },
  { key: "reposts", label: "리포스트" },
  { key: "profileClicks", label: "프로필/링크 클릭" },
  { key: "leadsGenerated", label: "유입 리드" },
];

function emptyPost(): ThreadPost {
  return {
    id: genId(),
    date: getToday(),
    topic: "신문사",
    product: "링고",
    summary: "",
    impressions: 0,
    likes: 0,
    comments: 0,
    reposts: 0,
    profileClicks: 0,
    leadsGenerated: 0,
  };
}

export function ThreadPostFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: ThreadPost;
  onSave: (post: ThreadPost) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ThreadPost>(initial ? { ...initial } : emptyPost());

  const setNum = (key: keyof ThreadPost, value: string) =>
    setDraft((d) => ({ ...d, [key]: Math.max(0, Number(value) || 0) }));

  const handleSave = () => {
    if (!draft.summary.trim()) {
      alert("게시 내용 요약을 입력해주세요.");
      return;
    }
    onSave({ ...draft, summary: draft.summary.trim() });
    onClose();
  };

  return (
    <Modal title={initial ? "게시글 편집" : "게시글 추가"} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>게시일</label>
            <input
              type="date"
              className={inputCls}
              value={draft.date}
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>토픽</label>
            <select
              className={inputCls}
              value={draft.topic}
              onChange={(e) => setDraft((d) => ({ ...d, topic: e.target.value as ThreadPost["topic"] }))}
            >
              {THREAD_TOPICS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>제품</label>
            <select
              className={inputCls}
              value={draft.product}
              onChange={(e) =>
                setDraft((d) => ({ ...d, product: e.target.value as ThreadPost["product"] }))
              }
            >
              {THREAD_PRODUCTS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>게시 내용 요약 *</label>
          <input
            className={inputCls}
            value={draft.summary}
            onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
            placeholder="예: 지역 신문사가 CMS를 갈아탄 뒤 달라진 점 3가지"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {NUMBER_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className={labelCls}>{label}</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={draft[key] as number}
                onChange={(e) => setNum(key, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            저장
          </button>
        </div>
      </div>
    </Modal>
  );
}
