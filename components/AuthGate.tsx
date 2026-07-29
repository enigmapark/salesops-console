"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// 로그인 게이트 — 세션이 없으면 로그인 폼, 있으면 앱을 보여준다.
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return <p className="py-20 text-center text-sm text-zinc-400">불러오는 중…</p>;
  }
  if (!session) return <LoginForm />;
  return <>{children}</>;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError("로그인 실패 — 이메일·비밀번호를 확인하세요.");
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6">
        <h1 className="text-lg font-bold">Lingo · Neuro SalesOps</h1>
        <p className="mt-1 text-xs text-zinc-500">팀 전용 — 로그인 후 이용하세요.</p>
        <div className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">이메일</label>
            <input
              type="email"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && signIn()}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">비밀번호</label>
            <input
              type="password"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && signIn()}
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={signIn}
            disabled={loading}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? "로그인 중…" : "로그인"}
          </button>
        </div>
      </div>
    </div>
  );
}
