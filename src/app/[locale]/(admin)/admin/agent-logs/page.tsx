import { db } from "@/lib/db";
import { AgentLogsClient } from "@/components/admin/AgentLogsClient";

export default async function AdminAgentLogsPage() {
  const [runs, intervalSetting] = await Promise.all([
    db.jobRun.findMany({
      where: {
        jobName: "autonomous-agent",
      },
      orderBy: {
        startedAt: "desc",
      },
      take: 50,
    }),
    db.setting.findUnique({
      where: { key: "autonomous_agent_interval_minutes" },
    }),
  ]);

  const currentInterval = intervalSetting ? parseInt(intervalSetting.value, 10) : 180;

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">Otonom Ajan Yönetimi</h1>
        <p className="text-slate-400 text-xs sm:text-sm">
          Yapay zeka SMM panel otonom ajanlarının (Fraud, Fiyatlandırma, Müşteri İlişkileri, SEO) kararlarını ve sistem loglarını buradan izleyebilirsiniz.
        </p>
      </div>

      <AgentLogsClient initialRuns={runs} currentInterval={currentInterval} />
    </div>
  );
}
