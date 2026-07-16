import type { AcquisitionSource, ChannelFunnel } from "./types";

// 유료 매체(광고 채널) — 소진 금액이 아직 0이어도 무료 채널로 취급하지 않는다
const PAID_SOURCES: AcquisitionSource[] = ["메타광고", "네이버광고"];

// 분모 0 방어: 분모가 0이면 계산값 대신 null을 돌려준다.
// (0%와 "데이터 없음"은 다르다 — 화면에서는 null을 "–"로 표시한다.)
export function safeDiv(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

// PRD 5.4 — 채널·퍼널 지표
export function mqlRate(f: ChannelFunnel): number | null {
  return safeDiv(f.mql, f.leads); // 유효율
}

export function sqlRate(f: ChannelFunnel): number | null {
  return safeDiv(f.sql, f.mql); // 상담전환
}

export function dealRate(f: ChannelFunnel): number | null {
  return safeDiv(f.deals, f.leads); // 계약전환 = 전체 전환율
}

export function cpl(f: ChannelFunnel): number | null {
  return safeDiv(f.spend, f.leads);
}

export function cac(f: ChannelFunnel): number | null {
  return safeDiv(f.spend, f.deals);
}

export function isFreeChannel(f: ChannelFunnel): boolean {
  return f.spend === 0 && !PAID_SOURCES.includes(f.source);
}

// 유료 채널 광고 지표 — 입력이 없으면(무료 채널 등) null
export function ctr(f: ChannelFunnel): number | null {
  if (f.adImpressions == null || f.adClicks == null) return null;
  return safeDiv(f.adClicks, f.adImpressions);
}

export function cpc(f: ChannelFunnel): number | null {
  if (f.adClicks == null) return null;
  return safeDiv(f.spend, f.adClicks);
}

// 채널 목록 정렬: 계약전환율 내림차순 (전환율 없는 채널은 뒤로)
export function sortByDealRateDesc(funnels: ChannelFunnel[]): ChannelFunnel[] {
  return [...funnels].sort((a, b) => {
    const ra = dealRate(a);
    const rb = dealRate(b);
    if (ra === null && rb === null) return 0;
    if (ra === null) return 1;
    if (rb === null) return -1;
    return rb - ra;
  });
}

// 채널 목록 정렬(채널 화면용): 유료 광고 채널(네이버·메타 등)을 맨 위로 — 소진 금액 큰 순,
// 그 아래 무료 채널은 계약전환율 순
export function sortPaidFirst(funnels: ChannelFunnel[]): ChannelFunnel[] {
  const paid = funnels.filter((f) => !isFreeChannel(f)).sort((a, b) => b.spend - a.spend);
  const free = sortByDealRateDesc(funnels.filter((f) => isFreeChannel(f)));
  return [...paid, ...free];
}

// 여러 퍼널 행 합산 (대시보드·월간 보고용)
export function sumFunnels(funnels: ChannelFunnel[]) {
  return funnels.reduce(
    (acc, f) => ({
      activities: acc.activities + f.activities,
      leads: acc.leads + f.leads,
      contactable: acc.contactable + f.contactable,
      mql: acc.mql + f.mql,
      sql: acc.sql + f.sql,
      quotes: acc.quotes + f.quotes,
      deals: acc.deals + f.deals,
      spend: acc.spend + f.spend,
    }),
    { activities: 0, leads: 0, contactable: 0, mql: 0, sql: 0, quotes: 0, deals: 0, spend: 0 },
  );
}
