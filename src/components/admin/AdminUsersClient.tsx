"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Wallet,
  ShieldCheck,
  Users,
  CreditCard,
  TicketIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Minus,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice, getCurrencyForLocale, localeToIntlCode } from "@/lib/currency";
import { useRouter } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────────────────

type Role = "ADMIN" | "USER" | "RESELLER";
type RoleFilter = "ALL" | Role;

interface UserSummary {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  questCoins?: number;
  referralBalance?: number;
  role: Role;
  balance: number;
  spent: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { orders: number; payments: number; tickets: number };
}

interface UserDetail extends UserSummary {
  phone: string | null;
  apiKey: string;
  parent: { id: string; name: string | null; email: string | null } | null;
  _count: { orders: number; payments: number; tickets: number; customers: number; quests: number };
  orders: Array<{
    id: string;
    status: string;
    charge: number;
    createdAt: string;
    service: { name: string };
  }>;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
}

interface Props {
  locale: string;
  resellers: Array<{ id: string; name: string | null; email: string | null }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_TABS: { value: RoleFilter; label: string }[] = [
  { value: "ALL", label: "Tümü" },
  { value: "ADMIN", label: "Admin" },
  { value: "RESELLER", label: "Bayi" },
  { value: "USER", label: "Kullanıcı" },
];

function roleBadgeVariant(role: Role) {
  if (role === "ADMIN") return "bg-red-500/15 text-red-400 border-red-500/30";
  if (role === "RESELLER") return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  return "bg-blue-500/15 text-blue-400 border-blue-500/30";
}

function roleLabel(role: Role) {
  const map: Record<Role, string> = { ADMIN: "Admin", RESELLER: "Bayi", USER: "Kullanıcı" };
  return map[role] ?? role;
}

function orderStatusDot(status: string) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-400",
    PROCESSING: "bg-blue-400",
    COMPLETED: "bg-emerald-400",
    PARTIAL: "bg-orange-400",
    CANCELED: "bg-red-400",
    REFUNDED: "bg-purple-400",
  };
  return map[status] ?? "bg-muted-foreground";
}

function orderStatusLabel(s: string) {
  const map: Record<string, string> = {
    PENDING: "Bekliyor",
    PROCESSING: "İşlemde",
    COMPLETED: "Tamamlandı",
    PARTIAL: "Kısmi",
    CANCELED: "İptal",
    REFUNDED: "İade",
  };
  return map[s] ?? s;
}

function paymentStatusLabel(s: string) {
  const map: Record<string, string> = {
    PENDING: "Bekliyor",
    COMPLETED: "Tamamlandı",
    FAILED: "Başarısız",
    REFUNDED: "İade",
  };
  return map[s] ?? s;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminUsersClient({ locale, resellers }: Props) {
  const router = useRouter();
  const currency = getCurrencyForLocale(locale);
  const intlLocale = localeToIntlCode[locale as keyof typeof localeToIntlCode] ?? locale;
  const fp = (amount: number) => formatPrice(amount, currency, intlLocale);

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [loading, setLoading] = useState(false);

  // Dialogs
  const [detailUser, setDetailUser] = useState<UserDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [editUser, setEditUser] = useState<UserSummary | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [balanceUser, setBalanceUser] = useState<UserSummary | null>(null);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [balanceDelta, setBalanceDelta] = useState("");
  const [balanceMode, setBalanceMode] = useState<"add" | "set">("add");

  const [deleteUser, setDeleteUser] = useState<UserSummary | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<Role>("USER");
  const [editParentId, setEditParentId] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search: debouncedSearch,
        role: roleFilter === "ALL" ? "" : roleFilter,
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, roleFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open detail
  const openDetail = async (user: UserSummary) => {
    setDetailLoading(true);
    setDetailOpen(true);
    setDetailUser(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDetailUser(data);
    } catch {
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Open edit
  const openEdit = (user: UserSummary) => {
    setEditUser(user);
    setEditName(user.name ?? "");
    setEditEmail(user.email ?? "");
    setEditUsername(user.username ?? "");
    setEditPhone("");
    setEditRole(user.role);
    setEditParentId(user.parentId ?? "");
    setEditOpen(true);
  };

  // Open balance
  const openBalance = (user: UserSummary) => {
    setBalanceUser(user);
    setBalanceDelta("");
    setBalanceMode("add");
    setBalanceOpen(true);
  };

  // Save edit
  const saveEdit = async () => {
    if (!editUser) return;
    startTransition(async () => {
      try {
        const body: Record<string, unknown> = {
          name: editName,
          email: editEmail,
          username: editUsername,
          phone: editPhone,
          role: editRole,
          parentId: editParentId || null,
        };
        const res = await fetch(`/api/admin/users/${editUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error ?? "Güncelleme başarısız.");
          return;
        }
        setEditOpen(false);
        fetchUsers();
        router.refresh();
      } catch {
        alert("Güncelleme sırasında hata oluştu.");
      }
    });
  };

  // Save balance
  const saveBalance = async () => {
    if (!balanceUser) return;
    const delta = Number(balanceDelta);
    if (Number.isNaN(delta)) { alert("Geçersiz miktar."); return; }
    startTransition(async () => {
      try {
        const body =
          balanceMode === "add"
            ? { balanceDelta: delta }
            : { balance: Math.max(0, delta) };
        const res = await fetch(`/api/admin/users/${balanceUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error ?? "Bakiye güncelleme başarısız.");
          return;
        }
        setBalanceOpen(false);
        fetchUsers();
        router.refresh();
      } catch {
        alert("Bakiye güncelleme sırasında hata oluştu.");
      }
    });
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deleteUser) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${deleteUser.id}`, { method: "DELETE" });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error ?? "Silme başarısız.");
          return;
        }
        setDeleteOpen(false);
        fetchUsers();
        router.refresh();
      } catch {
        alert("Silme sırasında hata oluştu.");
      }
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Kullanıcı Yönetimi</h1>
        <p className="text-sm text-muted-foreground">
          Kullanıcıları görüntüle, düzenle, bakiye ver, rol ata ve sil.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-4 w-4 text-blue-400" />} label="Toplam Kullanıcı" value={String(total)} />
        <StatCard icon={<ShieldCheck className="h-4 w-4 text-red-400" />} label="Admin" value={String(users.filter((u) => u.role === "ADMIN").length + (roleFilter !== "ALL" && roleFilter !== "ADMIN" ? 0 : 0))} />
        <StatCard icon={<UserCog className="h-4 w-4 text-purple-400" />} label="Bayi" value={String(users.filter((u) => u.role === "RESELLER").length)} />
        <StatCard icon={<Users className="h-4 w-4 text-emerald-400" />} label="Kullanıcı" value={String(users.filter((u) => u.role === "USER").length)} />
      </div>

      {/* Filters */}
      <Card className="border-white/10 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="İsim, e-posta veya kullanıcı adı ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Yenile
              </Button>
            </div>
          </div>
          <Tabs value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
            <TabsList className="bg-muted/50">
              {ROLE_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Yükleniyor...
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Kullanıcı bulunamadı.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Bakiye</TableHead>
                  <TableHead className="text-right">Harcama</TableHead>
                  <TableHead className="text-right">Sipariş</TableHead>
                  <TableHead className="text-right">Ödeme</TableHead>
                  <TableHead className="text-right">Destek</TableHead>
                  <TableHead className="text-right">Kayıt Tarihi</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/40 cursor-pointer">
                    <TableCell onClick={() => openDetail(user)}>
                      <div className="font-medium">{user.name || "İsimsiz"}</div>
                      <div className="text-xs text-muted-foreground">{user.email || "-"}</div>
                      {user.username && (
                        <div className="text-xs text-muted-foreground">@{user.username}</div>
                      )}
                    </TableCell>
                    <TableCell onClick={() => openDetail(user)}>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                          roleBadgeVariant(user.role)
                        )}
                      >
                        {roleLabel(user.role)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm" onClick={() => openDetail(user)}>
                      {fp(Number(user.balance))}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground" onClick={() => openDetail(user)}>
                      {fp(Number(user.spent))}
                    </TableCell>
                    <TableCell className="text-right text-sm" onClick={() => openDetail(user)}>
                      {user._count.orders}
                    </TableCell>
                    <TableCell className="text-right text-sm" onClick={() => openDetail(user)}>
                      {user._count.payments}
                    </TableCell>
                    <TableCell className="text-right text-sm" onClick={() => openDetail(user)}>
                      {user._count.tickets}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground" onClick={() => openDetail(user)}>
                      {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openDetail(user)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Detay Görüntüle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(user)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Düzenle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openBalance(user)}>
                            <Wallet className="mr-2 h-4 w-4" />
                            Bakiye Yönet
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-400 focus:text-red-400"
                            onClick={() => { setDeleteUser(user); setDeleteOpen(true); }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Kullanıcıyı Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {!loading && total > pageSize && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
              <span className="text-sm text-muted-foreground">
                Toplam {total} kullanıcı — Sayfa {page}/{totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Detail Dialog ─────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kullanıcı Detayı</DialogTitle>
            <DialogDescription>
              {detailUser?.email ?? "Yükleniyor..."}
            </DialogDescription>
          </DialogHeader>
          {detailLoading && (
            <div className="flex justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Yükleniyor...
            </div>
          )}
          {detailUser && (
            <div className="space-y-5">
              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoBlock label="Ad Soyad" value={detailUser.name ?? "-"} />
                <InfoBlock label="E-posta" value={detailUser.email ?? "-"} />
                <InfoBlock label="Kullanıcı Adı" value={detailUser.username ? `@${detailUser.username}` : "-"} />
                <InfoBlock label="Telefon" value={detailUser.phone ?? "-"} />
                <InfoBlock
                  label="Rol"
                  value={
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", roleBadgeVariant(detailUser.role))}>
                      {roleLabel(detailUser.role)}
                    </span>
                  }
                />
                <InfoBlock label="Bayi" value={detailUser.parent ? (detailUser.parent.email ?? detailUser.parent.name ?? detailUser.parent.id) : "-"} />
              </div>

              {/* Balance Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <MiniStatCard label="Bakiye" value={fp(Number(detailUser.balance))} color="text-emerald-400" />
                <MiniStatCard label="Toplam Harcama" value={fp(Number(detailUser.spent))} color="text-orange-400" />
                <MiniStatCard label="Hediye Coin (Görev)" value={fp(Number(detailUser.questCoins ?? 0))} color="text-yellow-400" />
                <MiniStatCard label="Siparişler" value={String(detailUser._count.orders)} color="text-blue-400" />
                <MiniStatCard label="Müşteriler" value={String(detailUser._count.customers)} color="text-purple-400" />
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Not: Büyüme görevleri (growth quests) küçük ödül bakiyeleri ödeme alınmadan eklenebilir; bunun kaydı &quot;Hediye Coin (Görev)&quot; alanıdır.
              </p>

              {/* API Key */}
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">API Anahtarı</Label>
                <div className="mt-1 flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                  <code className="text-xs font-mono truncate flex-1">{detailUser.apiKey}</code>
                </div>
              </div>

              {/* Recent Orders */}
              {detailUser.orders.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Son Siparişler</Label>
                  <div className="rounded-lg border border-white/10 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Servis</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead className="text-right">Ücret</TableHead>
                          <TableHead className="text-right">Tarih</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailUser.orders.map((o) => (
                          <TableRow key={o.id}>
                            <TableCell className="text-sm">{o.service.name}</TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1.5 text-xs">
                                <span className={cn("h-2 w-2 rounded-full", orderStatusDot(o.status))} />
                                {orderStatusLabel(o.status)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-sm font-mono">{fp(Number(o.charge))}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {new Date(o.createdAt).toLocaleDateString("tr-TR")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Recent Payments */}
              {detailUser.payments.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Son Ödemeler</Label>
                  <div className="rounded-lg border border-white/10 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Miktar</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead className="text-right">Tarih</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailUser.payments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono text-sm">{fp(Number(p.amount))}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {paymentStatusLabel(p.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {new Date(p.createdAt).toLocaleDateString("tr-TR")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-1">
                Kayıt: {new Date(detailUser.createdAt).toLocaleString("tr-TR")} &nbsp;·&nbsp; Son Güncelleme: {new Date(detailUser.updatedAt).toLocaleString("tr-TR")}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDetailOpen(false); if (detailUser) openEdit(detailUser as unknown as UserSummary); }}>
              <Pencil className="mr-2 h-4 w-4" />
              Düzenle
            </Button>
            <Button variant="outline" onClick={() => { setDetailOpen(false); if (detailUser) openBalance(detailUser as unknown as UserSummary); }}>
              <Wallet className="mr-2 h-4 w-4" />
              Bakiye
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ───────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kullanıcıyı Düzenle</DialogTitle>
            <DialogDescription>{editUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ad Soyad</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Ad Soyad" />
              </div>
              <div className="space-y-1.5">
                <Label>Kullanıcı Adı</Label>
                <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="username" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>E-posta</Label>
              <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="email@example.com" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+90 5XX XXX XX XX" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as Role)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="USER">Kullanıcı</option>
                  <option value="RESELLER">Bayi</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Bayi Bağlantısı</Label>
                <select
                  value={editParentId || "__none__"}
                  onChange={(e) => setEditParentId(e.target.value === "__none__" ? "" : e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="__none__">— Yok —</option>
                  {resellers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.email ?? r.name ?? r.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>İptal</Button>
            <Button onClick={saveEdit} disabled={isPending}>
              {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Balance Dialog ────────────────────────────────────────────── */}
      <Dialog open={balanceOpen} onOpenChange={setBalanceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bakiye Yönetimi</DialogTitle>
            <DialogDescription>
              {balanceUser?.name ?? balanceUser?.email} — Mevcut Bakiye:{" "}
              <span className="font-semibold text-emerald-400">{balanceUser ? fp(Number(balanceUser.balance)) : ""}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={balanceMode === "add" ? "default" : "outline"}
                size="sm"
                onClick={() => setBalanceMode("add")}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Ekle / Çıkar
              </Button>
              <Button
                variant={balanceMode === "set" ? "default" : "outline"}
                size="sm"
                onClick={() => setBalanceMode("set")}
                className="flex-1"
              >
                <CreditCard className="h-4 w-4 mr-1.5" />
                Bakiyeyi Ayarla
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>
                {balanceMode === "add"
                  ? "Miktar (pozitif = ekle, negatif = çıkar)"
                  : "Yeni Bakiye"}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₺</span>
                <Input
                  className="pl-7 font-mono"
                  placeholder={balanceMode === "add" ? "örn: 50 veya -20" : "örn: 150"}
                  value={balanceDelta}
                  onChange={(e) => setBalanceDelta(e.target.value)}
                  type="number"
                  step="0.01"
                />
              </div>
              {balanceMode === "add" && balanceDelta && !Number.isNaN(Number(balanceDelta)) && balanceUser && (
                <p className="text-xs text-muted-foreground">
                  Yeni bakiye:{" "}
                  <span className="font-semibold text-foreground">
                    {fp(Math.max(0, Number(balanceUser.balance) + Number(balanceDelta)))}
                  </span>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceOpen(false)}>İptal</Button>
            <Button onClick={saveBalance} disabled={isPending || !balanceDelta}>
              {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              {balanceMode === "add" ? (Number(balanceDelta) >= 0 ? "Ekle" : "Çıkar") : "Ayarla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialog ─────────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">Kullanıcıyı Sil</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. <strong>{deleteUser?.name ?? deleteUser?.email}</strong> adlı kullanıcıyı ve tüm ilişkili verilerini silmek istediğinizden emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>İptal</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
              {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Evet, Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="border-white/10">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted/50">{icon}</div>
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-xl font-bold">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-muted/30 px-3 py-3">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={cn("text-lg font-bold", color)}>{value}</div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
