import type {
  AcquisitionSource,
  Grade,
  LeadStatus,
  LeadType,
  LostReason,
  Product,
  ThreadTopic,
} from "./types";

// 셀렉트 박스 옵션 — 타입 유니언과 1:1로 유지한다.
export const SOURCES: AcquisitionSource[] = [
  "메타광고",
  "네이버광고",
  "콜드메일",
  "커뮤니티",
  "카카오톡방",
  "마케터채널",
  "정부지원사업",
  "레퍼럴",
  "스레드",
  "기타",
];

export const LOST_REASONS: LostReason[] = [
  "가격부담",
  "도입시기조정",
  "내부승인지연",
  "기존업체유지",
  "경쟁사선택",
  "필요기능부족",
  "사업보류",
  "연락두절",
  "미확인",
  "기타",
];

export const PRODUCTS: Product[] = ["링고", "뉴로"];
export const LEAD_TYPES: LeadType[] = ["신규창간", "이관", "기능문의", "가격문의"];
export const LEAD_STATUSES: LeadStatus[] = [
  "신규",
  "1차 연락",
  "미팅",
  "제안·견적",
  "계약 검토",
  "계약",
  "보류",
  "이탈",
];
export const GRADES: Grade[] = ["1등급", "2등급", "3등급", "후순위", "계약완료"];
export const THREAD_TOPICS: ThreadTopic[] = ["신문사", "SEO", "AI", "마케팅", "기타"];
