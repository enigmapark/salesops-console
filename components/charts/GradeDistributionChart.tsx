"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PRODUCT_COLORS } from "./productColors";

export interface GradeDatum {
  grade: string;
  lingo: number;
  neuro: number;
}

// 등급 분포 — 링고/뉴로 그룹 막대 (색상은 제품을 따라감, 검증된 팔레트)
export function GradeDistributionChart({ data }: { data: GradeDatum[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: PRODUCT_COLORS.링고 }}
          />
          링고
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: PRODUCT_COLORS.뉴로 }}
          />
          뉴로
        </span>
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barCategoryGap="24%">
          <XAxis
            dataKey="grade"
            tickLine={false}
            axisLine={{ stroke: "#e4e4e7" }}
            tick={{ fontSize: 12, fill: "#52525b" }}
          />
          <YAxis hide allowDecimals={false} />
          <Tooltip
            formatter={(value, name) => [`${value}건`, name === "lingo" ? "링고" : "뉴로"]}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }}
          />
          <Bar dataKey="lingo" fill={PRODUCT_COLORS.링고} barSize={16} radius={[4, 4, 0, 0]} />
          <Bar dataKey="neuro" fill={PRODUCT_COLORS.뉴로} barSize={16} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
