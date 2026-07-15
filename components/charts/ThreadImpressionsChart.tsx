"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLOR = "#3b82f6"; // 단일 시리즈 — 단일 색

export interface ThreadTrendDatum {
  date: string; // MM-DD
  impressions: number;
  leads: number;
  summary: string;
}

export function ThreadImpressionsChart({ data }: { data: ThreadTrendDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={{ stroke: "#e4e4e7" }}
          tick={{ fontSize: 12, fill: "#52525b" }}
        />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          content={({ active, payload, label }) => {
            if (!active || !payload || payload.length === 0) return null;
            const d = payload[0].payload as ThreadTrendDatum;
            return (
              <div className="max-w-[240px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm">
                <p className="font-semibold">{label}</p>
                <p className="mt-0.5 truncate text-zinc-500">{d.summary}</p>
                <p className="mt-1">
                  노출 {d.impressions.toLocaleString("ko-KR")} · 유입 리드 {d.leads}건
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="impressions" fill={COLOR} barSize={28} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
