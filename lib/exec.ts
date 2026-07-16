import { safeDiv } from "./channel";
import type { Lead } from "./types";

// 경영진 KPI용 집계 — "유입 월(코호트)"과 "계약 월(당월)"을 구분한다.
// 7월에 계약된 고객이 5월에 유입됐을 수 있으므로 둘은 다른 지표다.

// 계약 월 판정: 계약일이 있으면 계약일, 없으면(과거 데이터) 유입일로 대체
export function contractMonthOf(lead: Lead): string {
  return (lead.contractDate ?? lead.firstInquiry).slice(0, 7);
}

// 해당 월에 "계약된" 리드 (유입 시점 무관)
export function contractsInMonth(leads: Lead[], month: string): Lead[] {
  return leads.filter((l) => l.status === "계약" && contractMonthOf(l) === month);
}

// 해당 월에 "유입된" 리드 (코호트)
export function inflowInMonth(leads: Lead[], month: string): Lead[] {
  return leads.filter((l) => l.firstInquiry.startsWith(month));
}

// 신규 MRR: 해당 월 계약 고객의 월 이용료 합
export function newMrrInMonth(leads: Lead[], month: string): number {
  return contractsInMonth(leads, month).reduce((s, l) => s + (l.monthlyFee ?? 0), 0);
}

// 일회성 매출: 해당 월 계약 고객의 세팅비 합
export function oneOffInMonth(leads: Lead[], month: string): number {
  return contractsInMonth(leads, month).reduce((s, l) => s + (l.setupFee ?? 0), 0);
}

// 진행 파이프라인 금액: 아직 결론 안 난 활성 리드의 총 계약가치 합
export function pipelineValue(leads: Lead[]): { count: number; amount: number } {
  const active = leads.filter(
    (l) => l.status !== "계약" && l.status !== "이탈" && l.status !== "보류",
  );
  return { count: active.length, amount: active.reduce((s, l) => s + l.expectedAmount, 0) };
}

// 평균 계약 소요일: 유입일 → 계약일 (계약일이 입력된 계약 건 기준)
export function avgDaysToClose(leads: Lead[]): number | null {
  const closed = leads.filter((l) => l.status === "계약" && l.contractDate);
  if (closed.length === 0) return null;
  const totalDays = closed.reduce((s, l) => {
    const days =
      (new Date(l.contractDate!).getTime() - new Date(l.firstInquiry).getTime()) / 86400000;
    return s + Math.max(0, days);
  }, 0);
  return Math.round(totalDays / closed.length);
}

// 코호트 전환율: 해당 월 유입 리드 중 최종 계약된 비율
export function cohortConversion(leads: Lead[], month: string): number | null {
  const cohort = inflowInMonth(leads, month);
  return safeDiv(cohort.filter((l) => l.status === "계약").length, cohort.length);
}
