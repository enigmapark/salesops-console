import { fmtWon } from "@/lib/format";
import type { MonthlyPnl } from "@/lib/types";

function Stat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 whitespace-nowrap text-base font-bold tracking-tight ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-zinc-400">{sub}</p>}
    </div>
  );
}

// 뉴로 손익·원가 — 개발팀 소유. 매출→원가→마진 + 원가 구성 시각화 (세일즈와 분리된 별도 섹션)
export function PnlSection({ pnl }: { pnl: MonthlyPnl }) {
  const margin = pnl.revenueSupply - pnl.totalCost;
  const marginRate = pnl.revenueSupply > 0 ? (margin / pnl.revenueSupply) * 100 : 0;
  const costRate = pnl.revenueSupply > 0 ? (pnl.totalCost / pnl.revenueSupply) * 100 : 0;
  const pct = (v: number) => (pnl.totalCost > 0 ? (v / pnl.totalCost) * 100 : 0);
  const parts = [
    { label: "Anthropic 토큰", value: pnl.tokenCost, bar: "bg-orange-500" },
    { label: "AWS 인프라", value: pnl.awsCost, bar: "bg-blue-600" },
    { label: "GCP 인프라", value: pnl.gcpCost, bar: "bg-amber-400" },
  ];

  return (
    <section className="rounded-xl border-2 border-zinc-900 bg-white p-4">
      <h2 className="mb-1 text-sm font-bold">
        뉴로 손익·원가{" "}
        <span className="text-xs font-normal text-zinc-400">
          개발팀 · {pnl.month} · 마진율 {marginRate.toFixed(1)}%
        </span>
      </h2>
      <p className="mb-3 text-[11px] text-zinc-400">
        매출 대비 원가율 {costRate.toFixed(1)}% · 원가의 {pct(pnl.tokenCost).toFixed(1)}%가 Anthropic
        토큰(AI), 인프라는 {(pct(pnl.awsCost) + pct(pnl.gcpCost)).toFixed(1)}%
      </p>

      {/* 매출 → 원가 → 마진 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="매출 (공급가)"
          value={fmtWon(pnl.revenueSupply)}
          sub={`청구 ${fmtWon(pnl.revenueBilled)}`}
          color="text-zinc-900"
        />
        <Stat label="총원가" value={fmtWon(pnl.totalCost)} sub="토큰+AWS+GCP" color="text-rose-600" />
        <Stat
          label="마진"
          value={fmtWon(margin)}
          sub={`마진율 ${marginRate.toFixed(1)}%`}
          color="text-emerald-600"
        />
        <Stat
          label="미청구 원가"
          value={fmtWon(pnl.unbilledCost)}
          sub={
            pnl.totalCost > 0
              ? `총원가의 ${((pnl.unbilledCost / pnl.totalCost) * 100).toFixed(1)}%`
              : undefined
          }
          color="text-zinc-500"
        />
      </div>

      {/* 원가 구성 — 가로 스택 바 */}
      <div className="mt-4">
        <p className="mb-1.5 text-xs font-semibold text-zinc-500">
          원가 구성 <span className="font-normal text-zinc-400">(총원가 {fmtWon(pnl.totalCost)})</span>
        </p>
        <div className="flex h-6 w-full overflow-hidden rounded-md border border-zinc-200">
          {parts.map((p) => (
            <div
              key={p.label}
              className={p.bar}
              style={{ width: `${pct(p.value)}%` }}
              title={`${p.label} ${pct(p.value).toFixed(1)}%`}
            />
          ))}
        </div>
        <div className="mt-2 space-y-1">
          {parts.map((p) => (
            <div key={p.label} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-zinc-600">
                <span className={`inline-block h-2.5 w-2.5 rounded-sm ${p.bar}`} />
                {p.label}
              </span>
              <span className="tabular-nums text-zinc-600">
                {fmtWon(p.value)} · {pct(p.value).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {pnl.note && <p className="mt-3 text-[11px] text-zinc-400">{pnl.note}</p>}
    </section>
  );
}
