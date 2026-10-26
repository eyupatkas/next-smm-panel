"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bell, CheckCheck, Users, ShoppingCart, HelpCircle, Dot } from "lucide-react";
import { Button } from "@/components/ui/button";import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead } from "@/lib/actions/notification-actions";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
};

type Stats = {
  newUsersToday: number;
  openTickets: number;
  pendingOrders: number;
};

type Props = {
  notifications: Notification[];
  stats: Stats;
};

const TYPE_ICON: Record<string, typeof Bell> = {
  ORDER_UPDATE: ShoppingCart,
  TICKET: HelpCircle,
  USER: Users,
};

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "şimdi";
  if (diff < 3600) return `${Math.floor(diff / 60)}dk`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}sa`;
  return `${Math.floor(diff / 86400)}g`;
}

export function AdminNotificationBell({ notifications, stats }: Props) {
  const [open, setOpen] = useState(false);
  const [localNotifs, setLocalNotifs] = useState(notifications);
  const [, start] = useTransition();

  const unreadCount = localNotifs.filter((n) => !n.read).length;
  const hasActivity = stats.newUsersToday > 0 || stats.openTickets > 0 || stats.pendingOrders > 0;

  function handleMarkAll() {
    start(async () => {
      await markAllNotificationsRead();
      setLocalNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors">
        <Bell size={20} />
        {(unreadCount > 0 || hasActivity) && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(24rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] p-0 border border-white/[0.08] bg-card shadow-xl rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="font-semibold text-sm">Bildirimler</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs h-7 text-muted-foreground hover:text-foreground"
              onClick={handleMarkAll}
            >
              <CheckCheck size={13} /> Tümünü okundu say
            </Button>
          )}
        </div>

        {/* Site activity stats */}
        <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-b border-white/[0.06]">
          <div className="p-3 text-center">
            <p className="text-lg font-bold text-blue-400">{stats.newUsersToday}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-0.5">
              <Users size={10} /> Yeni Üye
            </p>
          </div>
          <div className="p-3 text-center">
            <p className="text-lg font-bold text-amber-400">{stats.openTickets}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-0.5">
              <HelpCircle size={10} /> Açık Bilet
            </p>
          </div>
          <div className="p-3 text-center">
            <p className="text-lg font-bold text-violet-400">{stats.pendingOrders}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-0.5">
              <ShoppingCart size={10} /> Bekleyen
            </p>
          </div>
        </div>

        {/* Notifications list */}
        <div className="max-h-72 overflow-y-auto">
          {localNotifs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Bell size={28} className="mx-auto mb-2 opacity-20" />
              Bildirim yok
            </div>
          ) : (
            localNotifs.slice(0, 10).map((notif) => {
              const Icon = TYPE_ICON[notif.type] ?? Bell;
              return (
                <a
                  key={notif.id}
                  href={notif.link ?? "#"}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors last:border-0",
                    !notif.read && "bg-blue-500/[0.04]"
                  )}
                  onClick={() => setOpen(false)}
                >
                  <div className={cn(
                    "mt-0.5 p-1.5 rounded-lg shrink-0",
                    notif.read ? "bg-white/[0.04] text-muted-foreground" : "bg-blue-500/15 text-blue-400"
                  )}>
                    <Icon size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-medium truncate", !notif.read && "text-foreground")}>
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground/60">{relativeTime(notif.createdAt)}</span>
                    {!notif.read && <Dot size={16} className="text-blue-400 -mr-1" />}
                  </div>
                </a>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-white/[0.06]">
          <Link
            href="/admin/notifications"
            className="text-xs text-center block text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setOpen(false)}
          >
            Tüm bildirimleri gör →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
