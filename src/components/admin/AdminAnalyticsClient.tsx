"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Users,
  Eye,
  TrendingUp,
  Globe,
  FileText,
  RefreshCw,
  Wifi,
  Search,
  UserPlus,
  ShoppingCart,
  ArrowRight,
  MapPin,
  Clock,
  Banknote,
  ListOrdered,
  Radio,
  Monitor,
} from "lucide-react";

/* ─── types ─────────────────────────────────────────────── */

type Range = "7d" | "30d" | "12m";
type Tab = "trafik" | "donusum";

interface ChartPoint { label: string; pageviews: number; unique: number; }
interface RangeStats { users: number; orders: number; orderRevenue: number; payments: number; }
interface AnalyticsData {
  online: number; active24h: number;
  today: { pageviews: number; unique: number };
  total: { pageviews: number; unique: number };
  chart: ChartPoint[];
  topPages: Array<{ path: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  rangeStats: RangeStats;
}
interface RealtimeData {
  online: number;
  activePages: Array<{ path: string; count: number }>;
  recentViews: Array<{ path: string; createdAt: string }>;
}
interface SourceRow { source: string; signups: number; orders: number; }
interface TrendPoint { label: string; signups: number; orders: number; }
interface RecentSignup {
  createdAt: string; referrer: string | null; landingPage: string | null;
  source: string; userName: string; userEmail: string;
}
interface UserEventItem {
  type: string; referrer: string | null; landingPage: string | null;
  meta: Record<string, unknown> | null; createdAt: string;
}
interface JourneyData {
  sources: SourceRow[]; trend: TrendPoint[];
  summary: { totalSignups: number; totalOrders: number; conversionRate: string };
  recentSignups: RecentSignup[];
  userJourney: {
    user: { id: string; name: string | null; email: string | null; createdAt: string } | null;
    events: UserEventItem[]; orderCount: number;
  } | null;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/* ─── Kavisli Bezier Çizgi Formülü ───────────────────────── */
function getBezierPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX1 = p0.x + (p1.x - p0.x) / 3;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (2 * (p1.x - p0.x)) / 3;
    const cpY2 = p1.y;
    d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }
  return d;
}

/* ─── Trafik Grafiği ────────────────────────────────────── */
function AreaChart({ data }: { data: ChartPoint[] }) {
  const W = 800; const H = 180; const PAD_L = 44; const PAD_B = 28;
  const chartW = W - PAD_L - 8; const chartH = H - PAD_B;
  const maxVal = Math.max(...data.map((d) => Math.max(d.pageviews, d.unique)), 1);
  const n = data.length; const step = n > 1 ? chartW / (n - 1) : chartW;
  const getX = (i: number) => PAD_L + (n > 1 ? i * step : chartW / 2);
  const getY = (v: number) => chartH - (v / maxVal) * chartH;

  const pointsPV = data.map((d, i) => ({ x: getX(i), y: getY(d.pageviews) }));
  const pointsUV = data.map((d, i) => ({ x: getX(i), y: getY(d.unique) }));

  const pvLineD = getBezierPath(pointsPV);
  const uvLineD = getBezierPath(pointsUV);

  const pvAreaD = pvLineD ? `${pvLineD} L ${getX(n - 1)} ${chartH} L ${getX(0)} ${chartH} Z` : "";
  const uvAreaD = uvLineD ? `${uvLineD} L ${getX(n - 1)} ${chartH} L ${getX(0)} ${chartH} Z` : "";

  const xSkip = n <= 8 ? 1 : n <= 16 ? 2 : n <= 20 ? 3 : Math.ceil(n / 8);
  if (n === 0) return <div className="flex items-center justify-center h-[200px] text-sm text-slate-500">Henüz veri yok</div>;
  
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
      <defs>
        <linearGradient id="gradPV" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
        <linearGradient id="gradUV" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => <line key={t} x1={PAD_L} y1={getY(maxVal * t)} x2={W - 8} y2={getY(maxVal * t)} stroke="#1e293b" strokeWidth={1} />)}
      {[0, 0.5, 1].map((t) => <text key={t} x={PAD_L - 6} y={getY(maxVal * t) + 4} textAnchor="end" fontSize="9" fill="#475569">{fmt(Math.round(maxVal * t))}</text>)}
      
      <path d={pvAreaD} fill="url(#gradPV)" />
      <path d={uvAreaD} fill="url(#gradUV)" />
      <path d={pvLineD} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinejoin="round" />
      <path d={uvLineD} fill="none" stroke="#8b5cf6" strokeWidth={2} strokeLinejoin="round" strokeDasharray="6 2" />
      
      {data.map((d, i) => <g key={i}><circle cx={getX(i)} cy={getY(d.pageviews)} r={3.5} fill="#3b82f6" stroke="#0f172a" strokeWidth={1.5} /><circle cx={getX(i)} cy={getY(d.unique)} r={3} fill="#8b5cf6" stroke="#0f172a" strokeWidth={1.5} /></g>)}
      {data.map((d, i) => { if (i % xSkip !== 0 && i !== n - 1) return null; return <text key={i} x={getX(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#475569">{d.label}</text>; })}
    </svg>
  );
}

/* ─── Dönüşüm Trend Grafiği ─────────────────────────────── */
function ConversionTrendChart({ data }: { data: TrendPoint[] }) {
  const W = 800; const H = 160; const PAD_L = 44; const PAD_B = 28;
  const chartW = W - PAD_L - 8; const chartH = H - PAD_B;
  const maxVal = Math.max(...data.map((d) => Math.max(d.signups, d.orders)), 1);
  const n = data.length; const step = n > 1 ? chartW / (n - 1) : chartW;
  const getX = (i: number) => PAD_L + (n > 1 ? i * step : chartW / 2);
  const getY = (v: number) => chartH - (v / maxVal) * (chartH - 4);
  if (n === 0) return <div className="flex items-center justify-center h-[160px] text-sm text-slate-500">Henüz veri yok</div>;

  const pointsSig = data.map((d, i) => ({ x: getX(i), y: getY(d.signups) }));
  const pointsOrd = data.map((d, i) => ({ x: getX(i), y: getY(d.orders) }));

  const sigLineD = getBezierPath(pointsSig);
  const ordLineD = getBezierPath(pointsOrd);

  const sigAreaD = sigLineD ? `${sigLineD} L ${getX(n - 1)} ${chartH} L ${getX(0)} ${chartH} Z` : "";
  const ordAreaD = ordLineD ? `${ordLineD} L ${getX(n - 1)} ${chartH} L ${getX(0)} ${chartH} Z` : "";

  const xSkip = n <= 8 ? 1 : n <= 16 ? 2 : Math.ceil(n / 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
      <defs>
        <linearGradient id="gradSig" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
        <linearGradient id="gradOrd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => <line key={t} x1={PAD_L} y1={getY(maxVal * t)} x2={W - 8} y2={getY(maxVal * t)} stroke="#1e293b" strokeWidth={1} />)}
      {[0, 0.5, 1].map((t) => <text key={t} x={PAD_L - 6} y={getY(maxVal * t) + 4} textAnchor="end" fontSize="9" fill="#475569">{Math.round(maxVal * t)}</text>)}
      
      <path d={sigAreaD} fill="url(#gradSig)" />
      <path d={ordAreaD} fill="url(#gradOrd)" />
      <path d={sigLineD} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinejoin="round" />
      <path d={ordLineD} fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinejoin="round" />
      
      {data.map((d, i) => <g key={i}><circle cx={getX(i)} cy={getY(d.signups)} r={3.5} fill="#10b981" stroke="#0f172a" strokeWidth={1.5} /><circle cx={getX(i)} cy={getY(d.orders)} r={3} fill="#f59e0b" stroke="#0f172a" strokeWidth={1.5} /></g>)}
      {data.map((d, i) => { if (i % xSkip !== 0 && i !== n - 1) return null; return <text key={i} x={getX(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#475569">{d.label}</text>; })}
    </svg>
  );
}

/* ─── Stat Card ──────────────────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon, accent, pulse }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; accent: string; pulse?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-card to-card/45 p-6 flex flex-col gap-4 shadow-xl shadow-black/10 backdrop-blur-md transition-all duration-300 hover:border-white/10 hover:shadow-black/20 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-black/5 ${accent}`}><Icon size={16} /></div>
      </div>
      <div className="flex items-end gap-2">
        <p className="text-3xl font-extrabold tracking-tight tabular-nums text-white">{typeof value === "number" ? fmt(value) : value}</p>
        {pulse && (
          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/15">
            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" /></span>
            CANLI
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-slate-500 font-medium">{sub}</p>}
    </div>
  );
}

/* ─── Gerçek Zamanlı Panel ───────────────────────────────── */
function RealtimePanel() {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState(false);

  const fetchRealtime = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/analytics/realtime", { cache: "no-store" });
      if (res.ok) { setData(await res.json()); setLastUpdate(new Date()); setError(false); }
      else setError(true);
    } catch { setError(true); }
  }, []);

  useEffect(() => {
    const firstRun = setTimeout(() => {
      void fetchRealtime();
    }, 0);
    const id = setInterval(() => {
      void fetchRealtime();
    }, 10_000);
    return () => {
      clearTimeout(firstRun);
      clearInterval(id);
    };
  }, [fetchRealtime]);

  const online = data?.online ?? 0;
  const recentViews = data?.recentViews ?? [];
  const activePages = data?.activePages ?? [];

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/2 p-6 shadow-2xl shadow-emerald-950/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center gap-2.5 mb-5">
        <Radio size={16} className="text-emerald-400 animate-pulse" />
        <p className="text-sm font-bold tracking-wide text-emerald-300 uppercase">Gerçek Zamanlı Ziyaretçi İzleme</p>
        {error ? (
          <span className="ml-auto text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/15">Bağlantı hatası</span>
        ) : (
          <span className="ml-auto text-[10px] font-medium text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
            {lastUpdate ? `${lastUpdate.toLocaleTimeString("tr-TR")} güncellendi` : "Yükleniyor..."}
          </span>
        )}
        <span className="text-[10px] font-bold text-slate-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">• 10s</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Online Sayısı */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex items-center gap-5 shadow-lg shadow-emerald-950/10 relative overflow-hidden group hover:border-emerald-500/35 transition-all">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20 shadow-inner">
              <Wifi size={24} className="text-emerald-400" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400 shadow-md shadow-black" />
            </span>
          </div>
          <div className="relative">
            <p className="text-4xl font-black tabular-nums text-white leading-none tracking-tight">{online}</p>
            <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mt-1.5">Anlık Online</p>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">Son 45 saniye</p>
          </div>
        </div>

        {/* Şu An Aktif Sayfalar */}
        <div className="rounded-xl border border-white/5 bg-white/3 p-5 shadow-lg relative group hover:border-white/10 transition-all">
          <div className="flex items-center gap-1.5 mb-3.5">
            <Monitor size={14} className="text-slate-400" />
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Aktif Sayfalar</p>
          </div>
          {activePages.length === 0 ? (
            <p className="text-xs text-slate-600 py-3 italic">Aktif sayfa yok</p>
          ) : (
            <div className="space-y-2 max-h-[120px] overflow-y-auto scrollbar-hide pr-1">
              {activePages.slice(0, 5).map((ap, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-0.5">
                  <span className="text-[11px] font-medium text-slate-400 truncate max-w-[170px]" title={ap.path}>{ap.path}</span>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10 shrink-0 tabular-nums">{ap.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Son Aktivite */}
        <div className="rounded-xl border border-white/5 bg-white/3 p-5 shadow-lg relative group hover:border-white/10 transition-all">
          <div className="flex items-center gap-1.5 mb-3.5">
            <Activity size={14} className="text-slate-400" />
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Son Ziyaretler</p>
            <span className="ml-auto text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">{recentViews.length}</span>
          </div>
          {recentViews.length === 0 ? (
            <p className="text-xs text-slate-600 py-3 italic">Son 5 dakikada aktivite yok</p>
          ) : (
            <div className="space-y-2 max-h-[120px] overflow-y-auto scrollbar-hide pr-1">
              {recentViews.slice(0, 8).map((v, i) => (
                <div key={i} className="flex items-center gap-3 py-0.5 justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 animate-pulse" />
                    <span className="text-[11px] font-medium text-slate-400 truncate max-w-[130px]">{v.path}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 shrink-0 tabular-nums">
                    {new Date(v.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Top Table ──────────────────────────────────────────── */
function TopTable({ title, icon: Icon, rows, keyField, maxCount, rangeLabel }: {
  title: string; icon: React.ElementType; rows: Array<Record<string, string | number>>;
  keyLabel: string; keyField: string; maxCount: number; rangeLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={15} className="text-slate-400" />
        <p className="text-sm font-semibold">{title}</p>
        <span className="ml-auto text-xs text-slate-500">{rangeLabel}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">Henüz veri yok</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const pct = maxCount > 0 ? (Number(r.count) / maxCount) * 100 : 0;
            return (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300 truncate max-w-[200px]" title={String(r[keyField])}>{String(r[keyField])}</span>
                  <span className="text-slate-400 ml-2 tabular-nums">{fmt(Number(r.count))}</span>
                </div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${keyField === "path" ? "bg-blue-500/60" : "bg-purple-500/60"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Dönüşüm Sekmesi ────────────────────────────────────── */
function ConversionTab({ range }: { range: Range }) {
  const [data, setData] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailSearch, setEmailSearch] = useState("");
  const [queryEmail, setQueryEmail] = useState("");

  const fetchJourney = useCallback(async (r: Range, email = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/user-journey?range=${r}&email=${encodeURIComponent(email)}`, { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchJourney(range, queryEmail); }, [range, queryEmail, fetchJourney]);

  const handleSearch = () => setQueryEmail(emailSearch.trim());
  const maxSignups = Math.max(...(data?.sources.map((s) => s.signups) ?? []), 1);

  return (
    <div className="space-y-6">
      {/* Özet kartlar */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Toplam Kayıt" value={data?.summary.totalSignups ?? 0} sub="Seçilen dönemde" icon={UserPlus} accent="bg-emerald-500/15 text-emerald-400" />
        <StatCard label="Toplam Sipariş" value={data?.summary.totalOrders ?? 0} sub="Seçilen dönemde" icon={ShoppingCart} accent="bg-amber-500/15 text-amber-400" />
        <StatCard label="Dönüşüm Oranı" value={`%${data?.summary.conversionRate ?? "0.0"}`} sub="Kayıt → Sipariş" icon={TrendingUp} accent="bg-blue-500/15 text-blue-400" />
      </div>

      {/* Trend grafiği */}
      <div className="rounded-2xl border border-white/8 bg-card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p className="text-sm font-semibold">Kayıt &amp; Sipariş Trendi</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-emerald-500 rounded" />Yeni Kayıt</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-amber-500 rounded" />Sipariş</span>
          </div>
        </div>
        {loading && !data ? (
          <div className="h-[160px] flex items-center justify-center"><RefreshCw size={18} className="animate-spin text-slate-600" /></div>
        ) : <ConversionTrendChart data={data?.trend ?? []} />}
      </div>

      {/* Kaynak tablosu */}
      <div className="rounded-2xl border border-white/8 bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={15} className="text-slate-400" />
          <p className="text-sm font-semibold">Trafik Kaynağına Göre Dönüşüm</p>
        </div>
        {!data || data.sources.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">Henüz kayıt verisi yok</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 px-3 text-slate-400 font-medium">Kaynak</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Kayıt</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Sipariş</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Dönüşüm %</th>
                  <th className="py-2 px-3 w-32"></th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((row, i) => {
                  const rate = row.signups > 0 ? ((row.orders / row.signups) * 100).toFixed(1) : "0.0";
                  const pct = (row.signups / maxSignups) * 100;
                  return (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                      <td className="py-2.5 px-3 font-medium text-slate-200">{row.source}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-emerald-400">{row.signups}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-amber-400">{row.orders}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-blue-400">%{rate}</td>
                      <td className="py-2.5 px-3"><div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${pct}%` }} /></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Kullanıcı yolculuğu sorgulayıcı */}
      <div className="rounded-2xl border border-white/8 bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Search size={15} className="text-slate-400" />
          <p className="text-sm font-semibold">Kullanıcı Yolculuğu Sorgula</p>
        </div>
        <p className="text-xs text-slate-500">Belirli bir kullanıcının nereden geldiğini, ne zaman üye olduğunu ve sipariş verdiğini görüntüleyin.</p>
        <div className="flex gap-2">
          <input
            type="email" value={emailSearch} onChange={(e) => setEmailSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="ornek@email.com"
            className="flex-1 h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button onClick={handleSearch} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
            Sorgula
          </button>
        </div>

        {queryEmail && data?.userJourney !== null && (
          <>
            {data?.userJourney?.user === null ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400">
                &quot;{queryEmail}&quot; adresine sahip kullanıcı bulunamadı.
              </div>
            ) : data?.userJourney?.user ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-sm text-slate-100">{data.userJourney.user.name ?? "İsimsiz"}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{data.userJourney.user.email}</p>
                      <p className="text-[11px] text-slate-500 mt-1">Üyelik: {fmtDate(data.userJourney.user.createdAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold tabular-nums text-amber-400">{data.userJourney.orderCount}</p>
                      <p className="text-[10px] text-slate-500">toplam sipariş</p>
                    </div>
                  </div>
                </div>
                {data.userJourney.events.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-2">Kayıtlı izleme olayı yok. Yalnızca yeni kayıtlar ve siparişler için kayıt var.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Yolculuk Zaman Çizelgesi</p>
                    {data.userJourney.events.map((ev, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${ev.type === "signup" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                          {ev.type === "signup" ? <UserPlus size={11} /> : <ShoppingCart size={11} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-medium ${ev.type === "signup" ? "text-emerald-400" : "text-amber-400"}`}>
                              {ev.type === "signup" ? "Üye Oldu" : "Sipariş Verdi"}
                            </span>
                            {ev.type === "order" && ev.meta && (
                              <span className="text-[11px] text-slate-400">
                                {String(ev.meta.serviceName ?? "")} · ₺{Number(ev.meta.amount ?? 0).toFixed(2)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {ev.referrer && (
                              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <ArrowRight size={9} />Kaynak: <span className="text-slate-400">{ev.referrer.slice(0, 60)}{ev.referrer.length > 60 ? "…" : ""}</span>
                              </span>
                            )}
                            {ev.landingPage && (
                              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <MapPin size={9} /><span className="text-slate-400">{ev.landingPage}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Clock size={9} />{fmtDate(ev.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Son kayıtlar */}
      <div className="rounded-2xl border border-white/8 bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={15} className="text-slate-400" />
          <p className="text-sm font-semibold">Son Kayıt Olan Kullanıcılar</p>
          <span className="ml-auto text-xs text-slate-500">Son 10</span>
        </div>
        {!data || data.recentSignups.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">Seçilen dönemde kayıt yok</p>
        ) : (
          <div className="space-y-2">
            {data.recentSignups.map((s, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
                  <UserPlus size={12} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{s.userName !== "-" ? s.userName : s.userEmail}</p>
                  <p className="text-[11px] text-slate-500 truncate">{s.userEmail}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20">{s.source}</span>
                  <p className="text-[10px] text-slate-600 mt-0.5">{fmtDate(s.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Ana Bileşen ────────────────────────────────────────── */
export default function AdminAnalyticsClient() {
  const [tab, setTab] = useState<Tab>("trafik");
  const [range, setRange] = useState<Range>("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchTraffic = useCallback(async (r: Range) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?range=${r}`, { cache: "no-store" });
      if (res.ok) { setData(await res.json()); setLastRefresh(new Date()); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (tab === "trafik") fetchTraffic(range); }, [range, tab, fetchTraffic]);
  useEffect(() => {
    if (tab !== "trafik") return;
    const id = setInterval(() => fetchTraffic(range), 30_000);
    return () => clearInterval(id);
  }, [range, tab, fetchTraffic]);

  const rangeButtons: Array<{ label: string; value: Range }> = [
    { label: "7 Gün", value: "7d" }, { label: "30 Gün", value: "30d" }, { label: "12 Ay", value: "12m" },
  ];
  const maxTopPage = data?.topPages[0]?.count ?? 0;
  const maxTopRef = data?.topReferrers[0]?.count ?? 0;
  const rangeLabel = range === "7d" ? "Son 7 gün" : range === "30d" ? "Son 30 gün" : "Son 12 ay";

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Site Analitiği</h1>
          <p className="text-sm text-slate-400 mt-0.5">Ziyaretçi trafiği ve kullanıcı dönüşüm verileri</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-white/10 overflow-hidden">
            {rangeButtons.map((b) => (
              <button key={b.value} onClick={() => setRange(b.value)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${range === b.value ? "bg-primary text-primary-foreground" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}>
                {b.label}
              </button>
            ))}
          </div>
          {tab === "trafik" && (
            <button onClick={() => fetchTraffic(range)} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors disabled:opacity-50">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />Yenile
            </button>
          )}
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 rounded-xl border border-white/8 bg-white/3 p-1 w-fit">
        {([
          { key: "trafik" as const, label: "Trafik", icon: Eye },
          { key: "donusum" as const, label: "Dönüşüm & Kullanıcı", icon: TrendingUp },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === key ? "bg-card text-slate-100 shadow border border-white/8" : "text-slate-500 hover:text-slate-300"}`}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* Trafik sekmesi */}
      {tab === "trafik" && (
        <>
          {lastRefresh && <p className="text-[11px] text-slate-600">Son güncelleme: {lastRefresh.toLocaleTimeString("tr-TR")}</p>}

          {/* Gerçek zamanlı panel — kendi 10s polling'i var */}
          <RealtimePanel />

          {/* Bugün ve toplam istatistikler */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Son 24s Aktif" value={data?.active24h ?? 0} sub="Tekil ziyaretçi" icon={Activity} accent="bg-blue-500/15 text-blue-400" />
            <StatCard label="Bugün Görüntüleme" value={data?.today.pageviews ?? 0} sub={`${fmt(data?.today.unique ?? 0)} tekil (TR saati)`} icon={Eye} accent="bg-cyan-500/15 text-cyan-400" />
            <StatCard label="Toplam Görüntüleme" value={data?.total.pageviews ?? 0} sub={`${fmt(data?.total.unique ?? 0)} tekil ziyaretçi`} icon={TrendingUp} accent="bg-purple-500/15 text-purple-400" />
            <StatCard label="Toplam Oturum" value={data?.total.unique ?? 0} sub="Tüm zamanlar, tarayıcı bazlı" icon={Users} accent="bg-indigo-500/15 text-indigo-400" />
          </div>
          <div className="rounded-2xl border border-white/8 bg-card p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-sm font-semibold">Trafik Grafiği</p>
              <div className="flex items-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-blue-500 rounded" />Sayfa Görüntüleme</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-px bg-purple-500 rounded border-b border-dashed border-purple-500" />Tekil Ziyaretçi</span>
              </div>
            </div>
            {loading && !data ? <div className="h-[200px] flex items-center justify-center"><RefreshCw size={20} className="animate-spin text-slate-600" /></div>
              : <AreaChart data={data?.chart ?? []} />}
          </div>

          {/* Dönem iş özeti */}
          <div className="rounded-2xl border border-white/8 bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} className="text-slate-400" />
              <p className="text-sm font-semibold">Dönem Özeti</p>
              <span className="ml-auto text-xs text-slate-500">{rangeLabel}</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-white/8 bg-white/3 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400 shrink-0"><Eye size={16} /></div>
                <div>
                  <p className="text-xs text-slate-500">Sayfa Görüntüleme</p>
                  <p className="text-lg font-bold tabular-nums">{fmt(data?.chart.reduce((s, d) => s + d.pageviews, 0) ?? 0)}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/3 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0"><Users size={16} /></div>
                <div>
                  <p className="text-xs text-slate-500">Yeni Üye</p>
                  <p className="text-lg font-bold tabular-nums">{fmt(data?.rangeStats?.users ?? 0)}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/3 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0"><ListOrdered size={16} /></div>
                <div>
                  <p className="text-xs text-slate-500">Sipariş</p>
                  <p className="text-lg font-bold tabular-nums">{fmt(data?.rangeStats?.orders ?? 0)}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/3 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400 shrink-0"><Banknote size={16} /></div>
                <div>
                  <p className="text-xs text-slate-500">Ödeme Geliri</p>
                  <p className="text-lg font-bold tabular-nums">₺{(data?.rangeStats?.payments ?? 0).toFixed(0)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <TopTable title="En Çok Ziyaret Edilen Sayfalar" icon={FileText} rows={data?.topPages ?? []} keyLabel="Sayfa" keyField="path" maxCount={maxTopPage} rangeLabel={rangeLabel} />
            <TopTable title="Trafik Kaynakları" icon={Globe} rows={data?.topReferrers ?? []} keyLabel="Kaynak" keyField="referrer" maxCount={maxTopRef} rangeLabel={rangeLabel} />
          </div>
          <div className="rounded-xl border border-white/5 bg-white/2 px-4 py-3 text-xs text-slate-500">
            ℹ️ Admin kullanıcılarının ziyaretleri hiçbir zaman kaydedilmez. Sayfa görüntüleme verisi yalnızca pazarlama sayfalarından (marketing) toplanır. Dashboard kullanıcıları online sayımına dahildir ancak pageview verisine dahil edilmez. Online sayısı her 10 saniyede, diğer veriler 30 saniyede güncellenir. Bugün istatistikleri Türkiye saatine (UTC+3) göre hesaplanır.
          </div>
        </>
      )}

      {/* Dönüşüm sekmesi */}
      {tab === "donusum" && <ConversionTab range={range} />}
    </div>
  );
}
