import type { Grade, Lead } from "./types";

// PRD 5.1 — 리드 점수
export function calcScore(lead: Lead): number {
  return (
    (lead.hasQuote ? 3 : 0) +
    (lead.hadMeeting ? 3 : 0) +
    (lead.mentionedDate ? 2 : 0) +
    (lead.talkedDM ? 2 : 0) -
    (lead.stale3m ? 1 : 0) -
    (lead.businessStopped ? 3 : 0)
  );
}

// PRD 5.2 — 등급. 강제 규칙(계약완료 → 후순위)이 점수보다 우선한다.
export function calcGrade(lead: Lead): Grade {
  if (lead.status === "계약") return "계약완료";
  if (lead.businessStopped || lead.status === "이탈") return "후순위";
  const s = calcScore(lead);
  if (s >= 8) return "1등급";
  if (s >= 5) return "2등급";
  if (s >= 2) return "3등급";
  return "후순위";
}

// PRD 5.3 — 연락 요망. nextContact가 없으면 판단 불가이므로 false.
export function needsContact(lead: Lead, today: string): boolean {
  if (!lead.nextContact) return false;
  if (lead.status === "계약" || lead.status === "이탈") return false;
  return lead.nextContact <= today;
}

// 리드 목록 정렬: 점수 내림차순 (동점이면 최초 문의일 오름차순 = 오래된 리드 먼저)
export function sortByScoreDesc(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => {
    const diff = calcScore(b) - calcScore(a);
    if (diff !== 0) return diff;
    return a.firstInquiry.localeCompare(b.firstInquiry);
  });
}
