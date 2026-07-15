// 화면 표시용 포맷터 — null(분모 0 = 데이터 없음)은 "–"로 표시한다.

export function fmtPct(v: number | null, digits = 1): string {
  if (v === null) return "–";
  return `${(v * 100).toFixed(digits)}%`;
}

export function fmtWon(v: number | null): string {
  if (v === null) return "–";
  return `${Math.round(v).toLocaleString("ko-KR")}원`;
}

export function fmtNum(v: number): string {
  return v.toLocaleString("ko-KR");
}
