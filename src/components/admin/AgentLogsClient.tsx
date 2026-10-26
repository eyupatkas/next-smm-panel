"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Calendar, CheckCircle2, XCircle, Play, ChevronDown, ChevronUp, Cpu, Activity, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type JobRunItem = {
  id: string;
  jobName: string;
  status: string;
  trigger: string;
  details: string | null;
  startedAt: Date;
  finishedAt: Date | null;
};

export function AgentLogsClient({ 
  initialRuns,
  currentInterval
}: { 
  initialRuns: JobRunItem[];
  currentInterval: number;
}) {
  const router = useRouter();
  const [runs, setRuns] = useState<JobRunItem[]>(initialRuns);
  
  useEffect(() => {
    setRuns(initialRuns);
  }, [initialRuns]);
  
  const [triggering, setTriggering] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const [intervalVal, setIntervalVal] = useState(currentInterval);
  const [savingInterval, setSavingInterval] = useState(false);

  // Auto-refresh when a job is RUNNING
  const isAnyRunning = runs.some((r) => r.status === "RUNNING");
  
  // Custom hook for interval
  useEffect(() => {
    if (!isAnyRunning) return;
    
    const timer = setInterval(() => {
      router.refresh();
    }, 5000);
    
    return () => clearInterval(timer);
  }, [isAnyRunning, router]);

  // Otonom sistemi manuel tetikleme
  const handleTriggerAgents = async () => {
    setTriggering(true);
    const toastId = toast.loading("Otonom SMM Ajanları çalıştırılıyor...");
    try {
      const res = await fetch("/api/cron/autonomous-agent", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Ajan sistemi başarıyla çalıştı ve loglar veritabanına işlendi.", { id: toastId });
        router.refresh();
      } else {
        throw new Error(data.error || "Ajan sistemi çalıştırılamadı.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tetikleme sırasında hata oluştu.", { id: toastId });
    } finally {
      setTriggering(false);
    }
  };

  // Planlayıcı periyodunu kaydet
  const handleSaveInterval = async () => {
    setSavingInterval(true);
    const toastId = toast.loading("Planlama periyodu güncelleniyor...");
    try {
      const res = await fetch("/api/admin/settings/agent-interval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: intervalVal }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Çalışma sıklığı başarıyla kaydedildi.", { id: toastId });
        router.refresh();
      } else {
        throw new Error(data.error || "Ayar kaydedilemedi.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sistem hatası.", { id: toastId });
    } finally {
      setSavingInterval(false);
    }
  };

  const formatIntervalText = (minutes: number) => {
    if (minutes === 10) return "Her 10 Dakikada Bir";
    if (minutes % 60 === 0) {
      const hours = minutes / 60;
      return `Her ${hours} Saatte Bir`;
    }
    return `Her ${minutes} Dakikada Bir`;
  };


  const getDurationText = (start: Date, end: Date | null) => {
    if (!end) return "-";
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const diffSec = Math.round(diffMs / 1000);
    return `${diffSec} saniye`;
  };

  const parseDetails = (detailsStr: string | null) => {
    if (!detailsStr) return null;
    try {
      return JSON.parse(detailsStr);
    } catch (e) {
      return { raw: detailsStr };
    }
  };

  // Stats hesaplamaları
  const totalRuns = runs.length;
  const successRuns = runs.filter((r) => r.status === "SUCCESS").length;
  const successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 100;
  const lastRun = runs[0];

  return (
    <div className="space-y-6">
      {/* Üst Kartlar / İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Toplam Çalışma</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-0.5">{totalRuns} kez</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Başarı Oranı</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-0.5">%{successRate}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Son Tetiklenme</p>
              <h3 className="text-sm font-semibold text-slate-100 mt-1 truncate max-w-[150px]">
                {lastRun ? new Date(lastRun.startedAt).toLocaleTimeString() : "-"}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Planlayıcı Periyodu</p>
              <h3 className="text-sm font-semibold text-slate-100 mt-1">{formatIntervalText(intervalVal)}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kontrol Paneli Eylemleri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sol Eylem: Manuel Tetikleyici */}
        <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div>
            <h4 className="font-semibold text-slate-200">Otonom Ajan Tetikleyici</h4>
            <p className="text-xs text-slate-400">Tüm alt SMM ajanlarını anlık manuel tetikleyin.</p>
          </div>
          <Button
            onClick={handleTriggerAgents}
            disabled={triggering || isAnyRunning}
            className="bg-violet-600 hover:bg-violet-750 text-white font-medium px-4 py-2 rounded-lg flex items-center space-x-2 shrink-0"
          >
            <Play className="h-4 w-4" />
            <span>{triggering || isAnyRunning ? "Çalışıyor..." : "Ajanları Çalıştır"}</span>
          </Button>
        </div>

        {/* Sağ Eylem: Periyot Ayarı */}
        <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div>
            <h4 className="font-semibold text-slate-200">Sıklık Ayarı</h4>
            <p className="text-xs text-slate-400">Planlayıcı çalışma süresini dakika olarak güncelleyin.</p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <input
              type="number"
              min="1"
              value={intervalVal}
              onChange={(e) => setIntervalVal(Number(e.target.value))}
              className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-violet-500 text-center font-bold"
            />
            <Button
              onClick={handleSaveInterval}
              disabled={savingInterval || intervalVal === currentInterval || intervalVal <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg"
            >
              {savingInterval ? "..." : "Kaydet"}
            </Button>
          </div>
        </div>
      </div>

      {/* Log Tablosu */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-slate-100">Çalışma Günlükleri (Son 50 Çalışma)</h3>
        </div>
        <div className="divide-y divide-slate-800">
          {runs.length === 0 ? (
            <div className="p-6 text-center text-slate-500">Kayıtlı otonom ajan çalışması bulunamadı.</div>
          ) : (
            runs.map((run) => {
              const isExpanded = expandedRunId === run.id;
              const details = parseDetails(run.details);

              return (
                <div key={run.id} className="transition duration-200 hover:bg-slate-900/40">
                  {/* Başlık Satırı */}
                  <div
                    onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                    className="px-6 py-4 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center space-x-4">
                      {run.status === "SUCCESS" && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      )}
                      {run.status === "FAILED" && (
                        <XCircle className="h-5 w-5 text-rose-400" />
                      )}
                      {run.status === "RUNNING" && (
                        <Activity className="h-5 w-5 animate-spin text-amber-400" />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-200 text-sm">
                            Otonom SMM Ajan Sistemi Çalışması
                          </span>
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                            run.trigger === "MANUAL" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                          )}>
                            {run.trigger}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(run.startedAt).toLocaleString("tr-TR")}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right text-xs text-slate-400">
                        <div>Süre: {getDurationText(run.startedAt, run.finishedAt)}</div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Detay Log Paneli */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 bg-slate-950/40 border-t border-slate-800/60 space-y-4">
                      {details ? (
                        <div className="space-y-4">
                          {/* Özet Loglar */}
                          {details.summaryLogs && (
                            <div className="space-y-1.5">
                              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Ajan Akış Özeti</h4>
                              <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-violet-300 border border-slate-850 max-h-40 overflow-y-auto space-y-1">
                                {details.summaryLogs.map((log: string, lIdx: number) => (
                                  <div key={lIdx}>{log}</div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Alt Ajan Logları */}
                          {details.agents && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Güvenlik Ajanı */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                                    <Shield className="h-3.5 w-3.5 text-blue-400" />
                                    <span>1. Güvenlik Ajanı</span>
                                  </h4>
                                  <span className={cn("text-[10px] font-bold uppercase", details.agents.fraud?.success ? "text-emerald-400" : "text-rose-400")}>
                                    {details.agents.fraud?.success ? "Aktif / Başarılı" : "Hata"}
                                  </span>
                                </div>
                                <div className="bg-slate-950 p-3 rounded-xl font-mono text-xs text-slate-300 border border-slate-850 h-44 overflow-y-auto space-y-1 [scrollbar-width:thin]">
                                  {details.agents.fraud?.logs && details.agents.fraud.logs.length > 0 ? (
                                    details.agents.fraud.logs.map((log: string, lIdx: number) => (
                                      <div key={lIdx} className={cn(log.includes("ASKIYA ALINDI") || log.includes("Şüpheli") ? "text-rose-400" : "text-slate-400")}>
                                        {log}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-slate-500">Log kaydı yok.</div>
                                  )}
                                </div>
                              </div>

                              {/* Tedarikçi / Fiyat Ajanı */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                                    <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                                    <span>2. Tedarikçi & Fiyat Ajanı</span>
                                  </h4>
                                  <span className={cn("text-[10px] font-bold uppercase", details.agents.service?.success ? "text-emerald-400" : "text-rose-400")}>
                                    {details.agents.service?.success ? "Aktif / Başarılı" : "Hata"}
                                  </span>
                                </div>
                                <div className="bg-slate-950 p-3 rounded-xl font-mono text-xs text-slate-300 border border-slate-850 h-44 overflow-y-auto space-y-1 [scrollbar-width:thin]">
                                  {details.agents.service?.logs && details.agents.service.logs.length > 0 ? (
                                    details.agents.service.logs.map((log: string, lIdx: number) => (
                                      <div key={lIdx} className={cn(log.includes("[Fiyat Güncelleme]") ? "text-emerald-400" : "text-slate-400")}>
                                        {log}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-slate-500">Log kaydı yok.</div>
                                  )}
                                </div>
                              </div>

                              {/* Müşteri Destek Ajanı */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                                    <Activity className="h-3.5 w-3.5 text-amber-400" />
                                    <span>3. Müşteri Destek Ajanı</span>
                                  </h4>
                                  <span className={cn("text-[10px] font-bold uppercase", details.agents.support?.success ? "text-emerald-400" : "text-rose-400")}>
                                    {details.agents.support?.success ? "Aktif / Başarılı" : "Hata"}
                                  </span>
                                </div>
                                <div className="bg-slate-950 p-3 rounded-xl font-mono text-xs text-slate-300 border border-slate-850 h-44 overflow-y-auto space-y-1 [scrollbar-width:thin]">
                                  {details.agents.support?.logs && details.agents.support.logs.length > 0 ? (
                                    details.agents.support.logs.map((log: string, lIdx: number) => (
                                      <div key={lIdx} className={cn(log.includes("İPTAL EDİLDİ") || log.includes("İADE EDİLDİ") ? "text-amber-400" : "text-slate-400")}>
                                        {log}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-slate-500">Log kaydı yok.</div>
                                  )}
                                </div>
                              </div>

                              {/* SEO Ajanı */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                                    <Sparkles className="h-3.5 w-3.5 text-pink-400" />
                                    <span>4. SEO & Blog Ajanı</span>
                                  </h4>
                                  <span className={cn("text-[10px] font-bold uppercase", details.agents.seo?.success ? "text-emerald-400" : "text-rose-400")}>
                                    {details.agents.seo?.success ? "Aktif / Başarılı" : "Hata"}
                                  </span>
                                </div>
                                <div className="bg-slate-950 p-3 rounded-xl font-mono text-xs text-slate-300 border border-slate-850 h-44 overflow-y-auto space-y-1 [scrollbar-width:thin]">
                                  {details.agents.seo?.logs && details.agents.seo.logs.length > 0 ? (
                                    details.agents.seo.logs.map((log: string, lIdx: number) => (
                                      <div key={lIdx} className={cn(log.includes("Makale yazılıyor") || log.includes("BAŞARILI") ? "text-pink-400" : "text-slate-400")}>
                                        {log}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-slate-500">Log kaydı yok.</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-500 text-xs">Detay log bulunamadı.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
