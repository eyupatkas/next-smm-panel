"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, BarChart2, ArrowUpCircle, ShoppingCart } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type Summary = {
  revenue: number;
  topupRevenue: number;
  directRevenue: number;
  cost: number;
  profit: number;
  margin: number;
  orderCount: number;
};

type ChartPoint = {
  label: string;
  revenue: number;
  cost: number;
  profit: number;
};

type TopService = {
  name: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  orderCount: number;
};

type ProfitData = {
  today: Summary;
  week: Summary;
  month: Summary;
  all: Summary;
  chart: ChartPoint[];
  topServices: TopService[];
  days: number;
};

// ── Formatters ─────────────────────────────────────────────────────────────

function fp(n: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

// ── Profit Trend Chart (SVG) ───────────────────────────────────────────────

function ProfitTrendChart({ data }: { data: ChartPoint[] }) {
  const W = 800;
  const H = 200;
  const PAD_L = 52;
  const PAD_B = 30;
  const chartW = W - PAD_L - 12;
  const chartH = H - PAD_B;
  const n = data.length;

  if (n === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-slate-500">
        Henüz veri yok
      </div>
    );
  }

  const maxRev = Math.max(...data.map((d) => Math.max(d.revenue, d.cost)), 1);
  const minProfit = Math.min(...data.map((d) => d.profit), 0);
  const maxProfit = Math.max(...data.map((d) => d.profit), 0.01);
  const profitRange = maxProfit - minProfit || 1;

  const step = n > 1 ? chartW / (n - 1) : chartW;
  const getX = (i: number) => PAD_L + (n > 1 ? i * step : chartW / 2);
  const getYLeft = (v: number) => chartH - (v / maxRev) * chartH * 0.9;
  const getYProfit = (v: number) =>
    chartH - ((v - minProfit) / profitRange) * chartH * 0.9;

  const revLine = data.map((d, i) => `${getX(i)},${getYLeft(d.revenue)}`).join(" ");
  const costLine = data.map((d, i) => `${getX(i)},${getYLeft(d.cost)}`).join(" ");
  const profitLine = data.map((d, i) => `${getX(i)},${getYProfit(d.profit)}`).join(" ");

  const revArea =
    `${getX(0)},${chartH} ` +
    data.map((d, i) => `${getX(i)},${getYLeft(d.revenue)}`).join(" ") +
    ` ${getX(n - 1)},${chartH}`;

  const xSkip = n <= 8 ? 1 : n <= 16 ? 2 : n <= 20 ? 3 : Math.ceil(n / 8);
  const zeroY = getYProfit(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
      <defs>
        <linearGradient id="profGradRev" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
        <clipPath id="chartClip">
          <rect x={PAD_L} y={0} width={chartW} height={chartH} />
        </clipPath>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={PAD_L} y1={getYLeft(maxRev * t)} x2={W - 12} y2={getYLeft(maxRev * t)} stroke="#1e293b" strokeWidth={1} />
      ))}
      {[0, 0.5, 1].map((t) => (
        <text key={t} x={PAD_L - 6} y={getYLeft(maxRev * t) + 4} textAnchor="end" fontSize="9" fill="#475569">
          {fmt(maxRev * t)}
        </text>
      ))}
      <line x1={PAD_L} y1={zeroY} x2={W - 12} y2={zeroY} stroke="#334155" strokeWidth={1} strokeDasharray="4 3" />
      <polygon points={revArea} fill="url(#profGradRev)" clipPath="url(#chartClip)" />
      <polyline points={revLine} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />
      <polyline points={costLine} fill="none" stroke="#ef4444" strokeWidth={1.5} strokeLinejoin="round" strokeDasharray="5 3" />
      <polyline points={profitLine} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={getX(i)} cy={getYProfit(d.profit)} r={2.5} fill={d.profit >= 0 ? "#10b981" : "#ef4444"} stroke="#0f172a" strokeWidth={1.5} />
      ))}
      {data.map((d, i) => {
        if (i % xSkip !== 0 && i !== n - 1) return null;
        return (
          <text key={i} x={getX(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#475569">
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: "blue" | "red" | "green" | "amber";
  icon: React.ReactNode;
}) {
  const colors = {
    blue:  { border: "border-blue-500/20",  bg: "from-blue-950/30",   text: "text-blue-300"  },
    red:   { border: "border-red-500/20",   bg: "from-red-950/30",    text: "text-red-300"   },
    green: { border: "border-emerald-500/20", bg: "from-emerald-950/30", text: "text-emerald-300" },
    amber: { border: "border-amber-500/20", bg: "from-amber-950/30",  text: "text-amber-300" },
  }[color];

  return (
    <div className={`rounded-2xl border p-4 bg-gradient-to-br ${colors.bg} to-card ${colors.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`${colors.text} shrink-0`}>{icon}</span>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${colors.text}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ── Period Row ─────────────────────────────────────────────────────────────

function PeriodRow({ label, data }: { label: string; data: Summary }) {
  const isPos = data.profit >= 0;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
        <span className="text-blue-300 font-medium">{fp(data.revenue)}</span>
        <span className="text-red-300">{fp(data.cost)}</span>
        <span className={`font-semibold ${isPos ? "text-emerald-400" : "text-red-400"}`}>
          {isPos ? "+" : ""}{fp(data.profit)}
          <span className="text-[10px] font-normal text-muted-foreground ml-1">%{data.margin}</span>
        </span>
      </div>
    </div>
  );
}

// ── Main Widget ────────────────────────────────────────────────────────────

type RangeDays = 7 | 14 | 30 | 90;

export default function AdminProfitWidget() {
  const [data, setData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeDays>(30);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/analytics/profit?days=${range}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d as ProfitData);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const ranges: { label: string; value: RangeDays }[] = [
    { label: "7 Gün", value: 7 },
    { label: "14 Gün", value: 14 },
    { label: "30 Gün", value: 30 },
    { label: "90 Gün", value: 90 },
  ];

  // Use "all" for the top KPIs (tüm zamanlar)
  const all = data?.all;
  const isAllPos = (all?.profit ?? 0) >= 0;

  return (
    <div className="space-y-4">
      {/* ── Başlık ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <DollarSign size={20} className="text-emerald-400" />
          Kar / Zarar Analizi
        </h2>
        <div className="flex gap-1.5">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => {
                setLoading(true);
                setRange(r.value);
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                range === r.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/8 text-muted-foreground hover:bg-white/15"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3 Ana KPI (Tüm Zamanlar) ───────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        {loading || !all ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-pulse h-24" />
          ))
        ) : (
          <>
            <KpiCard
              label="Toplam Kazanç (Tüm Zamanlar)"
              value={fp(all.revenue)}
              sub={`Bakiye yükleme: ${fp(all.topupRevenue)} · Direkt sipariş: ${fp(all.directRevenue)}`}
              color="blue"
              icon={<ArrowUpCircle size={16} />}
            />
            <KpiCard
              label="Toplam Maliyet (Sağlayıcı)"
              value={fp(all.cost)}
              sub={`${all.orderCount} tamamlanan sipariş`}
              color="red"
              icon={<ShoppingCart size={16} />}
            />
            <KpiCard
              label="Net Kar (Tüm Zamanlar)"
              value={fp(all.profit)}
              sub={`Kar marjı: %${all.margin}`}
              color={isAllPos ? "green" : "amber"}
              icon={isAllPos ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            />
          </>
        )}
      </div>

      {/* ── Ana Grafik + Dönem Özeti ────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-[1.6fr,1fr]">
        {/* Trend Grafiği */}
        <Card className="border-white/10 bg-gradient-to-br from-card to-card/70 shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 size={16} className="text-primary" />
              Gelir / Maliyet Trendi — Son {range} Gün
            </CardTitle>
            <div className="flex gap-4 text-[11px] text-muted-foreground mt-1">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 rounded bg-blue-400" /> Gelir
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 rounded bg-red-400" style={{ borderTop: "1px dashed" }} /> Maliyet
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 rounded bg-emerald-400" /> Net Kar
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {loading || !data ? (
              <div className="h-[200px] rounded-xl bg-white/5 animate-pulse" />
            ) : (
              <ProfitTrendChart data={data.chart} />
            )}
          </CardContent>
        </Card>

        {/* Dönem Özeti */}
        <Card className="border-white/10 bg-gradient-to-br from-card to-card/70 shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Dönem Özeti</CardTitle>
            <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground pt-1 border-b border-white/5 pb-2">
              <span className="text-blue-400/70">Kazanç</span>
              <span className="text-red-400/70">Maliyet</span>
              <span className="text-emerald-400/70">Net Kar</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading || !data ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 rounded bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <PeriodRow label="Bugün" data={data.today} />
                <PeriodRow label="Son 7 Gün" data={data.week} />
                <PeriodRow label="Son 30 Gün" data={data.month} />
                <PeriodRow label="Tüm Zamanlar" data={data.all} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── En Karlı Servisler (Son 30 Gün) ────────────────── */}
      {!loading && data && data.topServices.length > 0 && (
        <Card className="border-white/10 bg-gradient-to-br from-card to-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">En Karlı Servisler (Son 30 Gün)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topServices.map((s, i) => {
              const maxProfit = Math.max(...data.topServices.map((x) => x.profit), 0.01);
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: `hsl(${152 - i * 15},70%,${50 - i * 3}%)` }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-slate-300 truncate max-w-[200px]">{s.name}</span>
                      <span className="text-xs font-semibold text-emerald-400 shrink-0 ml-2">{fp(s.profit)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(2, (s.profit / maxProfit) * 100)}%`,
                          background: `hsl(${152 - i * 15},70%,${50 - i * 3}%)`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 w-10 text-right shrink-0">%{s.margin}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
