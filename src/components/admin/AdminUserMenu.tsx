"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/actions/auth-actions";
import {
  LayoutDashboard, Globe, LogOut, ChevronDown,
  User, CreditCard, ExternalLink,
} from "lucide-react";

interface Props {
  name: string;
  image?: string | null;
  initials: string;
}

export function AdminUserMenu({ name, image, initials }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="flex items-center gap-2.5 pl-4 border-l border-border hover:opacity-80 transition-opacity outline-none">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold leading-none text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground mt-1 lowercase">@admin</p>
        </div>
        <Avatar className="h-9 w-9 border border-primary/20">
          <AvatarImage src={image || undefined} />
          <AvatarFallback>{initials || "AD"}</AvatarFallback>
        </Avatar>
        <ChevronDown size={14} className="text-muted-foreground hidden sm:block" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 p-1.5 border border-white/[0.08] bg-card shadow-xl rounded-2xl"
      >
        {/* User info */}
        <div className="px-3 py-2.5 mb-1">
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">Yönetici</p>
        </div>

        <div className="border-t border-white/[0.06] my-1" />

        {/* Quick links */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-slate-300 hover:bg-white/[0.05] hover:text-slate-100 transition-colors"
          onClick={() => setOpen(false)}
        >
          <LayoutDashboard size={14} className="text-primary" />
          <span>Kullanıcı Paneli</span>
        </Link>

        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-slate-300 hover:bg-white/[0.05] hover:text-slate-100 transition-colors"
          onClick={() => setOpen(false)}
        >
          <Globe size={14} className="text-sky-400" />
          <span>Ana Siteye Git</span>
          <ExternalLink size={11} className="ml-auto text-muted-foreground" />
        </Link>

        <Link
          href="/admin/finance"
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-slate-300 hover:bg-white/[0.05] hover:text-slate-100 transition-colors"
          onClick={() => setOpen(false)}
        >
          <CreditCard size={14} className="text-emerald-400" />
          <span>Finans / Ödemeler</span>
        </Link>

        <Link
          href="/admin/settings"
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-slate-300 hover:bg-white/[0.05] hover:text-slate-100 transition-colors"
          onClick={() => setOpen(false)}
        >
          <User size={14} className="text-slate-400" />
          <span>Hesap Ayarları</span>
        </Link>

        <div className="border-t border-white/[0.06] my-1" />

        <button
          onClick={async () => { setOpen(false); await logout(); }}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <LogOut size={14} />
          <span>Çıkış Yap</span>
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
