"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLOR = "#3b82f6"; // 단일 시리즈 — 단일 색 (등급 이름은 축 라벨이 담당)

export interface GradeDatum {
  grade: string;
  count: number;
}

export function GradeDistributionChart({ data }: { data: GradeDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 8 }}>
        <XAxis
          dataKey="grade"
          tickLine={false}
          axisLine={{ stroke: "#e4e4e7" }}
          tick={{ fontSize: 12, fill: "#52525b" }}
        />
        <YAxis hide />
        <Tooltip
          formatter={(value) => [`${value}건`, "리드 수"]}
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }}
        />
        <Bar dataKey="count" fill={COLOR} barSize={36} radius={[4, 4, 0, 0]}>
          <LabelList dataKey="count" position="top" style={{ fontSize: 12, fill: "#52525b" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
