"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Terminal, Calendar, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import { toast } from "sonner";

type JobRun = {
  id: string;
  jobName: string;
  status: string;
  trigger: string;
  scanned: number;
  synced: number;
  sent: number;
  failures: number;
  refundedTotal: number;
  details: string | null;
  startedAt: string;
  finishedAt: string | null;
};

type LogsResponse = {
  success: boolean;
  logType: string;
  logs: string[];
  jobRuns: JobRun[];
};

export default function AdminLogsPage() {
  const [logType, setLogType] = useState<"error" | "out">("error");
  const [logs, setLogs] = useState<string[]>([]);
  const [jobRuns, setJobRuns] = useState<JobRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchLogs(type: "error" | "out", showToast = false) {
    if (showToast) setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/logs?type=${type}&limit=150`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Loglar yüklenemedi.");
      }
      const data = (await res.json()) as LogsResponse;
      if (data.success) {
        setLogs(data.logs);
        setJobRuns(data.jobRuns);
        if (showToast) toast.success("Sistem günlükleri güncellendi.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void fetchLogs(logType);
  }, [logType]);

  const handleRefresh = () => {
    void fetchLogs(logType, true);
  };

  // Log satırlarını renklendiren yardımcı fonksiyon
  const getLineStyle = (line: string) => {
    const lower = line.toLowerCase();
    if (lower.includes("error") || lower.includes("fail") || lower.includes("exception") || lower.includes("critical")) {
      return "text-rose-400 font-semibold";
    }
    if (lower.includes("warn") || lower.includes("alert")) {
      return "text-amber-400";
    }
    if (lower.includes("success") || lower.includes("ok") || lower.includes("completed")) {
      return "text-emerald-400";
    }
    return "text-slate-300";
  };

  const getJobStatusBadge = (status: string) => {
    if (status === "SUCCESS" || status === "COMPLETED") {
      return <Badge variant="default" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/25">BAŞARILI</Badge>;
    }
    if (status === "FAILED") {
      return <Badge variant="destructive">BAŞARISIZ</Badge>;
    }
    return <Badge variant="secondary">ÇALIŞIYOR</Badge>;
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6 animate-in fade-in duration-300">
      
      {/* Üst Kısım */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Activity className="text-primary" /> Sistem Günlükleri & Görevler
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sunucu hata günlüklerini (error.log), standart çıktıları (out.log) ve cron görevlerinin durumunu anlık olarak izleyin.
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing} 
          className="gap-2 cursor-pointer rounded-xl h-11 px-5 shadow-lg shadow-primary/10"
        >
          {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Tazele
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Sol Panel: JobRun (Son 20 Görev) */}
        <div className="xl:col-span-1 space-y-6">
          <Card className="border-primary/10 bg-card/40 backdrop-blur-md shadow-xl rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Calendar size={18} className="text-primary" />
                Arka Plan Görevleri (Cron)
              </CardTitle>
              <CardDescription>
                Sistem tarafından otomatik yürütülen son senkronizasyon ve bakım işleri.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : jobRuns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Kayıtlı görev geçmişi bulunamadı.</p>
              ) : (
                jobRuns.map((job) => (
                  <div key={job.id} className="flex flex-col p-4 rounded-xl border border-border bg-card/60 space-y-2.5 transition-all hover:bg-card">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm tracking-tight">{job.jobName}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Tetikleme: {job.trigger} · #{job.id.slice(-6).toUpperCase()}
                        </p>
                      </div>
                      {getJobStatusBadge(job.status)}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-b border-border/40 py-2 my-1">
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase font-semibold">Taranan</p>
                        <p className="font-bold text-foreground mt-0.5">{job.scanned}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase font-semibold">Senkron</p>
                        <p className="font-bold text-emerald-400 mt-0.5">{job.synced}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase font-semibold">Hata</p>
                        <p className={`font-bold mt-0.5 ${job.failures > 0 ? "text-rose-400" : "text-foreground"}`}>{job.failures}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>Başlangıç: {new Date(job.startedAt).toLocaleTimeString("tr-TR")}</span>
                      {job.finishedAt && (
                        <span>
                          Süre: {Math.max(0, Math.floor((new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime()) / 1000))} sn
                        </span>
                      )}
                    </div>
                    {job.details && (
                      <p className="text-[11px] bg-muted/30 p-2.5 rounded-lg text-slate-300 font-mono break-all line-clamp-2">
                        {job.details}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sağ Panel: Terminal / Log Çıktıları */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-primary/10 bg-card/30 backdrop-blur-md shadow-xl rounded-2xl flex flex-col h-[85vh] overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/40">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Terminal size={18} className="text-primary" />
                  Terminal Günlükleri (console)
                </CardTitle>
                <CardDescription>
                  Sunucu çıktılarından veya yakalanan hatalardan son 150 satır.
                </CardDescription>
              </div>

              {/* Tab/Buton Seçimi */}
              <div className="flex bg-muted/60 p-1 rounded-xl border border-border/60 shrink-0">
                <button
                  onClick={() => setLogType("error")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    logType === "error" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Hata Logları (error)
                </button>
                <button
                  onClick={() => setLogType("out")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    logType === "out" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sistem Çıktısı (out)
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <div className="bg-[#0f172a] font-mono text-xs p-5 h-full overflow-y-auto leading-relaxed select-text space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 size={32} className="animate-spin text-primary" />
                  </div>
                ) : logs.length === 0 ? (
                  <p className="text-slate-500 text-center py-12">Log dosyası boş veya henüz girdi eklenmemiş.</p>
                ) : (
                  logs.map((line, index) => (
                    <div key={index} className={`whitespace-pre-wrap py-0.5 border-b border-slate-900/40 hover:bg-slate-800/10 ${getLineStyle(line)}`}>
                      <span className="text-slate-600 select-none mr-3 inline-block w-8 text-right">
                        {logs.length - index}
                      </span>
                      {line}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

    </div>
  );
}
