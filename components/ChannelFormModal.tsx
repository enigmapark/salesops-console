"use client";

import { useState } from "react";
import { SOURCES } from "@/lib/options";
import type { ChannelFunnel } from "@/lib/types";
import { Modal } from "./Modal";

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

// 퍼널 숫자 입력 필드 정의 (순서 = 퍼널 단계 순서)
const NUMBER_FIELDS: { key: keyof ChannelFunnel & string; label: string }[] = [
  { key: "activities", label: "활동 수 (발송·게시 등)" },
  { key: "leads", label: "리드" },
  { key: "contactable", label: "연락 가능" },
  { key: "mql", label: "MQL (유효)" },
  { key: "sql", label: "SQL (상담)" },
  { key: "quotes", label: "견적" },
  { key: "deals", label: "계약" },
  { key: "spend", label: "광고비 (원, 무료 채널은 0)" },
];

function emptyFunnel(): ChannelFunnel {
  return {
    id: crypto.randomUUID(),
    period: new Date().toISOString().slice(0, 7),
    source: "커뮤니티",
    activities: 0,
    leads: 0,
    contactable: 0,
    mql: 0,
    sql: 0,
    quotes: 0,
    deals: 0,
    spend: 0,
  };
}

export function ChannelFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: ChannelFunnel;
  onSave: (funnel: ChannelFunnel) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ChannelFunnel>(initial ? { ...initial } : emptyFunnel());

  const setNum = (key: keyof ChannelFunnel, value: string) =>
    setDraft((d) => ({ ...d, [key]: Math.max(0, Number(value) || 0) }));

  const handleSave = () => {
    if (!draft.period) {
      alert("기간(월)을 선택해주세요.");
      return;
    }
    onSave(draft);
    onClose();
  };

  return (
    <Modal title={initial ? "채널 퍼널 편집" : "채널 퍼널 추가"} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>기간 (월)</label>
            <input
              type="month"
              className={inputCls}
              value={draft.period}
              onChange={(e) => setDraft((d) => ({ ...d, period: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>채널</label>
            <select
              className={inputCls}
              value={draft.source}
              onChange={(e) =>
                setDraft((d) => ({ ...d, source: e.target.value as ChannelFunnel["source"] }))
              }
            >
              {SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {NUMBER_FIELDS.map(({ key, label }) => (
            <div key={key} className={key === "spend" ? "col-span-2" : ""}>
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

        {/* 유료 채널 광고 지표 (선택 입력) */}
        <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
          <p className="mb-2 text-xs font-semibold text-blue-700">
            광고 지표 (유료 채널용 — 무료 채널은 비워두세요)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>광고 노출</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={draft.adImpressions ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    adImpressions:
                      e.target.value === "" ? undefined : Math.max(0, Number(e.target.value) || 0),
                  }))
                }
              />
            </div>
            <div>
              <label className={labelCls}>광고 클릭</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={draft.adClicks ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    adClicks:
                      e.target.value === "" ? undefined : Math.max(0, Number(e.target.value) || 0),
                  }))
                }
              />
            </div>
          </div>
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
