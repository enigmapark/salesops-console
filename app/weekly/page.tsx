"use client";

import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { contractsInMonth, newMrrInMonth, pipelineValue } from "@/lib/exec";
import { fmtNum, fmtPct, fmtWon } from "@/lib/format";
import { buildInsights } from "@/lib/report";
import { getToday } from "@/lib/today";
import { useAppData } from "@/lib/use-app-data";
import { listWeeks, prevWeekOf, weekOf, type WeekRange } from "@/lib/week";
import {
  activityFor,
  adCpc,
  adCpl,
  adCtr,
  AD_SOURCE_LABEL,
  adStatsFor,
  buildWeeklyCopyText,
  productWeekly,
  threadsWeekly,
} from "@/lib/weekly";
import type {
  AppData,
  MonthlyForecast,
  Product,
  WeeklyActivity,
  WeeklyCompetitorStat,
} from "@/lib/types";

const selectCls =
  "rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";

// 코멘트 한 줄을 [라벨] 본문 형태로 파싱해 보고서처럼 렌더링
function NoteLine({ line }: { line: string }) {
  if (!line.trim()) return <div className="h-2" />;
  const m = line.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (m) {
    const label = m[1];
    const color = label.includes("링고")
      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
      : label.includes("뉴로")
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : label.includes("리스크")
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-zinc-200 bg-zinc-100 text-zinc-600";
    return (
      <div className="flex gap-2">
        <span
          className={`mt-0.5 h-fit whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${color}`}
        >
          {label}
        </span>
        <span className="text-sm leading-relaxed text-zinc-700">{m[2]}</span>
      </div>
    );
  }
  return <p className="text-sm leading-relaxed text-zinc-700">{line}</p>;
}

// 주간 코멘트 — 평소엔 보고서 형태로 읽고, 편집 버튼으로 수정
function WeeklyNoteEditor({
  initial,
  onSave,
}: {
  initial: string;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(initial);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    setText(initial);
  }, [initial]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">이번 주 코멘트</h2>
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setText(initial);
                setEditing(false);
              }}
              className="rounded-md border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-50"
            >
              취소
            </button>
            <button
              onClick={() => {
                onSave(text);
                setEditing(false);
              }}
              className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700"
            >
              저장
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
          >
            편집
          </button>
        )}
      </div>

      {editing ? (
        <textarea
          rows={12}
          autoFocus
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed focus:border-zinc-500 focus:outline-none"
          placeholder="이번 주 숫자에 대한 해석과 다음 액션을 적으세요.&#10;줄 앞에 [링고] [뉴로] [공통·리스크] 를 붙이면 보고서 형태로 정리됩니다.&#10;(복사용 텍스트에도 포함됩니다)"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      ) : text.trim() ? (
        <div className="space-y-2">
          {text.split("\n").map((line, i) => (
            <NoteLine key={i} line={line} />
          ))}
        </div>
      ) : (
        <p className="py-3 text-center text-sm text-zinc-400">
          아직 코멘트가 없습니다 — &ldquo;편집&rdquo;을 눌러 작성하세요.
        </p>
      )}
    </section>
  );
}

// 세일즈 활동 직접 입력 (콜드메일 발송·통화·미팅)
function ActivityEditor({
  product,
  week,
  existing,
  onSave,
}: {
  product: Product;
  week: WeekRange;
  existing?: WeeklyActivity;
  onSave: (a: WeeklyActivity) => void;
}) {
  const [cold, setCold] = useState(existing?.coldEmails ?? 0);
  const [calls, setCalls] = useState(existing?.calls ?? 0);
  const [meetings, setMeetings] = useState(existing?.meetings ?? 0);
  const [note, setNote] = useState(existing?.note ?? "");
  const [saved, setSaved] = useState(false);
  const num = (v: string) => Math.max(0, Number(v) || 0);
  const inputCls =
    "w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none";
  return (
    <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
      <p className="mb-2 text-xs font-semibold text-zinc-500">세일즈 활동 · {week.label} (직접 입력)</p>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-0.5 block text-[11px] text-zinc-500">콜드메일 발송</label>
          <input type="number" min={0} className={inputCls} value={cold} onChange={(e) => setCold(num(e.target.value))} />
        </div>
        <div>
          <label className="mb-0.5 block text-[11px] text-zinc-500">통화</label>
          <input type="number" min={0} className={inputCls} value={calls} onChange={(e) => setCalls(num(e.target.value))} />
        </div>
        <div>
          <label className="mb-0.5 block text-[11px] text-zinc-500">미팅</label>
          <input type="number" min={0} className={inputCls} value={meetings} onChange={(e) => setMeetings(num(e.target.value))} />
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className={inputCls}
          placeholder="메모 (예: 언론사 명단 200곳 발송)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          onClick={() => {
            onSave({
              id: `${week.start}:${product}`,
              weekStart: week.start,
              product,
              coldEmails: cold,
              calls,
              meetings,
              note: note || undefined,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          }}
          className="whitespace-nowrap rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700"
        >
          {saved ? "✓ 저장됨" : "저장"}
        </button>
      </div>
    </div>
  );
}

// 링고 경쟁사 문의 현황 (시장 벤치마크) — 확인 가능한 경쟁사만
const LINGO_COMPETITORS = ["엔디소프트", "다다미디어"];

function CompetitorEditor({
  week,
  stats,
  onSave,
}: {
  week: WeekRange;
  stats: WeeklyCompetitorStat[];
  onSave: (rows: WeeklyCompetitorStat[]) => void;
}) {
  const initial = LINGO_COMPETITORS.map(
    (c) => stats.find((s) => s.competitor === c)?.inquiries ?? 0,
  );
  const [vals, setVals] = useState<number[]>(initial);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setVals(LINGO_COMPETITORS.map((c) => stats.find((s) => s.competitor === c)?.inquiries ?? 0));
  }, [stats]);
  const inputCls =
    "w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none";
  return (
    <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
      <p className="mb-2 text-xs font-semibold text-zinc-500">
        경쟁사 문의 현황 · {week.label}{" "}
        <span className="font-normal text-zinc-400">(문의 수 확인 가능한 곳만)</span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        {LINGO_COMPETITORS.map((c, i) => (
          <div key={c}>
            <label className="mb-0.5 block text-[11px] text-zinc-500">{c}</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={vals[i]}
              onChange={(e) => {
                const next = [...vals];
                next[i] = Math.max(0, Number(e.target.value) || 0);
                setVals(next);
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[11px] text-zinc-400">
          그 외 경쟁사는 CS만 운영해 문의 수 확인 불가
        </p>
        <button
          onClick={() => {
            onSave(
              LINGO_COMPETITORS.map((c, i) => ({
                id: `${week.start}:${c}`,
                weekStart: week.start,
                competitor: c,
                inquiries: vals[i],
              })),
            );
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          }}
          className="whitespace-nowrap rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700"
        >
          {saved ? "✓ 저장됨" : "저장"}
        </button>
      </div>
    </div>
  );
}

// 월 마감 예상 계약 (담당자 입력 + 자동 참고치)
function ForecastInput({
  monthLabel,
  autoRef,
  existing,
  confirmed,
  promising,
  onSave,
}: {
  monthLabel: string;
  autoRef: number;
  existing?: number;
  confirmed: number;
  promising: number;
  onSave: (v: number) => void;
}) {
  const [val, setVal] = useState<number>(existing ?? autoRef);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setVal(existing ?? autoRef);
  }, [existing, autoRef]);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
      <span className="text-xs font-semibold text-zinc-500">{monthLabel} 마감 예상 계약</span>
      <input
        type="number"
        min={0}
        className="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none"
        value={val}
        onChange={(e) => setVal(Math.max(0, Number(e.target.value) || 0))}
      />
      <span className="text-xs text-zinc-500">건</span>
      <span className="text-[11px] text-zinc-400">
        (참고: 확정 {confirmed} + 유망 {promising} = {autoRef})
      </span>
      <button
        onClick={() => {
          onSave(val);
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        }}
        className="ml-auto whitespace-nowrap rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700"
      >
        {saved ? "✓ 저장됨" : "저장"}
      </button>
    </div>
  );
}

export default function WeeklyPage() {
  const { data, update } = useAppData();
  const today = getToday();
  // null이면 "데이터가 있는 최근 주"를 기본으로 보여준다 (사용자가 고르면 그 값 사용)
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [copyText, setCopyText] = useState("");
  const [copied, setCopied] = useState(false);

  const weeks = useMemo(() => {
    if (!data) return [weekOf(today)];
    const dates = [
      ...data.leads.map((l) => l.firstInquiry),
      ...data.leads.flatMap((l) => (l.contractDate ? [l.contractDate] : [])),
      ...data.threadPosts.map((p) => p.date),
    ];
    return listWeeks(dates, today);
  }, [data, today]);

  // 기본 표시 주: 오늘 주에 데이터가 있으면 오늘 주, 없으면 데이터가 있는 가장 최근 주
  // (수요일 아침에 새 주가 막 시작돼 비어 있으면, 방금 끝난 보고 대상 주를 보여준다)
  const defaultWeekStart = useMemo(() => {
    const todayStart = weekOf(today).start;
    if (!data) return todayStart;
    const dataDates = [
      ...data.leads.map((l) => l.firstInquiry),
      ...data.leads.flatMap((l) => (l.contractDate ? [l.contractDate] : [])),
      ...(data.weeklyAdStats ?? []).map((a) => a.weekStart),
      ...(data.weeklyActivities ?? []).map((a) => a.weekStart),
      ...data.threadPosts.map((p) => p.date),
    ].filter(Boolean);
    const hasToday = dataDates.some((dt) => weekOf(dt).start === todayStart);
    if (hasToday) return todayStart;
    const recent = weeks.find((w) => w.start !== todayStart);
    return recent?.start ?? todayStart;
  }, [data, today, weeks]);

  if (!data) return <p className="py-16 text-center text-sm text-zinc-400">불러오는 중…</p>;

  const activeStart = weekStart ?? defaultWeekStart;
  const week: WeekRange = weeks.find((w) => w.start === activeStart) ?? weekOf(today);
  const prevWeek = prevWeekOf(week);
  const insights = buildInsights(data, today.slice(0, 7), today);
  const threads = threadsWeekly(data, week);

  const saveActivity = (a: WeeklyActivity) =>
    update((d: AppData) => ({
      ...d,
      weeklyActivities: [
        ...(d.weeklyActivities ?? []).filter((x) => x.id !== a.id),
        a,
      ],
    }));

  const saveCompetitorStats = (rows: WeeklyCompetitorStat[]) =>
    update((d: AppData) => ({
      ...d,
      weeklyCompetitorStats: [
        ...(d.weeklyCompetitorStats ?? []).filter((x) => x.weekStart !== week.start),
        ...rows,
      ],
    }));

  const forecastMonth = week.start.slice(0, 7);
  const saveForecast = (product: Product, expectedDeals: number) =>
    update((d: AppData) => ({
      ...d,
      monthlyForecasts: [
        ...(d.monthlyForecasts ?? []).filter(
          (f) => !(f.month === forecastMonth && f.product === product),
        ),
        { id: `${forecastMonth}:${product}`, month: forecastMonth, product, expectedDeals } as MonthlyForecast,
      ],
    }));

  const competitorLeads = data.leads.filter((l) => l.competitor);
  const weeklyNote = (data.weeklyNotes ?? []).find((n) => n.weekStart === week.start)?.text ?? "";

  const saveNote = (text: string) =>
    update((d: AppData) => ({
      ...d,
      weeklyNotes: [
        ...(d.weeklyNotes ?? []).filter((n) => n.weekStart !== week.start),
        { weekStart: week.start, text },
      ],
    }));

  const generate = () => {
    setCopyText(buildWeeklyCopyText(data, week, prevWeek, insights));
    setCopied(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
    } catch {
      // 클립보드 권한이 없으면 직접 선택해 복사
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold">주간 현황</h1>
          <p className="text-xs text-zinc-500">
            수요일 보고 주기 (수~화 7일) · 계약은 계약일 기준 · 월 단위는 &ldquo;월간 보고&rdquo; 메뉴
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            className={selectCls}
            value={week.start}
            onChange={(e) => setWeekStart(e.target.value)}
          >
            {weeks.map((w) => (
              <option key={w.start} value={w.start}>
                {w.label}
              </option>
            ))}
          </select>
          <button
            onClick={generate}
            className="whitespace-nowrap rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            복사용 텍스트 생성
          </button>
        </div>
      </div>

      {/* 대표용 한 줄 요약 — 광고비 → 문의 → 계약 흐름을 제품별로 */}
      <section className="rounded-xl bg-zinc-900 p-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          이번 주 한 줄 요약 · {week.label}
        </p>
        {(["링고", "뉴로"] as Product[]).map((p) => {
          const stats = adStatsFor(data, week.start, p);
          const spend = stats.reduce((s, a) => s + a.spend, 0);
          const inq = stats.reduce((s, a) => s + a.inquiries, 0);
          const wk = productWeekly(data.leads, week, p);
          const pLeads = data.leads.filter((l) => l.product === p);
          const month = week.start.slice(0, 7);
          const monthDeals = contractsInMonth(pLeads, month).length;
          const monthMrr = newMrrInMonth(pLeads, month); // 이번 달 누적 MRR
          const cpl = inq > 0 ? spend / inq : null;
          return (
            <p key={p} className="mt-2 text-sm leading-relaxed">
              <span className="mr-1.5 rounded bg-white/15 px-1.5 py-0.5 text-xs font-bold">{p}</span>
              광고비 {fmtWon(spend)} → 문의 {inq}건
              {cpl !== null && <span className="text-zinc-300"> (CPL {fmtWon(cpl)})</span>} · 신규
              리드 {wk.newLeads.length}건 · 계약 {wk.contracts.length}건
              <span className="text-zinc-400"> (월 누적 {monthDeals}건)</span>
              {wk.upsells.length > 0 && (
                <span className="text-zinc-400"> · 업셀 {wk.upsells.length}건</span>
              )}
              <br />
              <span className="text-zinc-300">
                └ 신규 MRR {fmtWon(wk.mrr)} · {parseInt(month.slice(5), 10)}월 누적 MRR{" "}
                <span className="font-semibold text-white">{fmtWon(monthMrr)}</span>
              </span>
            </p>
          );
        })}
        {(() => {
          const all = (data.weeklyAdStats ?? []).filter((a) => a.weekStart === week.start);
          const spend = all.reduce((s, a) => s + a.spend, 0);
          const inq = all.reduce((s, a) => s + a.inquiries, 0);
          const newLeads =
            productWeekly(data.leads, week, "링고").newLeads.length +
            productWeekly(data.leads, week, "뉴로").newLeads.length;
          const deals =
            productWeekly(data.leads, week, "링고").contracts.length +
            productWeekly(data.leads, week, "뉴로").contracts.length;
          return (
            <p className="mt-2.5 border-t border-white/10 pt-2 text-xs text-zinc-400">
              전체 합계 — 광고비 {fmtWon(spend)} · 문의 {inq}건 · 신규 리드 {newLeads}건 · 계약{" "}
              {deals}건
            </p>
          );
        })()}
      </section>

      {/* 주간 코멘트 (대표 보고용 해석·계획) */}
      <WeeklyNoteEditor key={week.start} initial={weeklyNote} onSave={saveNote} />

      {/* 제품별 주간 패널 — 링고/뉴로 각각 */}
      <div className="grid gap-4 xl:grid-cols-2">
        {(["링고", "뉴로"] as Product[]).map((p) => {
          const cur = productWeekly(data.leads, week, p);
          const prev = productWeekly(data.leads, prevWeek, p);
          const pipe = pipelineValue(data.leads.filter((l) => l.product === p));
          const weekMonth = week.start.slice(0, 7);
          const pLeads = data.leads.filter((l) => l.product === p);
          const monthDeals = contractsInMonth(pLeads, weekMonth).length;
          // 유망 파이프라인: 제안·견적/계약 검토 단계이면서 계약 가능성 높음
          const promising = pLeads.filter(
            (l) =>
              (l.status === "제안·견적" || l.status === "계약 검토") &&
              l.dealProbability === "높음",
          ).length;
          const forecastRef = monthDeals + promising;
          const savedForecast = (data.monthlyForecasts ?? []).find(
            (f) => f.month === weekMonth && f.product === p,
          )?.expectedDeals;
          return (
            <section key={p} className="rounded-xl border border-zinc-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold">
                {p} <span className="text-xs font-normal text-zinc-400">{week.label}</span>
              </h2>
              <div
                className={`mb-3 grid grid-cols-2 gap-3 ${p === "뉴로" ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}
              >
                <KpiCard
                  label="신규 리드"
                  value={`${fmtNum(cur.newLeads.length)}건`}
                  sub={`전주 ${prev.newLeads.length}건`}
                />
                <KpiCard
                  label="계약"
                  value={`${fmtNum(cur.contracts.length)}건`}
                  sub={`${parseInt(weekMonth.slice(5), 10)}월 누적 ${monthDeals}건`}
                />
                <KpiCard
                  label="신규 MRR"
                  value={cur.mrr > 0 ? fmtWon(cur.mrr) : "0원"}
                  sub={cur.oneOff > 0 ? `일회성 ${fmtWon(cur.oneOff)} 별도` : "이번 주 계약분"}
                  small
                />
                {/* 진행 파이프라인 — 링고만 표시 (뉴로는 제외) */}
                {p === "링고" && (
                  <KpiCard
                    label="진행 파이프라인"
                    value={pipe.amount > 0 ? fmtWon(pipe.amount) : "–"}
                    sub={`현재 활성 ${pipe.count}건`}
                    small
                  />
                )}
              </div>

              {/* 월 마감 예상 계약 (담당자 입력) */}
              <ForecastInput
                key={`fc-${p}-${weekMonth}`}
                monthLabel={`${parseInt(weekMonth.slice(5), 10)}월`}
                autoRef={forecastRef}
                existing={savedForecast}
                confirmed={monthDeals}
                promising={promising}
                onSave={(v) => saveForecast(p, v)}
              />

              {/* 주간 광고 성과 (매체별) */}
              {(() => {
                const stats = adStatsFor(data, week.start, p);
                if (stats.length === 0) return null;
                return (
                  <div className="mb-3">
                    <p className="mb-1.5 text-xs font-semibold text-zinc-500">
                      주간 광고 성과 ({week.label})
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                            <th className="py-1.5 font-medium">매체</th>
                            <th className="py-1.5 text-right font-medium">소진</th>
                            <th className="py-1.5 text-right font-medium">노출</th>
                            <th className="py-1.5 text-right font-medium">클릭</th>
                            <th className="py-1.5 text-right font-medium">CTR</th>
                            <th className="py-1.5 text-right font-medium">CPC</th>
                            <th className="py-1.5 text-right font-medium">문의</th>
                            <th className="py-1.5 text-right font-medium">CPL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.map((a) => (
                            <tr key={a.id} className="border-b border-zinc-100 last:border-0">
                              <td className="py-1.5 font-medium">{AD_SOURCE_LABEL[a.source]}</td>
                              <td className="py-1.5 text-right font-semibold tabular-nums">
                                {fmtWon(a.spend)}
                              </td>
                              <td className="py-1.5 text-right tabular-nums">{fmtNum(a.impressions)}</td>
                              <td className="py-1.5 text-right tabular-nums">{fmtNum(a.clicks)}</td>
                              <td className="py-1.5 text-right tabular-nums">{fmtPct(adCtr(a), 2)}</td>
                              <td className="py-1.5 text-right tabular-nums">{fmtWon(adCpc(a))}</td>
                              <td className="py-1.5 text-right tabular-nums">{a.inquiries}건</td>
                              <td className="py-1.5 text-right font-semibold tabular-nums">
                                {fmtWon(adCpl(a))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* 이번 주 신규 리드 목록 */}
              <p className="mb-1.5 text-xs font-semibold text-zinc-500">이번 주 신규 리드</p>
              {cur.newLeads.length === 0 ? (
                <p className="mb-3 rounded-lg bg-zinc-50 py-2.5 text-center text-xs text-zinc-400">
                  이번 주 신규 리드 없음
                </p>
              ) : (
                <table className="mb-3 w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                      <th className="py-1.5 font-medium">이름</th>
                      <th className="py-1.5 font-medium">채널</th>
                      <th className="py-1.5 font-medium">단계</th>
                      <th className="py-1.5 text-right font-medium">예상 금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cur.newLeads.map((l) => (
                      <tr key={l.id} className="border-b border-zinc-100 last:border-0">
                        <td className="py-1.5 font-medium">{l.name}</td>
                        <td className="py-1.5 text-zinc-600">{l.source}</td>
                        <td className="py-1.5 text-zinc-600">{l.status}</td>
                        <td className="py-1.5 text-right tabular-nums text-zinc-600">
                          {l.expectedAmount > 0 ? fmtWon(l.expectedAmount) : "–"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 이번 주 신규 계약 목록 */}
              <p className="mb-1.5 text-xs font-semibold text-emerald-700">이번 주 신규 계약</p>
              {cur.contracts.length === 0 ? (
                <p className="rounded-lg bg-zinc-50 py-2.5 text-center text-xs text-zinc-400">
                  이번 주 신규 계약 없음
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {cur.contracts.map((l) => (
                    <li key={l.id} className="flex items-center gap-2">
                      <span className="font-medium">{l.name}</span>
                      <span className="text-xs text-zinc-500">
                        {l.source} · 계약일 {l.contractDate}
                        {l.monthlyFee ? ` · 월 ${fmtWon(l.monthlyFee)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* 기존 고객 부가서비스 업셀 — 신규 계약과 분리 표기 */}
              {cur.upsells.length > 0 && (
                <>
                  <p className="mb-1.5 mt-3 text-xs font-semibold text-zinc-500">
                    부가서비스 업셀 (기존 고객)
                  </p>
                  <ul className="space-y-1 text-sm">
                    {cur.upsells.map((l) => (
                      <li key={l.id} className="flex items-center gap-2">
                        <span className="font-medium">{l.name}</span>
                        <span className="text-xs text-zinc-500">
                          {l.source} · {l.contractDate}
                          {l.monthlyFee ? ` · 월 ${fmtWon(l.monthlyFee)}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <ActivityEditor
                key={`${p}-${week.start}`}
                product={p}
                week={week}
                existing={activityFor(data, week.start, p)}
                onSave={saveActivity}
              />

              {/* 경쟁사 문의 현황 — 링고 패널에만 */}
              {p === "링고" && (
                <CompetitorEditor
                  key={`comp-${week.start}`}
                  week={week}
                  stats={(data.weeklyCompetitorStats ?? []).filter(
                    (s) => s.weekStart === week.start,
                  )}
                  onSave={saveCompetitorStats}
                />
              )}
            </section>
          );
        })}
      </div>

      {/* 무료 채널 게시 주간 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="무료 채널 게시 수" value={fmtNum(threads.postCount)} sub={week.label} />
        <KpiCard label="게시 노출" value={fmtNum(threads.totalImpressions)} />
        <KpiCard label="평균 반응률" value={fmtPct(threads.avgEngagementRate)} />
        <KpiCard label="게시 유입 리드" value={fmtNum(threads.totalLeads)} />
      </div>

      {/* 경쟁사 리드 현황 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">
          경쟁사에서 넘어오는 리드 (이관·경합)
          <span className="ml-1.5 text-xs font-normal text-zinc-400">
            경쟁사 이용 고객을 우리 쪽으로 유치 중인 딜
          </span>
        </h2>
        {competitorLeads.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-400">
            해당 리드 없음 — 리드 수정에서 &ldquo;경쟁사&rdquo; 칸을 채우면 여기에 표시됩니다.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                <th className="py-2 font-medium">제품</th>
                <th className="py-2 font-medium">리드</th>
                <th className="py-2 font-medium">기존 이용 중인 경쟁사</th>
                <th className="py-2 font-medium">단계</th>
                <th className="py-2 font-medium">가능성</th>
              </tr>
            </thead>
            <tbody>
              {competitorLeads.map((l) => (
                <tr key={l.id} className="border-b border-zinc-100 last:border-0">
                  <td className="py-2 text-zinc-600">{l.product}</td>
                  <td className="py-2 font-medium">{l.name}</td>
                  <td className="py-2">{l.competitor}</td>
                  <td className="py-2 text-zinc-600">{l.status}</td>
                  <td className="py-2 text-zinc-600">{l.dealProbability ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 위험요인 & 다음 액션 (현재 시점) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-rose-600">위험요인 (현재)</h2>
          <ul className="space-y-1.5 text-sm text-zinc-700">
            {insights.risks.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-rose-300">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-emerald-700">다음 액션</h2>
          <ul className="space-y-1.5 text-sm text-zinc-700">
            {insights.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-semibold text-emerald-500">{i + 1}.</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* 복사용 텍스트 */}
      {copyText && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">복사용 텍스트 (대표 보고용)</h2>
            <button
              onClick={copyToClipboard}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50"
            >
              {copied ? "✓ 복사됨" : "클립보드에 복사"}
            </button>
          </div>
          <textarea
            readOnly
            rows={Math.min(22, copyText.split("\n").length + 1)}
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs"
            value={copyText}
            onFocus={(e) => e.target.select()}
          />
        </section>
      )}
    </div>
  );
}
