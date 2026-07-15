import { seedData } from "../data/seed";
import type { AppData, LeadStatus } from "./types";

// localStorage repository — 컴포넌트는 이 모듈을 통해서만 저장소에 접근한다.
// 스키마가 바뀌면 키 버전을 올려서(v1 → v2) 예전 데이터와 충돌을 피한다.
const STORAGE_KEY = "salesops-console:v2";
const LEGACY_KEY_V1 = "salesops-console:v1";

// v1 → v2: 리드 단계 세분화에 따른 옛 상태값 변환
const LEGACY_STATUS_MAP: Record<string, LeadStatus> = {
  상담중: "1차 연락",
  견적: "제안·견적",
};

export function migrateLeadStatus(status: string): LeadStatus {
  return LEGACY_STATUS_MAP[status] ?? (status as LeadStatus);
}

function migrateV1(parsed: Partial<AppData>): AppData {
  return {
    leads: (parsed.leads ?? []).map((l) => ({ ...l, status: migrateLeadStatus(l.status) })),
    funnels: parsed.funnels ?? [],
    threadPosts: parsed.threadPosts ?? [],
    reportComments: parsed.reportComments ?? [],
  };
}

// structuredClone은 구형 브라우저(사내 PC·인앱 브라우저 등)에 없을 수 있어
// JSON 방식으로 폴백한다. 데이터가 전부 직렬화 가능한 값이라 결과는 동일하다.
function deepClone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export function freshSeed(): AppData {
  return deepClone(seedData);
}

export function loadAppData(): AppData {
  if (typeof window === "undefined") return freshSeed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppData>;
      return {
        leads: parsed.leads ?? [],
        funnels: parsed.funnels ?? [],
        threadPosts: parsed.threadPosts ?? [],
        reportComments: parsed.reportComments ?? [],
      };
    }
    // v1 데이터가 있으면 단계 이름을 변환해서 이어받는다 (사용자 입력 유실 방지)
    const legacy = window.localStorage.getItem(LEGACY_KEY_V1);
    if (legacy) {
      const migrated = migrateV1(JSON.parse(legacy) as Partial<AppData>);
      saveAppData(migrated);
      return migrated;
    }
    // 첫 방문: seed를 저장하고 시작한다.
    const seed = freshSeed();
    saveAppData(seed);
    return seed;
  } catch {
    // 깨진 데이터는 seed로 복구
    return freshSeed();
  }
}

export function saveAppData(data: AppData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 저장 실패(프라이빗 모드 등)는 조용히 무시 — 메모리 상태로는 계속 동작한다.
  }
}

export function resetAppData(): AppData {
  const seed = freshSeed();
  saveAppData(seed);
  return seed;
}
