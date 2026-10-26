import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReferralsClient } from "@/app/[locale]/(dashboard)/dashboard/referrals/client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("referralsPage");
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default function ReferralsPage() {
  return <ReferralsClient />;
}
