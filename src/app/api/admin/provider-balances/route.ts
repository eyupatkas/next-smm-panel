import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providers = await db.provider.findMany({
    where: { status: true },
    select: { id: true, name: true, balance: true, baseCurrency: true, updatedAt: true, apiUrl: true, apiKey: true },
    orderBy: { name: "asc" },
  });

  // Fetch live balances from each provider API in parallel
  const results = await Promise.allSettled(
    providers.map(async (p) => {
      const res = await fetch(p.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ key: p.apiKey, action: "balance" }).toString(),
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { balance?: string | number };
      const balance = data.balance !== undefined ? parseFloat(String(data.balance)) : null;
      if (balance === null || isNaN(balance)) throw new Error("No balance in response");

      // Persist to DB
      await db.provider.update({ where: { id: p.id }, data: { balance } });

      return { id: p.id, balance };
    })
  );

  // Merge live balances into response
  const balanceMap = new Map<string, number>();
  results.forEach((r, i) => {
    if (r.status === "fulfilled") balanceMap.set(providers[i].id, r.value.balance);
  });

  return NextResponse.json(
    providers.map((p) => ({
      id: p.id,
      name: p.name,
      baseCurrency: p.baseCurrency,
      updatedAt: balanceMap.has(p.id) ? new Date().toISOString() : p.updatedAt.toISOString(),
      balance: balanceMap.get(p.id) ?? p.balance,
      error: results[providers.indexOf(p)]?.status === "rejected"
        ? (results[providers.indexOf(p)] as PromiseRejectedResult).reason?.message
        : undefined,
    }))
  );
}
