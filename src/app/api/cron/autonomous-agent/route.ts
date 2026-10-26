import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { executeAutonomousAgentSystem } from "@/lib/agents/agent-manager";
import { db } from "@/lib/db";

function isAuthorizedBySecret(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const provided = request.headers.get("x-cron-key");
  return Boolean(provided && expected === provided);
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  if (!isAdmin && !isAuthorizedBySecret(request)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const startTime = new Date();
  let runningJobId: string | null = null;

  try {
    const runningJob = await db.jobRun.create({
      data: {
        jobName: "autonomous-agent",
        status: "RUNNING",
        trigger: isAdmin ? "MANUAL" : "CRON",
        startedAt: startTime,
      },
    });
    runningJobId = runningJob.id;

    const result = await executeAutonomousAgentSystem();

    // Sonucu JobRun tablosuna güncelle
    await db.jobRun.update({
      where: { id: runningJobId },
      data: {
        status: result.success ? "SUCCESS" : "FAILED",
        details: JSON.stringify({
          agents: result.agents,
          summaryLogs: result.summaryLogs,
        }),
        finishedAt: new Date(),
      },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[Autonomous Agent API] Error:", error);

    // Hatayı da JobRun tablosuna kaydet
    try {
      if (runningJobId) {
        await db.jobRun.update({
          where: { id: runningJobId },
          data: {
            status: "FAILED",
            details: JSON.stringify({
              error: error instanceof Error ? error.message : "Bilinmeyen hata oluştu",
            }),
            finishedAt: new Date(),
          },
        });
      }
    } catch (dbErr) {
      console.error("[Autonomous Agent API] Failed to write failure log to DB:", dbErr);
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}

export { GET as POST };
