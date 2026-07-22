import { APP_STATE_ID, supabase } from "./supabase";
import { freshSeed, isEmptyAppData, normalizeAppData } from "./storage";
import type { AppData } from "./types";

// Supabase repository — 앱 데이터를 app_state 테이블의 단일 행에 JSON으로 저장한다.

export async function loadRemote(): Promise<AppData> {
  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("id", APP_STATE_ID)
    .single();
  if (error) throw error;
  const app = normalizeAppData((data?.data ?? {}) as Partial<AppData>);
  // 완전히 빈 상태면(첫 세팅) seed로 채우고 저장한다.
  if (isEmptyAppData(app)) {
    const seed = freshSeed();
    await saveRemote(seed);
    return seed;
  }
  return app;
}

export async function saveRemote(data: AppData): Promise<void> {
  const { error } = await supabase
    .from("app_state")
    .update({ data, updated_at: new Date().toISOString() })
    .eq("id", APP_STATE_ID);
  if (error) throw error;
}

// 다른 기기에서의 변경을 실시간으로 받는다.
export function subscribeRemote(onChange: (d: AppData) => void): () => void {
  const channel = supabase
    .channel("app_state_changes")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "app_state", filter: `id=eq.${APP_STATE_ID}` },
      (payload) => {
        const next = (payload.new as { data?: Partial<AppData> })?.data;
        if (next) onChange(normalizeAppData(next));
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
