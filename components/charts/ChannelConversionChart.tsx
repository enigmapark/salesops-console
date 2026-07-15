"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// 색상은 채널 성격(무료/유료)을 따라간다 — 검증된 팔레트(CVD-safe)
const COLOR_FREE = "#059669"; // 무료 채널
const COLOR_PAID = "#3b82f6"; // 유료 채널

export interface ChannelRateDatum {
  name: string;
  rate: number; // % (소수 1자리)
  free: boolean;
}

export function ChannelConversionChart({ data }: { data: ChannelRateDatum[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR_FREE }} />
          무료 채널
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR_PAID }} />
          유료 채널
        </span>
      </div>
      <ResponsiveContainer width="100%" height={data.length * 34 + 16}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 44, bottom: 0, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={92}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#52525b" }}
          />
          <Tooltip
            formatter={(value) => [`${value}%`, "계약전환율"]}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }}
          />
          <Bar dataKey="rate" barSize={18} radius={[0, 4, 4, 0]}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.free ? COLOR_FREE : COLOR_PAID} />
            ))}
            <LabelList
              dataKey="rate"
              position="right"
              formatter={(v) => `${v}%`}
              style={{ fontSize: 11, fill: "#52525b" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
