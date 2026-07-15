import { needsContact } from "./scoring";
import type { Lead } from "./types";

// "오늘의 액션" — 수치가 아니라 오늘 연락할 대상을 뽑아준다.
// 지금 데이터로 판단 가능한 4가지 신호를 사용한다.
export type ActionType = "overdue" | "winback" | "stale" | "no-next";

export interface ActionItem {
  lead: Lead;
  type: ActionType;
  reason: string;
}

const PRIORITY: Record<ActionType, number> = {
  overdue: 0, // 다음 연락일 지남 — 가장 급함
  winback: 1, // 윈백 예정일 도래
  stale: 2, // 3개월+ 미응답
  "no-next": 3, // 다음 연락일 미입력 (관리 누락)
};

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
}

export function todaysActions(leads: Lead[], today: string): ActionItem[] {
  const items: ActionItem[] = [];
  for (const l of leads) {
    const active = l.status !== "계약" && l.status !== "이탈";

    if (needsContact(l, today)) {
      const d = daysBetween(l.nextContact!, today);
      items.push({
        lead: l,
        type: "overdue",
        reason: d <= 0 ? "다음 연락일이 오늘" : `다음 연락일 ${d}일 지남`,
      });
    } else if (active && !l.nextContact) {
      items.push({ lead: l, type: "no-next", reason: "다음 연락일 미입력" });
    }

    if (active && l.stale3m) {
      items.push({ lead: l, type: "stale", reason: "3개월 이상 미응답" });
    }

    if (l.status === "이탈" && l.winbackDate && l.winbackDate <= today) {
      items.push({ lead: l, type: "winback", reason: "윈백 예정일 도래" });
    }
  }
  return items.sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type]);
}
