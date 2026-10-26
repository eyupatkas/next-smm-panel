import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getPricingMode } from "@/lib/pricing";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return unauthorized();

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type"); // "providers" | "categories" | "services"

  // Return all providers
  if (type === "providers") {
    const providers = await db.provider.findMany({
      where: { status: true },
      select: { id: true, name: true, balance: true, baseCurrency: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(providers);
  }

  // Return categories for a provider (top-level only)
  if (type === "categories") {
    const providerId = searchParams.get("providerId") || undefined;
    const categories = await db.category.findMany({
      where: {
        parentId: null,
        status: true,
        ...(providerId
          ? {
              OR: [
                { providerId },
                { services: { some: { providerId } } },
                { children: { some: { services: { some: { providerId } } } } },
              ],
            }
          : {}),
      },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories);
  }

  // Return services, optionally filtered by providerId, categoryId, search
  if (type === "services") {
    const providerId = searchParams.get("providerId") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const search = searchParams.get("q")?.trim() || undefined;

    const services = await db.service.findMany({
      where: {
        status: true,
        ...(providerId ? { providerId } : {}),
        ...(categoryId ? { category: { OR: [{ id: categoryId }, { parentId: categoryId }] } } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { externalId: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        externalId: true,
        price: true,
        min: true,
        max: true,
        serviceType: true,
        category: { select: { name: true } },
        provider: { select: { name: true } },
      },
      orderBy: { name: "asc" },
      take: 50,
    });

    return NextResponse.json(services.map((service) => ({
      ...service,
      pricingMode: getPricingMode(service),
    })));
  }

  return NextResponse.json({ error: "Geçersiz type parametresi." }, { status: 400 });
}
