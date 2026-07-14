# SalesOps Console — 빌드 지침 (PRD v2)

> 사용법: 이 파일을 프로젝트 루트에 `PRD.md`로 저장한 뒤, 13장의 프롬프트를 순서대로 Claude Code에 붙여넣는다.
> 목표는 "영업 프로세스를 직접 설계하고 작동하는 웹앱으로 구현한" 포트폴리오용 제품이다.

## 1. 제품 개요

- **제품명**: SalesOps Console — SaaS GTM·SalesOps 대시보드
- **한 줄 정의**: 팡고링고(인터넷신문 CMS)·팡고뉴로(AI 광고 SaaS) 세일즈 담당자가 리드 채점, 채널별 획득 퍼널, 월간 현황 보고, 스레드 운영까지 한곳에서 관리하는 웹앱.
- **배경(문제)**: 리드 우선순위·채널 효율·월간 보고를 스프레드시트로 관리하면 자동화가 없고 재사용이 어렵다. 규칙 기반 웹앱으로 만들어 반복 가능한 세일즈 운영 도구로 전환한다.
- **타깃 사용자**: SaaS 세일즈 / RevOps 담당자 (1인~소규모 팀).
- **용도**: 포트폴리오·이직 제출용. 실제 고객 데이터는 더미로 대체.

## 2. 화면(모듈) 구성

| 경로 | 모듈 | 설명 |
|---|---|---|
| /dashboard | 대시보드 | 리드·채널·스레드 요약 KPI |
| /leads | 리드 | 스코어링·등급·이탈사유·윈백 관리 |
| /channels | 채널 | 채널별 획득 퍼널·CPL·CAC 비교 |
| /report | 월간 보고 | 링고·뉴로 현황 자동 집계 + WHY-HOW-WHAT 코멘트 |
| /threads | 스레드 운영 | 게시글 로그·노출·반응·유입 리드 |

## 3. 기술 스택 (권장)

- Next.js (App Router) + TypeScript + Tailwind CSS
- UI: shadcn/ui · 차트: Recharts
- 데이터: seed JSON + localStorage 영속화 (MVP), 이후 Supabase 확장
- 배포: Vercel

## 4. 데이터 모델

### 4.1 Lead

```ts
type AcquisitionSource =
  | "메타광고" | "네이버광고" | "콜드메일" | "커뮤니티"
  | "카카오톡방" | "마케터채널" | "정부지원사업" | "레퍼럴" | "스레드" | "기타";

type LostReason =
  | "가격부담" | "도입시기조정" | "내부승인지연" | "기존업체유지"
  | "경쟁사선택" | "필요기능부족" | "사업보류" | "연락두절" | "미확인" | "기타";

interface Lead {
  id: string;
  name: string;
  source: AcquisitionSource;
  product: "링고" | "뉴로";
  type: "신규창간" | "이관" | "기능문의" | "가격문의";
  status: "신규" | "상담중" | "견적" | "계약" | "보류" | "이탈";
  // 스코어링 입력
  hasQuote: boolean;        // 가격·견적 문의 +3
  hadMeeting: boolean;      // 미팅·데모 +3
  mentionedDate: boolean;   // 도입 예정일 언급 +2
  talkedDM: boolean;        // 의사결정자 통화 +2
  stale3m: boolean;         // 3개월+ 미응답 -1
  businessStopped: boolean; // 사업 중단 -3
  // 관리 필드
  competitor?: string;
  expectedAmount: number;   // 원
  firstInquiry: string;     // YYYY-MM-DD
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
```

### 4.2 ChannelFunnel (채널별 획득 퍼널)

```ts
interface ChannelFunnel {
  id: string;
  period: string;      // 예: 2026-07
  source: AcquisitionSource;
  activities: number;  // 발송·게시 등 활동 수
  leads: number;
  contactable: number;
  mql: number;
  sql: number;
  quotes: number;
  deals: number;
  spend: number;       // 원, 무료 채널은 0
}
```

### 4.3 ThreadPost (스레드 게시글)

```ts
interface ThreadPost {
  id: string;
  date: string;            // YYYY-MM-DD
  topic: "신문사" | "SEO" | "AI" | "마케팅" | "기타";
  product: "링고" | "뉴로" | "공통";
  summary: string;         // 게시 내용 요약
  impressions: number;     // 노출
  likes: number;
  comments: number;
  reposts: number;
  profileClicks: number;   // 프로필/링크 클릭
  leadsGenerated: number;  // 스레드로 유입된 리드 수
}
```

### 4.4 MonthlyReport 코멘트 (자동 집계 + 수기 코멘트)

```ts
interface ReportComment {
  month: string;           // YYYY-MM
  why: string;             // 이번 달 상황·배경
  how: string;             // 어떻게 대응했나
  what: string;            // 결과·다음 달 계획
  lingoNote?: string;
  neuroNote?: string;
  threadNote?: string;
}
```

지표(리드·계약·전환율 등)는 Lead·ChannelFunnel·ThreadPost에서 자동 집계하고, 서술은 ReportComment에 저장한다.

## 5. 비즈니스 로직 (정확히 이대로)

### 5.1 리드 점수

```
score = (hasQuote?3:0) + (hadMeeting?3:0) + (mentionedDate?2:0)
      + (talkedDM?2:0) - (stale3m?1:0) - (businessStopped?3:0)
```

### 5.2 리드 등급 — 강제 규칙 우선

```ts
function calcGrade(lead): "1등급"|"2등급"|"3등급"|"후순위"|"계약완료" {
  if (lead.status === "계약") return "계약완료";
  if (lead.businessStopped || lead.status === "이탈") return "후순위";
  const s = calcScore(lead);
  if (s >= 8) return "1등급";
  if (s >= 5) return "2등급";
  if (s >= 2) return "3등급";
  return "후순위";
}
```

### 5.3 연락 요망

```
needsContact = nextContact <= getToday() && status ∉ {계약, 이탈}
```

### 5.4 채널·퍼널 지표 (분모 0 방어)

- 유효율(MQL) = mql/leads · 상담전환(SQL) = sql/mql · 계약전환 = deals/leads
- CPL = spend/leads · CAC = spend/deals · 전체 전환율 = deals/leads

### 5.5 스레드 지표 (분모 0 방어)

- 반응률 = (likes+comments+reposts)/impressions
- 클릭률 = profileClicks/impressions
- 스레드 유입 = Σ leadsGenerated

### 5.6 월간 보고 자동 집계 (선택한 월 기준)

- 링고: 해당 월 신규 리드 수(product=링고), 계약 수(status=계약), 전환율=계약/리드
- 뉴로: 동일 방식(product=뉴로)
- 채널: 해당 월 ChannelFunnel 합계 및 채널별 계약전환율
- 스레드: 해당 월 게시 수·총 노출·평균 반응률·유입 리드
- 재계약(있으면): 만기 임박 리드/고객 (확장 모듈)

## 6. 화면 명세

### 6.1 /dashboard
KPI 카드: 전체 리드, 1·2등급(활성), 연락 요망, 전체 계약 전환율, 최고 무료채널, 이번 달 스레드 유입. + 등급 분포 표 + 채널 요약 표.

### 6.2 /leads
점수 내림차순 테이블(등급 배지·연락요망 배지·이탈사유 추정/확인 구분·윈백일). 필터: 제품·등급·채널. 추가/편집/삭제 모달. 체크박스 입력 시 점수·등급 실시간 계산.

### 6.3 /channels
채널별 퍼널 테이블(계약전환율 내림차순), CPL·CAC, 무료채널 강조. 채널 추가/편집/삭제 모달.

### 6.4 /report
월 선택 드롭다운 → 링고·뉴로·채널·스레드 지표 자동 표시. WHY-HOW-WHAT 및 제품별 코멘트 입력. "복사용 텍스트 생성" 버튼(상무님 슬랙 붙여넣기용) + 인쇄.

### 6.5 /threads
게시글 로그 테이블(추가/편집), 월별 집계 카드(게시 수·총 노출·평균 반응률·유입 리드), 토픽별 성과 비교. 스레드는 채널 퍼널의 한 소스로도 연결.

## 7. 개발 단계 (Phase)

**1차 MVP (반드시 완주):**
- 리드 등록·편집·삭제, 점수·등급 자동(강제규칙 포함)
- 연락요망·이탈사유·윈백
- 채널별 퍼널(추가·편집) + CPL·CAC
- seed 데이터 + localStorage + 초기화 버튼
- Vercel 배포
- 핵심 로직 단위 테스트

**2차**: /report 월간 보고(자동 집계 + WHY-HOW-WHAT + 복사용 텍스트)
**3차**: /threads 스레드 운영 로그·집계, 대시보드 연동
**4차(README에 계획으로만)**: 재계약 헬스스코어, 주간 성과, 영업 실험 로그, Supabase 영속화·로그인

## 8. 비기능 요건

- 반응형(모바일/노트북). 색상만으로 등급 구분 금지(라벨 병기).
- 모든 실데이터는 더미(실명·계약금액 금지).
- 날짜는 YYYY-MM-DD ISO 문자열. 오늘 의존 계산은 getToday()로 분리.
- localStorage 접근은 별도 hook/repository로 분리, seed 초기화 버튼 제공.
- 로직은 순수 함수(lib/scoring.ts, lib/report.ts)로 분리해 테스트 가능하게.

## 9. 더미 데이터 (스토리형)

- 리드 A: 커뮤니티 유입 · 견적·미팅·의사결정자 통화 → 1등급 · 오늘 연락 필요
- 리드 B: 메타광고 · 가격문의 · 3개월+ 미응답 → 3등급
- 리드 C: 정부지원사업 · 도입예정일 언급 · 내부승인 대기 → 2등급
- 리드 D: 계약 의사 후 계약서 발송 → 연락두절 · 이탈사유 미확인 · 윈백일 등록
- 채널: 메타·네이버(유료) vs 콜드메일·커뮤니티·카카오톡방·정부지원사업·레퍼럴·스레드(무료) 성과 비교
- 스레드: 신문사·SEO 토픽 게시글 3~4건, 노출·반응·유입 리드 포함

## 10. 포트폴리오 데모 흐름

1. 커뮤니티 유입 리드 등록 → 2. 미팅·견적·의사결정자 체크 → 3. 1등급 자동 상승 → 4. 연락일 경과로 연락요망 → 5. 계약 중 연락두절 발생 → 6. 이탈사유 '미확인'·윈백 등록 → 7. 채널 대시보드에서 커뮤니티·스레드의 계약 전환율 확인 → 8. 월간 보고에서 링고·뉴로·스레드 지표 집계 후 상무님용 텍스트 생성.

한 줄 요약: "영업 프로세스를 정의하고, 영업 판단 기준을 작동하는 제품으로 구현했다."

## 11. README 구성 (제출용)

데모 GIF·라이브 URL / 문제 정의 / 데이터 모델·스코어링 로직 / 기술 스택 선택 이유 / 배운 점·다음 개선. 스코어링 가중치에는 "실제 영업 경험 기반 규칙이며 전환 데이터 확보 시 통계 보정 예정"이라고 명시.

## 12. 저장소 구조 (권장)

```
/app
  /dashboard /leads /channels /report /threads
/components   (테이블·모달·카드·차트)
/lib
  scoring.ts   (점수·등급·연락요망)
  channel.ts   (퍼널·CPL·CAC)
  report.ts    (월간 집계)
  threads.ts   (스레드 집계)
  storage.ts   (localStorage repository)
  today.ts     (getToday)
/data seed.ts
/tests
```
