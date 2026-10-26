import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/admin-action-helpers";
import { fetchProviderServices } from "@/lib/services/provider-service-payload";

function asText(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const authError = requireAdmin(session);
  if (authError) return authError;

  const body = await request.json().catch(() => null) as {
    providerId?: string;
    apiUrl?: string;
    apiKey?: string;
  } | null;

  let apiUrl = body?.apiUrl?.trim() ?? "";
  let apiKey = body?.apiKey?.trim() ?? "";

  if (body?.providerId) {
    const provider = await db.provider.findUnique({
      where: { id: body.providerId },
      select: { apiUrl: true, apiKey: true },
    });
    if (!provider) {
      return NextResponse.json({ error: "Saglayici bulunamadi." }, { status: 404 });
    }
    apiUrl = provider.apiUrl;
    apiKey = provider.apiKey;
  }

  if (!apiUrl || !apiKey) {
    return NextResponse.json({ error: "API URL ve API key zorunludur." }, { status: 400 });
  }

  try {
    const rows = await fetchProviderServices(apiUrl, apiKey);
    const services = rows
      .map((row) => ({
        externalId: asText(row.service),
        name: asText(row.name),
        category: asText(row.category) || "Genel",
        type: asText(row.type) || "Default",
        rate: Number(row.rate),
        min: Number(row.min),
        max: Number(row.max),
      }))
      .filter((row) => row.externalId && row.name && Number.isFinite(row.rate));

    const categoryMap = new Map<string, { name: string; count: number }>();
    for (const service of services) {
      const current = categoryMap.get(service.category) ?? { name: service.category, count: 0 };
      current.count += 1;
      categoryMap.set(service.category, current);
    }

    return NextResponse.json({
      total: services.length,
      categories: Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name, "tr")),
      services,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Saglayici servisleri alinamadi.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}