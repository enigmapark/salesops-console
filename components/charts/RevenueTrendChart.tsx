"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLOR_PAYMENT = "#6366f1"; // 실 결제 (막대) — 링고 색
const COLOR_DEALS = "#059669"; // 계약 건수 (선)

export interface RevenueTrendDatum {
  month: string; // YYYY-MM (오름차순 — 왼쪽이 과거, 오른쪽이 최신)
  actualPayment: number;
  deals: number;
}

const fmtManwon = (v: number) => `${Math.round(v / 10000).toLocaleString()}만`;

export function RevenueTrendChart({ data }: { data: RevenueTrendDatum[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: COLOR_PAYMENT }}
          />
          실 결제 (막대)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1 w-3 rounded-full" style={{ background: COLOR_DEALS }} />
          계약 건수 (선)
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={(m: string) => m.slice(2).replace("-", ".")}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#52525b" }}
          />
          <YAxis
            yAxisId="won"
            tickFormatter={fmtManwon}
            tickLine={false}
            axisLine={false}
            width={46}
            tick={{ fontSize: 11, fill: "#52525b" }}
          />
          <YAxis
            yAxisId="count"
            orientation="right"
            tickFormatter={(v: number) => `${v}건`}
            tickLine={false}
            axisLine={false}
            width={40}
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#52525b" }}
          />
          <Tooltip
            formatter={(value, name) =>
              name === "실 결제"
                ? [`${Number(value).toLocaleString()}원`, "실 결제"]
                : [`${Number(value)}건`, "계약 건수"]
            }
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }}
          />
          <Bar
            yAxisId="won"
            dataKey="actualPayment"
            name="실 결제"
            fill={COLOR_PAYMENT}
            barSize={22}
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="deals"
            name="계약 건수"
            stroke={COLOR_DEALS}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
