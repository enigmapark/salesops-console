// 주(월요일~일요일) 단위 계산 유틸
export interface WeekRange {
  start: string; // YYYY-MM-DD (월요일)
  end: string; // YYYY-MM-DD (일요일)
  label: string; // 예: 07/13 ~ 07/19
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function weekOf(dateStr: string): WeekRange {
  const d = new Date(`${dateStr}T00:00:00`);
  const dayFromMon = (d.getDay() + 6) % 7; // 월=0 … 일=6
  const mon = new Date(d);
  mon.setDate(d.getDate() - dayFromMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const start = toIso(mon);
  const end = toIso(sun);
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
