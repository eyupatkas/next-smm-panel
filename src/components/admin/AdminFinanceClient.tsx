"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { approveBankTransferPayment } from "@/lib/actions/admin-actions";
import {
  CreditCard, TrendingUp, AlertCircle, Clock, Search,
  Download, Receipt, ShoppingCart, CheckCircle2, XCircle,
  Filter, RefreshCw, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────── */
type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED";

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  externalId: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
}

interface Stats {
  totalRevenue: number;
  failedCount: number;
  pendingAmount: number;
  pendingCount: number;
  orderRevenue: number;
}

type Tab = "all" | "completed" | "failed" | "pending";

/* ─── Helpers ────────────────────────────────────────────── */
function fmt(amount: number) {
  return amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR");
}

const STATUS_CFG: Record<PaymentStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  COMPLETED: { label: "Başarılı", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle2 size={12} /> },
  FAILED:    { label: "Başarısız", color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20",       icon: <XCircle size={12} /> },
  PENDING:   { label: "Bekliyor",  color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20",   icon: <Clock size={12} /> },
};

const METHOD_LABEL: Record<string, string> = {
  PAYTR: "PayTR",
  SHOPIER: "Shopier",
  RETAIL_PAYTR: "PayTR (Paket)",
  ADMIN: "Admin",
  BALANCE: "Bakiye",
  BANK_TRANSFER: "Havale / EFT",
  RETAIL_CRYPTOMUS: "Cryptomus (Sipariş)",
  CRYPTOMUS: "Cryptomus",
};

/* ─── Invoice generator ──────────────────────────────────── */
function openInvoice(payment: Payment) {
  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>Fatura #${payment.id.slice(-8).toUpperCase()}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; background: #fff; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0066ff; padding-bottom: 20px; margin-bottom: 30px; }
  .brand { font-size: 28px; font-weight: 800; color: #0066ff; letter-spacing: -1px; }
  .brand small { display: block; font-size: 12px; font-weight: 400; color: #666; margin-top: 2px; }
  .invoice-meta { text-align: right; }
  .invoice-meta h2 { font-size: 20px; font-weight: 700; color: #333; }
  .invoice-meta p { font-size: 12px; color: #666; margin-top: 4px; }
  .section { margin-bottom: 24px; }
  .section h3 { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #888; margin-bottom: 8px; letter-spacing: 0.05em; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .info-box { background: #f8f9fa; border-radius: 8px; padding: 16px; }
  .info-box p { font-size: 13px; color: #555; margin-bottom: 4px; }
  .info-box strong { display: block; font-size: 15px; color: #222; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  thead tr { background: #f0f4ff; }
  th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0044bb; }
  td { padding: 12px; font-size: 13px; border-bottom: 1px solid #eee; }
  .total-row { background: #f0f4ff; font-weight: 700; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge-ok { background: #d1fae5; color: #065f46; }
  .badge-fail { background: #fee2e2; color: #991b1b; }
  .badge-pend { background: #fef3c7; color: #92400e; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #aaa; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div class="brand">OptiSMM<small>Sosyal Medya Hizmetleri</small></div>
  <div class="invoice-meta">
    <h2>FATURA</h2>
    <p>#${payment.id.slice(-8).toUpperCase()}</p>
    <p>${fmtDate(payment.createdAt)}</p>
  </div>
</div>

<div class="section">
  <h3>Müşteri Bilgileri</h3>
  <div class="info-grid">
    <div class="info-box">
      <p>Ad Soyad</p>
      <strong>${payment.user.name ?? "—"}</strong>
    </div>
    <div class="info-box">
      <p>E-Posta</p>
      <strong>${payment.user.email ?? "—"}</strong>
    </div>
  </div>
</div>

<div class="section">
  <h3>Ödeme Detayları</h3>
  <table>
    <thead>
      <tr>
        <th>Açıklama</th>
        <th>Yöntem</th>
        <th>Referans No</th>
        <th>Tutar</th>
        <th>Durum</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Bakiye / Sipariş Ödemesi</td>
        <td>${METHOD_LABEL[payment.method] ?? payment.method}</td>
        <td style="font-family:monospace;font-size:11px">${payment.externalId ?? "—"}</td>
        <td><strong>${fmt(payment.amount)}</strong></td>
        <td>
          <span class="badge ${payment.status === "COMPLETED" ? "badge-ok" : payment.status === "FAILED" ? "badge-fail" : "badge-pend"}">
            ${STATUS_CFG[payment.status].label}
          </span>
        </td>
      </tr>
      <tr class="total-row">
        <td colspan="3" style="text-align:right">TOPLAM</td>
        <td colspan="2"><strong>${fmt(payment.amount)}</strong></td>
      </tr>
    </tbody>
  </table>
</div>

<div class="footer">
  Bu belge OptiSMM tarafından otomatik oluşturulmuştur. · optismm.com
</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }
}

/* ─── Main Component ─────────────────────────────────────── */
export function AdminFinanceClient({ initialPayments, stats }: { initialPayments: Payment[]; stats: Stats }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const filtered = useMemo(() => {
    return initialPayments.filter((p) => {
      if (tab === "completed" && p.status !== "COMPLETED") return false;
      if (tab === "failed" && p.status !== "FAILED") return false;
      if (tab === "pending" && p.status !== "PENDING") return false;

      if (methodFilter && p.method !== methodFilter) return false;

      if (dateFrom) {
        const d = new Date(dateFrom);
        if (new Date(p.createdAt) < d) return false;
      }
      if (dateTo) {
        const d = new Date(dateTo);
        d.setDate(d.getDate() + 1);
        if (new Date(p.createdAt) > d) return false;
      }

      if (search) {
        const q = search.toLowerCase();
        return (
          (p.user.name ?? "").toLowerCase().includes(q) ||
          (p.user.email ?? "").toLowerCase().includes(q) ||
          (p.externalId ?? "").toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [initialPayments, tab, search, dateFrom, dateTo, methodFilter]);

  const tabRevenue = useMemo(
    () => filtered.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + p.amount, 0),
    [filtered]
  );

  const methods = useMemo(
    () => Array.from(new Set(initialPayments.map((p) => p.method))).sort(),
    [initialPayments]
  );

  const TABS: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "all",       label: "Tümü",        icon: <CreditCard size={13} />,   count: initialPayments.length },
    { key: "completed", label: "Başarılı",     icon: <CheckCircle2 size={13} />, count: initialPayments.filter((p) => p.status === "COMPLETED").length },
    { key: "failed",    label: "Başarısız",    icon: <XCircle size={13} />,      count: initialPayments.filter((p) => p.status === "FAILED").length },
    { key: "pending",   label: "Bekleyen",     icon: <Clock size={13} />,        count: initialPayments.filter((p) => p.status === "PENDING").length },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finans & Ödemeler</h1>
        <p className="text-muted-foreground text-sm mt-1">Tüm ödeme ve finans işlemlerini yönetin</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<TrendingUp size={18} className="text-emerald-400" />}
          label="Toplam Gelir"
          value={fmt(stats.totalRevenue)}
          sub="Tamamlanmış ödemeler"
          color="emerald"
        />
        <StatCard
          icon={<ShoppingCart size={18} className="text-blue-400" />}
          label="Sipariş Geliri"
          value={fmt(stats.orderRevenue)}
          sub="İşlem gören siparişler"
          color="blue"
        />
        <StatCard
          icon={<Clock size={18} className="text-amber-400" />}
          label="Bekleyen"
          value={fmt(stats.pendingAmount)}
          sub={`${stats.pendingCount} işlem`}
          color="amber"
        />
        <StatCard
          icon={<AlertCircle size={18} className="text-red-400" />}
          label="Başarısız"
          value={String(stats.failedCount)}
          sub="Reddedilen ödeme"
          color="red"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06] pb-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span className={cn(
                "text-[10px] rounded-full px-1.5 py-0.5 font-semibold",
                tab === t.key ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-muted-foreground"
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Kullanıcı, e-posta veya ref. no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="h-9 rounded-lg border border-white/10 bg-background px-3 text-sm min-w-[140px]"
        >
          <option value="">Tüm yöntemler</option>
          {methods.map((m) => (
            <option key={m} value={m}>{METHOD_LABEL[m] ?? m}</option>
          ))}
        </select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-9 text-sm w-auto"
          placeholder="Başlangıç"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-9 text-sm w-auto"
          placeholder="Bitiş"
        />

        {(search || methodFilter || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => { setSearch(""); setMethodFilter(""); setDateFrom(""); setDateTo(""); }}
          >
            <RefreshCw size={12} /> Temizle
          </Button>
        )}
      </div>

      {/* Result summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Filter size={13} />
          <span>{filtered.length} kayıt</span>
          {tabRevenue > 0 && (
            <span className="text-emerald-400 font-medium">· Toplam: {fmt(tabRevenue)}</span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tarih</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kullanıcı</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Yöntem</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ref. No</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tutar</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Durum</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const sc = STATUS_CFG[p.status];
                return (
                  <tr
                    key={p.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-200">{p.user.name ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground">{p.user.email ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {METHOD_LABEL[p.method] ?? p.method}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {p.externalId ? p.externalId.slice(0, 24) + (p.externalId.length > 24 ? "…" : "") : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-200">
                      {fmt(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border", sc.bg, sc.color)}>
                        {sc.icon}
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.method === "BANK_TRANSFER" && p.status === "PENDING" && (
                        <button
                          onClick={async () => {
                            const result = await approveBankTransferPayment(p.id);
                            if (result.error) window.alert(result.error);
                            else router.refresh();
                          }}
                          className="inline-flex items-center gap-1 mr-2 text-[11px] px-2.5 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-colors"
                        >
                          <CheckCircle2 size={11} /> Onayla
                        </button>
                      )}
                      <button
                        onClick={() => openInvoice(p)}
                        title="Fatura Oluştur"
                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 transition-colors"
                      >
                        <FileText size={11} />
                        Fatura
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── StatCard ───────────────────────────────────────────── */
function StatCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: "emerald" | "blue" | "amber" | "red";
}) {
  const colors = {
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    blue:    "border-blue-500/20 bg-blue-500/5",
    amber:   "border-amber-500/20 bg-amber-500/5",
    red:     "border-red-500/20 bg-red-500/5",
  };
  return (
    <div className={cn("rounded-2xl border p-5 space-y-2", colors[color])}>
      <div className="flex items-center justify-between">
        {icon}
      </div>
      <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
