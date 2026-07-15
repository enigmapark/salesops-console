"use client";

import { useCallback, useEffect, useState } from "react";
import { loadAppData, resetAppData, saveAppData } from "./storage";
import type { AppData } from "./types";

// localStorage는 브라우저에만 있으므로 마운트 후에 읽는다.
// data가 null인 동안은 화면에서 "불러오는 중"을 보여준다 (hydration 불일치 방지).
export function useAppData() {
  const [data, setData] = useState<AppData | null>(null);

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
