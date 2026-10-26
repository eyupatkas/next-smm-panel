import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "MODERATOR"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const services = await db.service.findMany({
    where: {
      status: true,
      name: { contains: q, mode: "insensitive" },
    },
    select: {
      id: true,
      name: true,
      category: { select: { name: true } },
    },
    take: 30,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    services.map((s) => ({ id: s.id, name: s.name, categoryName: s.category.name }))
  );
}
