import { safeDiv } from "./channel";
import type { AppData, MonthlyAdStat, Product } from "./types";

// 매체 표시 순서·짧은 라벨 (주간과 동일 규칙)
const AD_ORDER: MonthlyAdStat["source"][] = ["메타광고", "네이버광고", "GPT광고", "구글광고"];
export const AD_LABEL: Record<MonthlyAdStat["source"], string> = {
  메타광고: "메타",
  네이버광고: "네이버",
  GPT광고: "GPT",
  구글광고: "구글",
};

export function monthlyAdStatsFor(data: AppData, month: string, product: Product): MonthlyAdStat[] {
  return (data.monthlyAdStats ?? [])
    .filter((a) => a.month === month && a.product === product)
    .sort((a, b) => AD_ORDER.indexOf(a.source) - AD_ORDER.indexOf(b.source));
}

// 해당 월·제품의 광고비 합 (CAC·제품 비교 광고비의 원천)
export function adSpendInMonth(data: AppData, month: string, product: Product): number {
  return monthlyAdStatsFor(data, month, product).reduce((s, a) => s + a.spend, 0);
}

// 해당 월·제품의 광고 기여 문의 합
export function adInquiriesInMonth(data: AppData, month: string, product: Product): number {
  return monthlyAdStatsFor(data, month, product).reduce((s, a) => s + a.inquiries, 0);
}

// 매체별 CPL (광고비 ÷ 문의). 문의 0이면 null
export function adCplMonthly(a: MonthlyAdStat): number | null {
  return safeDiv(a.spend, a.inquiries);
}

export interface AdTotals {
  spend: number;
  impressions: number;
  clicks: number;
  inquiries: number;
}
export function adTotals(rows: MonthlyAdStat[]): AdTotals {
  return rows.reduce(
    (a, r) => ({
      spend: a.spend + r.spend,
      impressions: a.impressions + r.impressions,
      clicks: a.clicks + r.clicks,
      inquiries: a.inquiries + r.inquiries,
    }),
    { spend: 0, impressions: 0, clicks: 0, inquiries: 0 },
  );
}
