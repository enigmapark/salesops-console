import type { Grade } from "@/lib/types";

// 색상 + 텍스트 라벨을 항상 함께 표시한다 (색상만으로 구분 금지 — PRD 8장)
const STYLES: Record<Grade, string> = {
  "1등급": "border-red-200 bg-red-50 text-red-700",
  "2등급": "border-amber-200 bg-amber-50 text-amber-700",
  "3등급": "border-sky-200 bg-sky-50 text-sky-700",
  후순위: "border-zinc-200 bg-zinc-100 text-zinc-600",
  계약완료: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function GradeBadge({ grade }: { grade: Grade }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[grade]}`}
    >
      {grade}
    </span>
  );
}
