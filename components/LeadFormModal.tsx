"use client";

import { useState } from "react";
import { genId } from "@/lib/id";
import { LEAD_STATUSES, LEAD_TYPES, LOST_REASONS, PRODUCTS, SOURCES } from "@/lib/options";
import { calcGrade, calcScore } from "@/lib/scoring";
import { getToday } from "@/lib/today";
import type { Lead, LostReason } from "@/lib/types";
import { GradeBadge } from "./GradeBadge";
import { Modal } from "./Modal";

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

// 점수에 들어가는 체크박스 6종 (PRD 5.1)
const SCORE_CHECKS: {
  key: "hasQuote" | "hadMeeting" | "mentionedDate" | "talkedDM" | "stale3m" | "businessStopped";
  label: string;
}[] = [
  { key: "hasQuote", label: "가격·견적 문의 (+3)" },
  { key: "hadMeeting", label: "미팅·데모 진행 (+3)" },
  { key: "mentionedDate", label: "도입 예정일 언급 (+2)" },
  { key: "talkedDM", label: "의사결정자 통화 (+2)" },
  { key: "stale3m", label: "3개월+ 미응답 (−1)" },
  { key: "businessStopped", label: "사업 중단 (−3)" },
];

function emptyLead(): Lead {
  return {
    id: genId(),
    name: "",
    source: "커뮤니티",
    product: "링고",
    type: "신규창간",
    status: "신규",
    hasQuote: false,
    hadMeeting: false,
    mentionedDate: false,
    talkedDM: false,
    stale3m: false,
    businessStopped: false,
    expectedAmount: 0,
    firstInquiry: getToday(),
    contactAttempts: 0,
    lostReasonConfirmed: false,
  };
}

export function LeadFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Lead;
  onSave: (lead: Lead) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Lead>(initial ? { ...initial } : emptyLead());

  const set = <K extends keyof Lead>(key: K, value: Lead[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = () => {
    if (!draft.name.trim()) {
      alert("리드 이름을 입력해주세요.");
      return;
    }
    const lead = { ...draft, name: draft.name.trim() };
    // 이탈로 저장하는데 사유가 비어 있으면 "미확인"으로 채운다
    if (lead.status === "이탈" && !lead.lostReason) lead.lostReason = "미확인";
    onSave(lead);
    onClose();
  };

  return (
    <Modal title={initial ? "리드 편집" : "리드 추가"} onClose={onClose}>
      <div className="space-y-4">
        {/* 기본 정보 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>이름 *</label>
            <input
              className={inputCls}
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="예: 한빛일보"
            />
          </div>
          <div>
            <label className={labelCls}>제품</label>
            <select
              className={inputCls}
              value={draft.product}
              onChange={(e) => set("product", e.target.value as Lead["product"])}
            >
              {PRODUCTS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>획득 채널</label>
            <select
              className={inputCls}
              value={draft.source}
              onChange={(e) => set("source", e.target.value as Lead["source"])}
            >
              {SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>유형</label>
            <select
              className={inputCls}
              value={draft.type}
              onChange={(e) => set("type", e.target.value as Lead["type"])}
            >
              {LEAD_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>상태</label>
            <select
              className={inputCls}
              value={draft.status}
              onChange={(e) => set("status", e.target.value as Lead["status"])}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>예상 금액 (원)</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={draft.expectedAmount}
              onChange={(e) => set("expectedAmount", Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
        </div>

        {/* 스코어링 체크 + 실시간 점수 */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-600">스코어링 체크</p>
            <p className="flex items-center gap-2 text-sm">
              <span className="font-bold">{calcScore(draft)}점</span>
              <GradeBadge grade={calcGrade(draft)} />
            </p>
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {SCORE_CHECKS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={draft[key]}
                  onChange={(e) => set(key, e.target.checked)}
                  className="h-4 w-4 accent-zinc-900"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* 연락 관리 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className={labelCls}>최초 문의일</label>
            <input
              type="date"
              className={inputCls}
              value={draft.firstInquiry}
              onChange={(e) => set("firstInquiry", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>다음 연락일</label>
            <input
              type="date"
              className={inputCls}
              value={draft.nextContact ?? ""}
              onChange={(e) => set("nextContact", e.target.value || undefined)}
            />
          </div>
          <div>
            <label className={labelCls}>마지막 연락일</label>
            <input
              type="date"
              className={inputCls}
              value={draft.lastContactDate ?? ""}
              onChange={(e) => set("lastContactDate", e.target.value || undefined)}
            />
          </div>
          <div>
            <label className={labelCls}>연락 시도 횟수</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={draft.contactAttempts}
              onChange={(e) => set("contactAttempts", Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>경쟁사</label>
            <input
              className={inputCls}
              value={draft.competitor ?? ""}
              onChange={(e) => set("competitor", e.target.value || undefined)}
              placeholder="예: 기존 CMS 업체"
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>메모</label>
            <input
              className={inputCls}
              value={draft.note ?? ""}
              onChange={(e) => set("note", e.target.value || undefined)}
            />
          </div>
        </div>

        {/* 이탈/윈백 — 상태가 이탈이거나 사유가 이미 있으면 표시 */}
        {(draft.status === "이탈" || draft.lostReason) && (
          <div className="rounded-lg border border-red-100 bg-red-50/50 p-3">
            <p className="mb-2 text-xs font-semibold text-red-700">이탈 / 윈백</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>이탈 사유</label>
                <select
                  className={inputCls}
                  value={draft.lostReason ?? "미확인"}
                  onChange={(e) => set("lostReason", e.target.value as LostReason)}
                >
                  {LOST_REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>윈백 예정일</label>
                <input
                  type="date"
                  className={inputCls}
                  value={draft.winbackDate ?? ""}
                  onChange={(e) => set("winbackDate", e.target.value || undefined)}
                />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={draft.lostReasonConfirmed}
                  onChange={(e) => set("lostReasonConfirmed", e.target.checked)}
                  className="h-4 w-4 accent-zinc-900"
                />
                고객에게 직접 확인한 사유 (체크 안 하면 &ldquo;추정&rdquo;으로 표시)
              </label>
              <div className="col-span-2">
                <label className={labelCls}>사유 메모</label>
                <input
                  className={inputCls}
                  value={draft.lostReasonNote ?? ""}
                  onChange={(e) => set("lostReasonNote", e.target.value || undefined)}
                />
              </div>
            </div>
          </div>
        )}

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
