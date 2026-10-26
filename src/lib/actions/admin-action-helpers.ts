import type { Session } from "next-auth";
import { NextResponse } from "next/server";

function roundUpToEnding(value: number, ending: number) {
  if (!Number.isFinite(value)) return value;

  const integerPart = Math.floor(value);
  const currentEnding = Number((value - integerPart).toFixed(2));

  if (currentEnding === ending) {
    return Number(value.toFixed(2));
  }

  if (currentEnding < ending) {
    return Number((integerPart + ending).toFixed(2));
  }

  return Number((integerPart + 1 + ending).toFixed(2));
}

export function applyRounding(value: number, roundingMode: string) {
  switch (roundingMode) {
    case "UP_09":
      return roundUpToEnding(value, 0.09);
    case "UP_29":
      return roundUpToEnding(value, 0.29);
    case "UP_49":
      return roundUpToEnding(value, 0.49);
    case "UP_99":
      return roundUpToEnding(value, 0.99);
    default:
      return Number(value.toFixed(4));
  }
}

export function ensureAdmin(session: Session | null) {
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

/**
 * API route'larında kullanım için: session admin değilse 401 response döner,
 * admin ise null döner (devam etmek güvenli).
 */
export function requireAdmin(session: Session | null): NextResponse | null {
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}