"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadRemote, saveRemote, subscribeRemote } from "./repo";
import { freshSeed } from "./storage";
import type { AppData } from "./types";

// Supabase 기반 데이터 훅.
// - 마운트 시 원격에서 로드 (로그인 세션 필요 — AuthGate가 보장)
// - update: 로컬 즉시 반영 + 원격에 디바운스 저장
// - 다른 기기 변경은 realtime으로 수신
export function useAppData() {
  const [data, setData] = useState<AppData | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<AppData | null>(null);

  useEffect(() => {
    let alive = true;
    loadRemote()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        // 로드 실패 시에도 화면은 뜨도록 seed로 폴백 (저장은 안 함)
        if (alive) setData(freshSeed());
      });
    const unsub = subscribeRemote((remote) => {
      // 원격 변경 수신 — 내가 방금 저장한 것과 겹칠 수 있으나 최신값으로 맞춘다
      setData(remote);
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const flush = useCallback(() => {
    if (pending.current) {
      const toSave = pending.current;
      pending.current = null;
      saveRemote(toSave).catch(() => {
        // 저장 실패는 조용히 무시 (다음 update 때 재시도됨)
      });
    }
  }, []);

  const update = useCallback(
    (updater: (d: AppData) => AppData) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        pending.current = next;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(flush, 400);
        return next;
      });
    },
    [flush],
  );

  const reset = useCallback(() => {
    const seed = freshSeed();
    setData(seed);
    saveRemote(seed).catch(() => {});
  }, []);

  return { data, update, reset };
}
