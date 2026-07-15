import type { Lead, LeadStatus } from "./types";

// 세일즈 퍼널 — 리드 상태를 단계 순서로 세어 제품별로 비교한다.
export const PIPELINE_STAGES: LeadStatus[] = ["신규", "상담중", "견적", "계약"];
export const OFF_PIPELINE: LeadStatus[] = ["보류", "이탈"]; // 퍼널 밖 상태

export interface StageRow {
  stage: LeadStatus;
  lingo: number;
  neuro: number;
  total: number;
}

function countRows(leads: Lead[], stages: LeadStatus[]): StageRow[] {
  return stages.map((stage) => {
    const rows = leads.filter((l) => l.status === stage);
    return {
      stage,
      lingo: rows.filter((l) => l.product === "링고").length,
      neuro: rows.filter((l) => l.product === "뉴로").length,
      total: rows.length,
    };
  });
}

export function pipelineBreakdown(leads: Lead[]): { funnel: StageRow[]; off: StageRow[] } {
  return { funnel: countRows(leads, PIPELINE_STAGES), off: countRows(leads, OFF_PIPELINE) };
}
