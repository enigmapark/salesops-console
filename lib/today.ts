// 오늘 날짜(YYYY-MM-DD, 로컬 기준). 오늘에 의존하는 계산은 전부 이 함수를 거친다.
export function getToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
