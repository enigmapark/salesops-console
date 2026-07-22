import { createClient } from "@supabase/supabase-js";

// 브라우저에서 직접 접근(anon 키). 실제 보호는 로그인(Auth) + RLS 정책이 담당한다.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// 앱 데이터는 app_state 테이블의 단일 행(id='main')에 JSON으로 통째 저장한다.
export const APP_STATE_ID = "main";
