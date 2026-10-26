import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/admin/favorites/[favoriteId]">,
) {
  const session = await auth().catch(() => null);

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz islem." }, { status: 403 });
  }

  const { favoriteId } = await context.params;

  await db.favoriteService.delete({ where: { id: favoriteId } });

  return NextResponse.json({ success: true });
}