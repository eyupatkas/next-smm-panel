"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { HeadphonesIcon } from "lucide-react";

export function OrderSupportButton({ orderId }: { orderId: string }) {
  const locale = useLocale();

  return (
    <Link
      href={`/${locale}/dashboard/tickets?orderId=${orderId}`}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border border-blue-500/25 bg-blue-500/8 text-blue-400 hover:bg-blue-500/15 hover:border-blue-500/40 transition-colors"
    >
      <HeadphonesIcon size={11} />
      Destek
    </Link>
  );
}
