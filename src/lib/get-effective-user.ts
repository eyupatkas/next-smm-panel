import { auth } from "@/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "admin_impersonate";

/**
 * Returns the "active" userId for dashboard pages.
 * If an admin has set the impersonation cookie, returns that userId instead.
 * Redirects to /login if not authenticated.
 */
export async function getEffectiveUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (session.user.role === "ADMIN") {
    const jar = await cookies();
    const impersonateId = jar.get(COOKIE_NAME)?.value;
    if (impersonateId) return impersonateId;
  }

  return session.user.id;
}

/**
 * Like getEffectiveUserId but also returns session (for role checks etc.)
 */
export async function getEffectiveSession() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let effectiveUserId = session.user.id;
  let isImpersonating = false;

  if (session.user.role === "ADMIN") {
    const jar = await cookies();
    const impersonateId = jar.get(COOKIE_NAME)?.value;
    if (impersonateId) {
      effectiveUserId = impersonateId;
      isImpersonating = true;
    }
  }

  return { session, effectiveUserId, isImpersonating };
}
