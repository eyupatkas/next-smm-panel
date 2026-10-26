import { NextResponse } from "next/server";
import { getLiveCurrencyRates } from "@/lib/exchange-rates";

export async function GET() {
  const rates = await getLiveCurrencyRates();
  return NextResponse.json({ base: "TRY", rates });
}