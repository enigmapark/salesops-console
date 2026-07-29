import type { AppData, MonthlyRevenue, Product } from "./types";

// 제품별 월별 매출 내역 (월 내림차순 정렬 — 최신 달이 맨 위)
export function revenuesFor(data: AppData, product: Product): MonthlyRevenue[] {
  return (data.monthlyRevenues ?? [])
    .filter((r) => r.product === product)
    .sort((a, b) => b.month.localeCompare(a.month));
}

// 특정 월·제품의 매출 1건
export function revenueOf(
  data: AppData,
  month: string,
  product: Product,
): MonthlyRevenue | undefined {
  return (data.monthlyRevenues ?? []).find((r) => r.month === month && r.product === product);
}

export interface RevenueTotals {
  deals: number;
  contractAmount: number;
  actualPayment: number;
  usageFee: number;
  credit: number;
  setupFee: number;
  otherOptions: number;
}

const ZERO: RevenueTotals = {
  deals: 0,
  contractAmount: 0,
  actualPayment: 0,
  usageFee: 0,
  credit: 0,
  setupFee: 0,
  otherOptions: 0,
};

// 제품별 누적 합계 (전체 기간)
export function revenueTotals(data: AppData, product: Product): RevenueTotals {
  return revenuesFor(data, product).reduce(
    (acc, r) => ({
      deals: acc.deals + r.deals,
      contractAmount: acc.contractAmount + r.contractAmount,
      actualPayment: acc.actualPayment + r.actualPayment,
      usageFee: acc.usageFee + r.usageFee,
      credit: acc.credit + r.credit,
      setupFee: acc.setupFee + r.setupFee,
      otherOptions: acc.otherOptions + r.otherOptions,
    }),
    { ...ZERO },
  );
}
