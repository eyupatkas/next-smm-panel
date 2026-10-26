import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  countFavoriteServices,
  getFavoriteActor,
  listFavoriteServiceIds,
  moveGuestFavoriteToUser,
} from "@/lib/favorites";

type FavoritePayload = {
  serviceId?: string;
};

export async function GET() {
  const actor = await getFavoriteActor();
  const serviceIds = await listFavoriteServiceIds(actor);

  return NextResponse.json({
    count: serviceIds.length,
    serviceIds,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FavoritePayload;
    const serviceId = body.serviceId?.trim();

    if (!serviceId) {
      return NextResponse.json({ error: "Servis secilmedi." }, { status: 400 });
    }

    const actor = await getFavoriteActor({ createGuestToken: true });
    const service = await db.service.findFirst({
      where: { id: serviceId, status: true },
      select: { id: true },
    });

    if (!service) {
      return NextResponse.json({ error: "Servis bulunamadi." }, { status: 404 });
    }

    if (actor.userId) {
      await moveGuestFavoriteToUser(actor.userId, actor.guestToken, serviceId);

      await db.favoriteService.upsert({
        where: {
          userId_serviceId: {
            userId: actor.userId,
            serviceId,
          },
        },
        update: {},
        create: {
          userId: actor.userId,
          serviceId,
        },
      });
    } else if (actor.guestToken) {
      await db.favoriteService.upsert({
        where: {
          guestToken_serviceId: {
            guestToken: actor.guestToken,
            serviceId,
          },
        },
        update: {},
        create: {
          guestToken: actor.guestToken,
          serviceId,
        },
      });
    }

    const serviceIds = await listFavoriteServiceIds(actor);
    const count = await countFavoriteServices(actor);

    return NextResponse.json({
      count,
      favorited: true,
      serviceId,
      serviceIds,
    });
  } catch (error) {
    console.error("[Favorites] POST failed", error);
    return NextResponse.json(
      { error: "Favori islemi tamamlanamadi." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as FavoritePayload;
    const serviceId = body.serviceId?.trim();

    if (!serviceId) {
      return NextResponse.json({ error: "Servis secilmedi." }, { status: 400 });
    }

    const actor = await getFavoriteActor();

    if (!actor.userId && !actor.guestToken) {
      return NextResponse.json({ count: 0, favorited: false, serviceId, serviceIds: [] });
    }

    const scopes: Array<
      | { userId: string; serviceId: string }
      | { guestToken: string; serviceId: string }
    > = [];

    if (actor.userId) {
      scopes.push({ userId: actor.userId, serviceId });
    }

    if (actor.guestToken) {
      scopes.push({ guestToken: actor.guestToken, serviceId });
    }

    await db.favoriteService.deleteMany({
      where: scopes.length === 1 ? scopes[0] : { OR: scopes },
    });

    const serviceIds = await listFavoriteServiceIds(actor);

    return NextResponse.json({
      count: serviceIds.length,
      favorited: false,
      serviceId,
      serviceIds,
    });
  } catch (error) {
    console.error("[Favorites] DELETE failed", error);
    return NextResponse.json(
      { error: "Favori kaldirilamadi." },
      { status: 500 },
    );
  }
}