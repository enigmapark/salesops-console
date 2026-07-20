// 주 단위 계산 유틸 — 수요일 시작(수~화 7일).
// 매주 수요일 대표 보고 주기에 맞춰, 수요일 아침 미팅에서 직전 화요일까지가 완결된 한 주가 된다.
export interface WeekRange {
  start: string; // YYYY-MM-DD (수요일)
  end: string; // YYYY-MM-DD (화요일)
  label: string; // 예: 07/15 ~ 07/21
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function weekOf(dateStr: string): WeekRange {
  const d = new Date(`${dateStr}T00:00:00`);
  const dayFromWed = (d.getDay() + 4) % 7; // 수=0 … 화=6
  const wed = new Date(d);
  wed.setDate(d.getDate() - dayFromWed);
  const tue = new Date(wed);
  tue.setDate(wed.getDate() + 6);
  const start = toIso(wed);
  const end = toIso(tue);
  return {
    start,
    end,
    label: `${start.slice(5).replace("-", "/")} ~ ${end.slice(5).replace("-", "/")}`,
  };
}

export function prevWeekOf(w: WeekRange): WeekRange {
  const mon = new Date(`${w.start}T00:00:00`);
  mon.setDate(mon.getDate() - 7);
  return weekOf(toIso(mon));
}

export function inWeek(dateStr: string | undefined, w: WeekRange): boolean {
  if (!dateStr) return false;
  return dateStr >= w.start && dateStr <= w.end;
}

// 데이터가 존재하는 주 목록 (오늘이 속한 주 포함, 최신 먼저)
export function listWeeks(dates: string[], today: string): WeekRange[] {
  const map = new Map<string, WeekRange>();
  for (const d of [...dates, today]) {
    const w = weekOf(d);
    map.set(w.start, w);
  }
  return [...map.values()].sort((a, b) => b.start.localeCompare(a.start));
}
