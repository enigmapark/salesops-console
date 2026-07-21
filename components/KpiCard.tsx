import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  sub,
  small = false,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  small?: boolean; // 긴 금액 등 — 값 글자를 작게 (카드 크기는 동일)
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p
        className={`mt-1 whitespace-nowrap font-bold tracking-tight ${small ? "text-base" : "text-2xl"}`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}
