"use client";

import { useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ─────────────────────────────────────────────────────────────
// 예시 데이터 — 와이프 회사 특수지 판매 명세(2024-01~2026-08)에서 집계.
// 실제 운영 데이터가 아니라, 다른 업종(B2B 특수지 유통)의 월간리뷰 예시.
// ─────────────────────────────────────────────────────────────
type M = { month: string; sales: number; total: number; qty: number; tx: number; custCount: number };

const SERIES: M[] = [
  { month: "2025-01", sales: 118246427, total: 130071077, qty: 175313, tx: 228, custCount: 18 },
  { month: "2025-02", sales: 144138080, total: 158551895, qty: 207729, tx: 289, custCount: 18 },
  { month: "2025-03", sales: 194786509, total: 214265167, qty: 242404, tx: 348, custCount: 28 },
  { month: "2025-04", sales: 162186464, total: 178405116, qty: 249668, tx: 320, custCount: 21 },
  { month: "2025-05", sales: 135992604, total: 149591869, qty: 190077, tx: 291, custCount: 19 },
  { month: "2025-06", sales: 111861014, total: 123047123, qty: 186053, tx: 257, custCount: 20 },
  { month: "2025-07", sales: 152187508, total: 167406265, qty: 181051, tx: 353, custCount: 21 },
  { month: "2025-08", sales: 156290166, total: 171919198, qty: 191782, tx: 336, custCount: 25 },
  { month: "2025-09", sales: 174602594, total: 192062860, qty: 249544, tx: 306, custCount: 23 },
  { month: "2025-10", sales: 130308102, total: 143338918, qty: 176650, tx: 286, custCount: 27 },
  { month: "2025-11", sales: 184618250, total: 203080082, qty: 268397, tx: 376, custCount: 32 },
  { month: "2025-12", sales: 171309846, total: 188440840, qty: 262506, tx: 301, custCount: 26 },
  { month: "2026-01", sales: 150119937, total: 165131936, qty: 234974, tx: 296, custCount: 23 },
  { month: "2026-02", sales: 120881407, total: 132969555, qty: 170436, tx: 242, custCount: 25 },
  { month: "2026-03", sales: 145650335, total: 160215376, qty: 230155, tx: 322, custCount: 30 },
  { month: "2026-04", sales: 172596088, total: 189855704, qty: 253160, tx: 319, custCount: 28 },
  { month: "2026-05", sales: 106817430, total: 117499177, qty: 157553, tx: 245, custCount: 22 },
  { month: "2026-06", sales: 122275223, total: 134502749, qty: 178629, tx: 306, custCount: 24 },
  { month: "2026-07", sales: 135830361, total: 149413408, qty: 196150, tx: 301, custCount: 28 },
];

const TOP_CUSTOMERS = [
  { name: "(주)성원애드피아", sales: 43383755 },
  { name: "(주)베러웨이시스템즈", sales: 21665400 },
  { name: "영은페이퍼(주)", sales: 19825284 },
  { name: "(주)디티피아", sales: 15168250 },
  { name: "(주)드림넥스트", sales: 8095729 },
  { name: "범아 주식회사", sales: 5233000 },
  { name: "효성TPS(주)", sales: 4896000 },
  { name: "(유)보문특수칼라", sales: 3217155 },
];

const TOP_PRODUCTS = [
  { name: "디쎈", sales: 26789400 },
  { name: "띤또레또", sales: 17912330 },
  { name: "칼라플랜", sales: 10173649 },
  { name: "뉴 에코블랙", sales: 9451225 },
  { name: "올드밀", sales: 6356375 },
  { name: "타이벡", sales: 5862500 },
  { name: "큐리어스 메탈릭", sales: 5492540 },
  { name: "아르쉐 익스프레션", sales: 5296265 },
];

const REVIEW_MONTH = "2026-07";
const AVG_DISCOUNT = 12.8;

// 포맷 헬퍼
const eok = (v: number) => `${(v / 1e8).toFixed(2)}억`;
const won = (v: number) => `${v.toLocaleString("ko-KR")}원`;
const paek = (v: number) => `${Math.round(v / 1e6)}`; // 백만 단위(차트)
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function delta(cur: number, base: number) {
  const d = (cur - base) / base;
  const up = d >= 0;
  return {
    text: `${up ? "▲" : "▼"} ${Math.abs(d * 100).toFixed(1)}%`,
    cls: up ? "text-emerald-600" : "text-rose-500",
  };
}

function Kpi({ label, value, sub, subCls }: { label: string; value: string; sub?: string; subCls?: string }) {
  return (
    <div className="rounded-lg border border-teal-100 bg-teal-50/40 p-3">
      <p className="text-xs font-medium text-teal-700">{label}</p>
      <p className="mt-1 whitespace-nowrap text-lg font-bold tracking-tight text-zinc-900">{value}</p>
      {sub && <p className={`mt-0.5 text-[11px] ${subCls ?? "text-zinc-400"}`}>{sub}</p>}
    </div>
  );
}

export default function PaperDemoPage() {
  const [range, setRange] = useState<12 | 19>(12);
  const cur = SERIES[SERIES.length - 1];
  const prev = SERIES[SERIES.length - 2];
  const yoy = SERIES.find((s) => s.month === "2025-07")!;
  const monthTotal = cur.sales;
  const top1Share = TOP_CUSTOMERS[0].sales / monthTotal;
  const top4Share =
    TOP_CUSTOMERS.slice(0, 4).reduce((s, c) => s + c.sales, 0) / monthTotal;
  const avgTx = cur.sales / cur.tx;
  const chartData = SERIES.slice(-range).map((s) => ({
    month: s.month.slice(2), // YY-MM
    매출: s.sales,
    거래처: s.custCount,
  }));
  const prodMax = TOP_PRODUCTS[0].sales;

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      {/* 헤더 */}
      <div className="rounded-xl border-2 border-teal-600 bg-gradient-to-br from-teal-50 to-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">
              월간 판매 리뷰 · 예시
            </p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-zinc-900">
              특수지 유통 · {REVIEW_MONTH} 월간 리뷰
            </h1>
          </div>
          <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white">
            예시 데이터 (다른 업종)
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-zinc-700">
          <b>7월 매출 {eok(cur.sales)}</b>(부가세 제외)으로 전월 대비{" "}
          <b className="text-emerald-600">+{(((cur.sales - prev.sales) / prev.sales) * 100).toFixed(1)}%</b>{" "}
          반등했으나, 전년 동월({eok(yoy.sales)}) 대비로는{" "}
          <b className="text-rose-500">−{(((yoy.sales - cur.sales) / yoy.sales) * 100).toFixed(1)}%</b>{" "}
          낮은 수준. 상위 1개 거래처가 매출의 <b>{pct(top1Share)}</b>, 상위 4곳이{" "}
          <b>{pct(top4Share)}</b>를 차지해 <b>거래처 집중도 관리</b>가 핵심 과제.
        </p>
      </div>

      {/* 핵심 지표 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold">
          핵심 지표 <span className="text-xs font-normal text-zinc-400">{REVIEW_MONTH} · 부가세 제외</span>
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi
            label="매출 (부가세 제외)"
            value={eok(cur.sales)}
            sub={`전월 ${delta(cur.sales, prev.sales).text}`}
            subCls={delta(cur.sales, prev.sales).cls}
          />
          <Kpi
            label="매출 (부가세 포함)"
            value={eok(cur.total)}
            sub={`부가세 ${eok(cur.total - cur.sales)}`}
          />
          <Kpi label="거래 건수" value={`${cur.tx.toLocaleString()}건`} sub={`거래처 ${cur.custCount}곳`} />
          <Kpi label="평균 거래액" value={won(Math.round(avgTx))} sub="매출 ÷ 거래 건수" />
          <Kpi
            label="평균 할인율"
            value={`${AVG_DISCOUNT}%`}
            sub="정가 대비 · 마진 관리 지표"
          />
        </div>
        <p className="mt-2 text-[11px] text-zinc-400">
          전년 동월(2025-07) {eok(yoy.sales)} 대비 {delta(cur.sales, yoy.sales).text} · 수량{" "}
          {cur.qty.toLocaleString()}
        </p>
      </section>

      {/* 매출 추세 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">
            매출 추세 <span className="text-xs font-normal text-zinc-400">월별 · 백만원</span>
          </h2>
          <div className="flex gap-1 text-xs">
            {([12, 19] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-md px-2 py-1 font-medium ${
                  range === r ? "bg-teal-600 text-white" : "text-zinc-500 hover:bg-zinc-100"
                }`}
              >
                최근 {r}개월
              </button>
            ))}
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => paek(Number(v))}
                width={40}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                width={30}
                domain={[0, "dataMax + 10"]}
              />
              <Tooltip
                formatter={(value, name) =>
                  name === "매출" ? [won(Number(value)), "매출"] : [`${value}곳`, "거래처"]
                }
                labelFormatter={(l) => `20${l}`}
              />
              <Bar yAxisId="left" dataKey="매출" fill="#0d9488" radius={[3, 3, 0, 0]} maxBarSize={34} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="거래처"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[11px] text-zinc-400">
          막대 = 월 매출(백만원) · 선 = 거래처 수 · 계절성이 뚜렷(연말·봄 강세, 초여름 비수기)
        </p>
      </section>

      {/* 거래처 집중도 리스크 */}
      <section className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-4">
        <h2 className="mb-1 text-sm font-bold text-amber-900">⚠ 거래처 집중도 리스크</h2>
        <p className="mb-3 text-[13px] leading-relaxed text-amber-800">
          상위 1곳(성원애드피아)이 <b>{pct(top1Share)}</b>, 상위 4곳이 <b>{pct(top4Share)}</b>. 특정
          거래처 이탈 시 매출 타격이 크므로, 중위 거래처 육성·신규 발굴로 분산이 필요.
        </p>
        <div className="flex h-6 w-full overflow-hidden rounded-md border border-amber-200">
          {TOP_CUSTOMERS.slice(0, 6).map((c, i) => {
            const colors = ["#0d9488", "#0ea5e9", "#6366f1", "#f59e0b", "#a3a3a3", "#d4d4d4"];
            return (
              <div
                key={c.name}
                style={{ width: `${(c.sales / monthTotal) * 100}%`, background: colors[i] }}
                title={`${c.name} ${pct(c.sales / monthTotal)}`}
              />
            );
          })}
          <div style={{ flex: 1, background: "#ececec" }} title="기타 거래처" />
        </div>
      </section>

      {/* 주요 거래처 + 주요 품목 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold">
            주요 거래처 <span className="text-xs font-normal text-zinc-400">{REVIEW_MONTH} · 상위 8</span>
          </h2>
          <div className="space-y-2">
            {TOP_CUSTOMERS.map((c, i) => (
              <div key={c.name}>
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="font-medium text-zinc-700">
                    <span className="mr-1.5 text-zinc-400">{i + 1}</span>
                    {c.name}
                  </span>
                  <span className="tabular-nums text-zinc-600">
                    {won(c.sales)} <span className="text-zinc-400">· {pct(c.sales / monthTotal)}</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{ width: `${(c.sales / TOP_CUSTOMERS[0].sales) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold">
            주요 품목군 <span className="text-xs font-normal text-zinc-400">{REVIEW_MONTH} · 상위 8</span>
          </h2>
          <div className="space-y-2">
            {TOP_PRODUCTS.map((p, i) => (
              <div key={p.name}>
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="font-medium text-zinc-700">
                    <span className="mr-1.5 text-zinc-400">{i + 1}</span>
                    {p.name}
                  </span>
                  <span className="tabular-nums text-zinc-600">{won(p.sales)}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-indigo-400"
                    style={{ width: `${(p.sales / prodMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 인사이트 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold">이번 달 인사이트 · 액션</h2>
        <div className="space-y-2.5 text-sm leading-relaxed text-zinc-700">
          <div className="flex gap-3">
            <span className="mt-0.5 h-fit shrink-0 rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
              성과
            </span>
            <p>
              전월 비수기(6월 {eok(prev.sales)})에서 <b>7월 {eok(cur.sales)}로 +11% 반등</b>. 거래처도
              24→28곳으로 확대. 디쎈·띤또레또 등 주력 품목이 매출을 견인.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="mt-0.5 h-fit shrink-0 rounded-md bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">
              리스크
            </span>
            <p>
              전년 동월 대비 <b>−11%</b>로 회복은 미완. 상위 4개 거래처 의존도 <b>{pct(top4Share)}</b>가
              구조적 리스크 — 성원애드피아 한 곳에 {pct(top1Share)}가 쏠려 있음.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="mt-0.5 h-fit shrink-0 rounded-md bg-blue-500 px-2 py-0.5 text-[11px] font-bold text-white">
              액션
            </span>
            <p>
              ① 중위 거래처(드림넥스트·범아·효성TPS) 거래액 확대 ② 신규 거래처 발굴로 상위 집중도 완화 ③
              평균 할인율 {AVG_DISCOUNT}% 모니터링 — 물량 확대와 마진 방어의 균형 점검.
            </p>
          </div>
        </div>
        <p className="mt-3 border-t border-zinc-100 pt-2 text-[11px] text-zinc-400">
          ※ 본 페이지는 특수지 판매 명세(거래처·품목·수량·판매금액)에서 집계한 <b>예시</b>입니다. 원가·인건비
          데이터가 없어 매출·거래·집중도 중심으로 구성했으며, 원가가 확보되면 총이익·품목별 마진까지 확장
          가능합니다.
        </p>
      </section>
    </main>
  );
}
