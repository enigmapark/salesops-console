import { seedData } from "../data/seed";
import type { AppData } from "./types";

// localStorage repository — 컴포넌트는 이 모듈을 통해서만 저장소에 접근한다.
// 스키마가 바뀌면 키 버전을 올려서(v1 → v2) 예전 데이터와 충돌을 피한다.
const STORAGE_KEY = "salesops-console:v1";

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
    if (!raw) {
      // 첫 방문: seed를 저장하고 시작한다.
      const seed = freshSeed();
      saveAppData(seed);
      return seed;
    }
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      leads: parsed.leads ?? [],
      funnels: parsed.funnels ?? [],
      threadPosts: parsed.threadPosts ?? [],
      reportComments: parsed.reportComments ?? [],
    };
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
