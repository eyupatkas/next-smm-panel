import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export const FAVORITES_GUEST_COOKIE_NAME = "optismm_guest_favorites";

const FAVORITES_COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export type FavoriteActor = {
  userId: string | null;
  guestToken: string | null;
};

export function createGuestFavoritesToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function getFavoriteActor(options?: { createGuestToken?: boolean }) {
  const session = await auth().catch(() => null);
  const cookieStore = await cookies();

  let guestToken = cookieStore.get(FAVORITES_GUEST_COOKIE_NAME)?.value ?? null;

  if (!session?.user?.id && !guestToken && options?.createGuestToken) {
    guestToken = createGuestFavoritesToken();
    cookieStore.set({
      name: FAVORITES_GUEST_COOKIE_NAME,
      value: guestToken,
      ...FAVORITES_COOKIE_OPTIONS,
    });
  }

  return {
    userId: session?.user?.id ?? null,
    guestToken,
  } satisfies FavoriteActor;
}

export function buildFavoriteWhere(
  actor: FavoriteActor,
  options?: { userOnly?: boolean },
) {
  const scopes: Array<Record<string, string>> = [];

  if (actor.userId) {
    scopes.push({ userId: actor.userId });
  }

  if (!options?.userOnly && actor.guestToken) {
    scopes.push({ guestToken: actor.guestToken });
  }

  if (scopes.length === 0) {
    return null;
  }

  if (scopes.length === 1) {
    return scopes[0];
  }

  return { OR: scopes };
}

export async function listFavoriteServiceIds(
  actor: FavoriteActor,
  options?: { userOnly?: boolean },
) {
  const userRows = actor.userId
    ? await db.favoriteService.findMany({
        where: { userId: actor.userId },
        select: { serviceId: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const guestRows = !options?.userOnly && actor.guestToken
    ? await db.favoriteService.findMany({
        where: { guestToken: actor.guestToken },
        select: { serviceId: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const seen = new Set<string>();
  const merged: string[] = [];

  for (const row of [...userRows, ...guestRows]) {
    if (seen.has(row.serviceId)) {
      continue;
    }

    seen.add(row.serviceId);
    merged.push(row.serviceId);
  }

  return merged;
}

export async function countFavoriteServices(
  actor: FavoriteActor,
  options?: { userOnly?: boolean },
) {
  const ids = await listFavoriteServiceIds(actor, options);
  return ids.length;
}

export async function moveGuestFavoriteToUser(
  userId: string,
  guestToken: string | null,
  serviceId: string,
) {
  if (!guestToken) {
    return;
  }

  const existingUserFavorite = await db.favoriteService.findUnique({
    where: {
      userId_serviceId: {
        userId,
        serviceId,
      },
    },
    select: { id: true },
  });

  const guestFavorite = await db.favoriteService.findUnique({
    where: {
      guestToken_serviceId: {
        guestToken,
        serviceId,
      },
    },
    select: { id: true },
  });

  if (!guestFavorite) {
    return;
  }

  if (existingUserFavorite) {
    await db.favoriteService.delete({ where: { id: guestFavorite.id } });
    return;
  }

  await db.favoriteService.update({
    where: { id: guestFavorite.id },
    data: {
      userId,
      guestToken: null,
    },
  });
}