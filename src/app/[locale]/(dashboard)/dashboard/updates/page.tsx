import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Plus, ArrowUp, Power, PowerOff, Sparkles } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getPlatformIcon } from "@/lib/platform-icons";

export default async function UpdatesPage() {
  const locale = await getLocale();
  const t = await getTranslations("updatesPage");

  const updates = await db.serviceUpdate.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const changeTypeConfig: Record<
    string,
    { label: string; color: string; icon: React.ReactNode; glow: string }
  > = {
    NEW: {
      label: t("changeNEW") || "Yeni Servis",
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      glow: "shadow-emerald-500/5 border-emerald-500/10",
      icon: <Plus size={13} className="stroke-[3]" />,
    },
    DISABLED: {
      label: t("changeDISABLED") || "Pasif Edildi",
      color: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      glow: "shadow-rose-500/5 border-rose-500/10",
      icon: <PowerOff size={13} className="stroke-[3]" />,
    },
    ENABLED: {
      label: t("changeENABLED") || "Aktif Edildi",
      color: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      glow: "shadow-sky-500/5 border-sky-500/10",
      icon: <Power size={13} className="stroke-[3]" />,
    },
    PRICE_CHANGE: {
      label: t("changePRICE_CHANGE") || "Fiyat Değişimi",
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      glow: "shadow-amber-500/5 border-amber-500/10",
      icon: <ArrowUp size={13} className="stroke-[3]" />,
    },
    UPDATED: {
      label: t("changeUPDATED") || "Güncellendi",
      color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      glow: "shadow-violet-500/5 border-violet-500/10",
      icon: <RefreshCw size={13} className="stroke-[3]" />,
    },
  };

  // Group by date
  const grouped = updates.reduce<Record<string, typeof updates>>((acc, update) => {
    const date = update.createdAt.toISOString().split("T")[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(update);
    return acc;
  }, {});

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Premium Hero Header */}
      <div className="relative rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.15),transparent_40%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.75))] p-8 shadow-2xl shadow-violet-500/5 overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-400 flex items-center gap-2">
            <Sparkles size={12} className="animate-pulse" /> {t("title")}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card className="border-white/5 bg-white/[0.02] backdrop-blur-md">
          <CardContent className="py-16 text-center">
            <RefreshCw size={44} className="mx-auto text-muted-foreground/20 animate-spin duration-1000 mb-4" />
            <p className="text-muted-foreground font-medium">{t("noUpdates") || "Henüz güncelleme bulunmuyor."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative border-l border-white/10 pl-6 ml-4 space-y-10">
          {Object.entries(grouped).map(([date, dateUpdates]) => (
            <div key={date} className="relative space-y-4">
              {/* Timeline Dot & Date Badge */}
              <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#09090b] border-2 border-violet-500 ring-4 ring-violet-500/10" />
              
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="px-3 py-1 text-xs font-semibold bg-white/5 border-white/10 shadow-sm text-foreground">
                  {new Date(date).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">
                  {t("countUpdates", { count: dateUpdates.length })}
                </span>
              </div>

              {/* Updates Cards Stack */}
              <div className="grid gap-3.5">
                {dateUpdates.map((update) => {
                  const config = changeTypeConfig[update.changeType] || changeTypeConfig.UPDATED;
                  const platformIcon = getPlatformIcon(update.category || "", "sm");

                  return (
                    <div
                      key={update.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border bg-gradient-to-br from-card/85 to-card/50 shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-[1.01] hover:border-white/10 ${config.glow}`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Status Badge */}
                        <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
                          {config.icon}
                          {config.label}
                        </div>

                        {/* Service & Category info */}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-1">
                            {update.serviceName}
                          </p>
                          {update.category && (
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 font-medium">
                              <span className="opacity-70 shrink-0">{platformIcon}</span>
                              <span className="truncate">{update.category}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Change description / Price information */}
                      <div className="sm:text-right shrink-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                        <span className="inline-flex items-center text-xs font-medium bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-muted-foreground max-w-full break-all">
                          {update.description}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
