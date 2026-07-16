"use client";

import { useCallback, useEffect, useState } from "react";
import { freshSeed, loadAppData, resetAppData, saveAppData } from "./storage";
import type { AppData } from "./types";

// 처음에는 seed로 즉시 렌더링하고(정적 HTML에도 데이터가 박힘 — 구형 브라우저에서
// 스크립트가 실패해도 내용이 보인다), 마운트 후 localStorage 데이터로 교체한다.
export function useAppData() {
  const [data, setData] = useState<AppData | null>(() => freshSeed());

  useEffect(() => {
    setData(loadAppData());
  }, []);

  const update = useCallback((updater: (d: AppData) => AppData) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveAppData(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setData(resetAppData());
  }, []);

  return { data, update, reset };
}
