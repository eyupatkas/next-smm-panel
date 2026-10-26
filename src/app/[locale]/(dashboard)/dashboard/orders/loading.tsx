import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Siparişler yükleniyor">
      <div className="rounded-3xl border bg-card p-6">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-10 w-64 max-w-full" />
        <Skeleton className="mt-3 h-4 w-[32rem] max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-80 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
