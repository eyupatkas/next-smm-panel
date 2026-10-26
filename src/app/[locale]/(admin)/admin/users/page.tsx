import { db } from "@/lib/db";
import { getLocale } from "next-intl/server";
import AdminUsersClient from "@/components/admin/AdminUsersClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kullanıcı Yönetimi",
};

export default async function AdminUsersPage() {
  const locale = await getLocale();

  const resellers = await db.user.findMany({
    where: { role: "RESELLER" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return <AdminUsersClient locale={locale} resellers={resellers} />;
}
