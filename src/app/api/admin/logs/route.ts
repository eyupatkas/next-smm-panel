import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

// Sadece logs klasöründen dosya okunmasına izin ver
const LOGS_DIR = path.join(process.cwd(), "logs");

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const logType = searchParams.get("type") || "error"; // error veya out
    const limit = Math.min(Number(searchParams.get("limit") || 100), 500);

    const logFileName = logType === "out" ? "out.log" : "error.log";
    const logFilePath = path.join(LOGS_DIR, logFileName);

    let logLines: string[] = [];

    if (fs.existsSync(logFilePath)) {
      const content = fs.readFileSync(logFilePath, "utf-8");
      // Son satırları almak için ters çevir
      const allLines = content.split("\n").filter(line => line.trim().length > 0);
      logLines = allLines.slice(-limit).reverse();
    } else {
      logLines = [`[Sistem] ${logFileName} dosyası henüz oluşturulmamış.`];
    }

    // Ek olarak son JobRun kayıtlarını da çekelim
    const jobRuns = await db.jobRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      logType,
      logs: logLines,
      jobRuns,
    });
  } catch (error) {
    console.error("[Admin Logs API] Hata:", error);
    return NextResponse.json({ error: "Sistem logları okunurken bir hata oluştu." }, { status: 500 });
  }
}
