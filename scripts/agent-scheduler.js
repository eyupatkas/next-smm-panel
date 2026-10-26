const fs = require("fs");
const path = require("path");
const http = require("http");

const envPath = path.join(__dirname, "../.env");
require("dotenv").config({ path: envPath });

const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PORT = process.env.PORT || 3030;
const CRON_SECRET = process.env.CRON_SECRET || "";

console.log(`[Agent Scheduler] Başlatıldı.`);
console.log(`[Agent Scheduler] Port: ${PORT}`);

async function triggerAgent() {
  console.log(`\n[Agent Scheduler] [${new Date().toLocaleString("tr-TR")}] Otonom ajan tetikleniyor...`);

  const options = {
    hostname: "127.0.0.1",
    port: PORT,
    path: "/api/cron/autonomous-agent",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-key": CRON_SECRET,
    },
  };

  const req = http.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });
    res.on("end", () => {
      console.log(`[Agent Scheduler] HTTP Yanıt Kodu: ${res.statusCode}`);
      try {
        const parsed = JSON.parse(data);
        console.log(`[Agent Scheduler] Sonuç:`, JSON.stringify(parsed, null, 2));
      } catch {
        console.log(`[Agent Scheduler] Ham Yanıt:`, data.slice(0, 300));
      }
      
      // Bir sonraki adımı planla
      scheduleNextRun();
    });
  });

  req.on("error", (err) => {
    console.error(`[Agent Scheduler] İstek Hatası:`, err.message);
    
    // Hata olsa dahi döngüyü kesmemek için bir sonraki adımı planla
    scheduleNextRun();
  });

  req.end();
}

async function scheduleNextRun() {
  let intervalMinutes = 180; // Varsayılan 3 saat (180 dakika)
  
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "autonomous_agent_interval_minutes" },
    });
    if (setting && setting.value) {
      const parsed = parseInt(setting.value, 10);
      if (!isNaN(parsed) && parsed > 0) {
        intervalMinutes = parsed;
      }
    }
  } catch (err) {
    console.error("[Agent Scheduler] Veritabanı okuma hatası, varsayılan 180dk kullanılıyor:", err.message);
  }

  console.log(`[Agent Scheduler] Bir sonraki tetikleme ${intervalMinutes} dakika sonra gerçekleşecek.`);
  setTimeout(triggerAgent, intervalMinutes * 60 * 1000);
}

// Hemen ilk tetiklemeyi yap
triggerAgent();
