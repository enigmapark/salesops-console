// 데이터 모델 — PRD 4장 그대로

export type AcquisitionSource =
  | "메타광고"
  | "네이버광고"
  | "콜드메일"
  | "커뮤니티"
  | "카카오톡방"
  | "마케터채널"
  | "정부지원사업"
  | "레퍼럴"
  | "스레드"
  | "기타";

export type LostReason =
  | "가격부담"
  | "도입시기조정"
  | "내부승인지연"
  | "기존업체유지"
  | "경쟁사선택"
  | "필요기능부족"
  | "사업보류"
  | "연락두절"
  | "미확인"
  | "기타";

export type Product = "링고" | "뉴로";
export type LeadType = "신규창간" | "이관" | "기능문의" | "가격문의";
// 세일즈 퍼널 단계 순서: 신규 → 1차 연락 → 미팅 → 제안·견적 → 계약 검토 → 계약
// (보류·이탈은 퍼널 밖 상태)
export type LeadStatus =
  | "신규"
  | "1차 연락"
  | "미팅"
  | "제안·견적"
  | "계약 검토"
  | "계약"
  | "보류"
  | "이탈";
export type Grade = "1등급" | "2등급" | "3등급" | "후순위" | "계약완료";

export interface Lead {
  id: string;
  name: string;
  source: AcquisitionSource;
  product: Product;
  type: LeadType;
  status: LeadStatus;
  // 스코어링 입력
  hasQuote: boolean; // 가격·견적 문의 +3
  hadMeeting: boolean; // 미팅·데모 +3
  mentionedDate: boolean; // 도입 예정일 언급 +2
  talkedDM: boolean; // 의사결정자 통화 +2
  stale3m: boolean; // 3개월+ 미응답 -1
  businessStopped: boolean; // 사업 중단 -3
  // 관리 필드
  competitor?: string;
  expectedAmount: number; // 원
  firstInquiry: string; // YYYY-MM-DD
  nextContact?: string;
  lastContactDate?: string;
  contactAttempts: number;
  // 이탈/윈백
  lostReason?: LostReason;
  lostReasonConfirmed: boolean; // 확정 사유 vs 추정 사유
  lostReasonNote?: string;
  winbackDate?: string;
  note?: string;
}

export interface ChannelFunnel {
  id: string;
  period: string; // 예: 2026-07
  source: AcquisitionSource;
  activities: number; // 발송·게시 등 활동 수
  leads: number;
  contactable: number;
  mql: number;
  sql: number;
  quotes: number;
  deals: number;
  spend: number; // 원, 무료 채널은 0
  // 유료 채널 광고 지표 (선택 — 무료 채널은 비워둠)
  adImpressions?: number; // 광고 노출
  adClicks?: number; // 광고 클릭
}

export type ThreadTopic = "신문사" | "SEO" | "AI" | "마케팅" | "기타";

export interface ThreadPost {
  id: string;
  date: string; // YYYY-MM-DD
  topic: ThreadTopic;
  product: Product | "공통";
  summary: string; // 게시 내용 요약
  impressions: number; // 노출
  likes: number;
  comments: number;
  reposts: number;
  profileClicks: number; // 프로필/링크 클릭
  leadsGenerated: number; // 스레드로 유입된 리드 수
}

export interface ReportComment {
  month: string; // YYYY-MM
  why: string; // 이번 달 상황·배경
  how: string; // 어떻게 대응했나
  what: string; // 결과·다음 달 계획
  lingoNote?: string;
  neuroNote?: string;
  threadNote?: string;
}

// localStorage에 통째로 저장하는 앱 데이터 묶음
export interface AppData {
  leads: Lead[];
  funnels: ChannelFunnel[];
  threadPosts: ThreadPost[];
  reportComments: ReportComment[];
}
