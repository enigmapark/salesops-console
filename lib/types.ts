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
// 채널·스레드처럼 두 제품에 걸칠 수 있는 데이터의 제품 구분
export type ProductScope = Product | "공통";
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
export type DealProbability = "높음" | "보통" | "낮음";

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
  // 매출 3분리: 월 이용료(MRR) × 12 + 초기 세팅비 = 총 계약가치(expectedAmount)
  expectedAmount: number; // 원 — 총 계약가치
  monthlyFee?: number; // 월 이용료 (반복 매출, MRR)
  setupFee?: number; // 초기 세팅비 등 일회성 매출
  firstInquiry: string; // YYYY-MM-DD (유입일 — 코호트 기준)
  contractDate?: string; // 계약일 (당월 계약 집계 기준)
  isUpsell?: boolean; // 기존 고객 부가서비스 업셀 — 신규 계약 건수에서는 제외, MRR엔 포함
  nextContact?: string; // 다음 액션 예정일
  nextAction?: string; // 다음 액션 내용 (예: 견적 리마인드 전화)
  dealProbability?: DealProbability; // 계약 가능성
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
  product: ProductScope; // 링고/뉴로는 반드시 구분, 정말 공용인 것만 "공통"
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

export type ThreadTopic =
  | "언론사 창업"
  | "신문사"
  | "SEO"
  | "AI 마케팅"
  | "AI"
  | "마케팅"
  | "기타";

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
  headline?: string; // 이번 달 결론 (맨 위 10초 요약 — 성과·리스크 한 줄)
  decisions?: string; // 경영진 결정·지원 필요 (1~2줄)
  why: string; // 이번 달 상황·배경
  how: string; // 어떻게 대응했나
  what: string; // 결과·다음 달 계획
  lingoNote?: string;
  neuroNote?: string;
  threadNote?: string;
}

// 주간 세일즈 활동 (콜드메일 발송·통화·미팅 등 — 주간 현황에서 직접 입력)
export interface WeeklyActivity {
  id: string; // `${weekStart}:${product}`
  weekStart: string; // 해당 주 월요일 (YYYY-MM-DD)
  product: Product;
  coldEmails: number; // 콜드메일 발송 수
  calls: number; // 통화 수
  meetings: number; // 미팅 수
  note?: string;
}

// 주간 광고 성과 (매체별 — 주간 현황 표시용. 채널 화면의 월 누적과 별도)
export interface WeeklyAdStat {
  id: string; // `${weekStart}:${product}:${source}`
  weekStart: string; // 해당 주 수요일 (YYYY-MM-DD)
  product: Product;
  source: "메타광고" | "네이버광고" | "GPT광고" | "구글광고";
  spend: number;
  impressions: number;
  clicks: number;
  inquiries: number; // 신규 문의
}

// 주간 코멘트 (대표 보고용 한 줄 해석·계획 — 주 단위 1건)
export interface WeeklyNote {
  weekStart: string; // 해당 주 수요일 (YYYY-MM-DD)
  text: string;
}

// 월 마감 예상 계약 (세일즈 포캐스트 — 제품별, 월 단위, 담당자 입력)
export interface MonthlyForecast {
  id: string; // `${month}:${product}`
  month: string; // YYYY-MM
  product: Product;
  expectedDeals: number;
}

// 월별 매출·결제 내역 (제품별 — 실제 결제 원장. 리드/계약 데이터와 별도로 관리)
export interface MonthlyRevenue {
  id: string; // `${month}:${product}`
  month: string; // YYYY-MM
  product: Product;
  deals: number; // 체결 건수
  contractAmount: number; // 계약금액
  actualPayment: number; // 실 결제
  usageFee: number; // 이용료
  credit: number; // 크레딧
  setupFee: number; // 세팅비
  otherOptions: number; // 기타 옵션비
}

// 월별 광고 성과 (매체별 — 월 단위 최종 집계. 광고비·CAC·월간 광고 성과 표의 원천)
export interface MonthlyAdStat {
  id: string; // `${month}:${product}:${source}`
  month: string; // YYYY-MM
  product: Product;
  source: "메타광고" | "네이버광고" | "GPT광고" | "구글광고";
  spend: number;
  impressions: number;
  clicks: number;
  inquiries: number; // 광고 기여 실문의/리드
  note?: string; // 비고 (예: 오가닉 가능·미측정)
}

// 손익 — 조직별 마진 행 (구독중 조직)
export interface PnlOrgRow {
  name: string;
  plan?: string; // 플랜·결제수단
  cost: number; // 원가
  billed: number; // 청구액(VAT 포함)
  supply: number; // 공급가
  margin: number; // 마진
  marginRate: number | null; // 마진율(%) — 공급가 0이면 null(—)
}

// 월별 손익·원가 (제품별 — 개발팀 소유. 매출·원가·마진 + 상세)
export interface MonthlyPnl {
  id: string; // `${month}:${product}`
  month: string; // YYYY-MM
  product: Product;
  revenueSupply: number; // 매출 공급가(VAT 제외)
  revenueBilled: number; // 청구액(VAT 포함)
  totalCost: number; // 총원가
  tokenCost: number; // Anthropic 토큰 원가
  awsCost: number; // AWS 인프라
  gcpCost: number; // GCP 인프라
  unbilledCost: number; // 미청구 원가(내부·테스트 등)
  subscribedMarginRate?: number; // 구독중 조직 마진율 (%)
  // 상세 (선택)
  orgCount?: number; // 전체 조직 수
  requestCount?: number; // 요청 건수
  tokenLabel?: string; // 토큰 수 표기 (예: "5.57억")
  categoryCost?: { subscribed: number; internal: number; test: number; other: number }; // 토큰 원가 분류
  orgs?: PnlOrgRow[]; // 구독중 조직별 마진
  note?: string;
}

// 링고 개발팀 월간 리뷰 (광고 운영 + 서버비·트래픽 — 개발팀 소유)
export interface DevReview {
  id: string; // `${month}:링고`
  month: string; // YYYY-MM
  product: Product;
  // 광고 운영
  adDailyTotal?: number; // 3매체 하루 실집행 합계
  adChannels?: { name: string; daily: number; status?: string }[]; // 매체별 일 집행
  adDirection?: string; // 세팅 방향 요약
  adTopCreatives?: { label: string; metric: string }[]; // 인기 소재
  adTargetCpa?: string; // 실측 문의당 비용
  adDiscussion?: string; // 논의 사항
  // 서버비·트래픽
  serverCost?: number; // 실질 서버비
  serverCostMoM?: number; // 전월 대비 %
  views?: number; // 조회수
  viewsMoM?: number; // 전월 대비 %
  costPer1000?: number; // 1,000뷰당 비용
  revenueVsCostRate?: number; // 매출 대비 서버·AI 비용 %
  infraNote?: string;
}

// 월별 목표 (제품별 — 실적 대비 달성률 계산용. 담당자 입력)
export interface MonthlyTarget {
  id: string; // `${month}:${product}`
  month: string; // YYYY-MM
  product: Product;
  revenueTarget: number; // 실결제 목표
  mrrTarget: number; // 신규 MRR 목표
  dealTarget: number; // 계약 건수 목표
}

// 주간 경쟁사 문의 현황 (경쟁사에 들어온 문의 수 — 시장 규모 벤치마크, 링고용)
export interface WeeklyCompetitorStat {
  id: string; // `${weekStart}:${competitor}`
  weekStart: string; // 해당 주 수요일 (YYYY-MM-DD)
  competitor: string; // 엔디소프트, 다다미디어 등
  inquiries: number; // 해당 주 문의 수
  note?: string;
}

// 영업 기회 · 타겟 아이디어 (시장 신호 → 실행할 영업 아이디어 백로그)
export type InsightStatus = "발굴" | "진행중" | "완료" | "보류";
export interface SalesInsight {
  id: string;
  date: string; // 발견일 YYYY-MM-DD
  product: ProductScope; // 링고/뉴로/공통
  title: string; // 무엇을 발견했나
  action: string; // 무엇을 할까
  status: InsightStatus;
}

// localStorage에 통째로 저장하는 앱 데이터 묶음
export interface AppData {
  leads: Lead[];
  funnels: ChannelFunnel[];
  threadPosts: ThreadPost[];
  reportComments: ReportComment[];
  weeklyActivities: WeeklyActivity[];
  weeklyAdStats: WeeklyAdStat[];
  weeklyNotes: WeeklyNote[];
  salesInsights: SalesInsight[];
  weeklyCompetitorStats: WeeklyCompetitorStat[];
  monthlyForecasts: MonthlyForecast[];
  monthlyRevenues: MonthlyRevenue[];
  monthlyTargets: MonthlyTarget[];
  monthlyAdStats: MonthlyAdStat[];
  monthlyPnls: MonthlyPnl[];
  devReviews: DevReview[];
  lastUpdated?: string; // 마지막 데이터 갱신 시각 (ISO) — 보고 화면 "최종 업데이트"용
}
