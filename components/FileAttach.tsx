"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const BUCKET = "dev-decks";

// 원본 파일(PPTX 등) 첨부 — Supabase Storage 업로드 + 다운로드 링크
export function FileAttach({
  label,
  fileUrl,
  fileName,
  onChange,
}: {
  label: string;
  fileUrl?: string;
  fileName?: string;
  onChange: (url: string | undefined, name: string | undefined) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      // Storage 키는 ASCII만 허용 — 한글 등은 _로 치환(원본 이름은 sourceFileName으로 별도 표시)
      const safe = file.name.replace(/[^\w.-]/g, "_").replace(/_+/g, "_");
      const path = `${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl, file.name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "업로드 실패";
      setError(`${msg} — Storage '${BUCKET}' 버킷(공개) 설정 확인`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
      <span className="font-semibold text-zinc-500">{label}</span>
      {fileUrl ? (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 font-medium text-indigo-600 hover:bg-indigo-50"
        >
          📎 {fileName ?? "원본 파일"} 열기
        </a>
      ) : (
        <span className="text-zinc-400">첨부 없음</span>
      )}
      <label className="cursor-pointer rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-600 hover:bg-zinc-50 print:hidden">
        {uploading ? "업로드 중…" : fileUrl ? "교체" : "파일 첨부"}
        <input
          type="file"
          className="hidden"
          onChange={handle}
          accept=".pptx,.pdf,.xlsx,.docx,.ppt"
        />
      </label>
      {fileUrl && !uploading && (
        <button
          onClick={() => onChange(undefined, undefined)}
          className="text-zinc-400 hover:text-rose-500 print:hidden"
        >
          삭제
        </button>
      )}
      {error && <span className="text-rose-500">{error}</span>}
    </div>
  );
}
