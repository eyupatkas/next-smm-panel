import type { Prisma, OrderStatus } from "@prisma/client";

export const ADMIN_ORDER_PER_PAGE_OPTIONS = [25, 50, 100, 200] as const;
export const ADMIN_ORDER_DEFAULT_PER_PAGE = 50;
export const ADMIN_ORDER_EXPORT_LIMIT = 10000;

export const ADMIN_ORDER_SORTS = [
  "newest",
  "oldest",
  "charge_desc",
  "charge_asc",
  "quantity_desc",
] as const;
export type AdminOrderSort = (typeof ADMIN_ORDER_SORTS)[number];

export interface AdminOrdersFilters {
  page: number;
  perPage: number;
  status: string;
  q: string;
  providerId: string;
  from: string | null;
  to: string | null;
  sort: AdminOrderSort;
  source: "all" | "agent" | "manual";
}

/** Bir durumun iptal/iade kurallarına uyan kısmi iade koşulu (refundedAmount > 0). */
const canceledWithRefundCondition: Prisma.OrderWhereInput = {
  status: "CANCELED",
  refundedAmount: { gt: 0 },
};

const refundedCondition: Prisma.OrderWhereInput = {
  OR: [
    { status: "REFUNDED" },
    canceledWithRefundCondition,
  ],
};

const canceledWithoutRefundCondition: Prisma.OrderWhereInput = {
  status: "CANCELED",
  OR: [{ refundedAmount: null }, { refundedAmount: { lte: 0 } }],
};

const notSentCondition: Prisma.OrderWhereInput = {
  service: { providerId: { not: null } },
  apiOrderId: null,
  status: { notIn: ["COMPLETED", "CANCELED", "REFUNDED"] as OrderStatus[] },
};

export function parseAdminOrdersFilters(
  params: Record<string, string | string[] | undefined>,
): AdminOrdersFilters {
  const get = (key: string) => {
    const v = params[key];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };

  const perPageRaw = Number(get("perPage")) || ADMIN_ORDER_DEFAULT_PER_PAGE;
  const perPage = (ADMIN_ORDER_PER_PAGE_OPTIONS as readonly number[]).includes(perPageRaw)
    ? perPageRaw
    : ADMIN_ORDER_DEFAULT_PER_PAGE;

  const sortRaw = get("sort") as AdminOrderSort;
  const sort: AdminOrderSort = ADMIN_ORDER_SORTS.includes(sortRaw) ? sortRaw : "newest";

  const sourceRaw = get("source");
  const source: AdminOrdersFilters["source"] =
    sourceRaw === "agent" || sourceRaw === "manual" ? sourceRaw : "all";

  const page = Math.max(1, Number(get("page")) || 1);

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const fromRaw = get("from");
  const toRaw = get("to");
  const from = dateRe.test(fromRaw) ? fromRaw : null;
  const to = dateRe.test(toRaw) ? toRaw : null;

  return {
    page,
    perPage,
    status: get("status") || "ALL",
    q: get("q").trim(),
    providerId: get("provider"),
    from,
    to,
    sort,
    source,
  };
}

export function buildAdminOrdersWhere(f: AdminOrdersFilters): Prisma.OrderWhereInput {
  const conditions: Prisma.OrderWhereInput[] = [];

  if (f.status && f.status !== "ALL") {
    switch (f.status) {
      case "NOT_SENT":
        conditions.push(notSentCondition);
        break;
      case "REFUNDED":
        conditions.push(refundedCondition);
        break;
      case "CANCELED":
        conditions.push(canceledWithoutRefundCondition);
        break;
      default:
        conditions.push({ status: f.status as OrderStatus });
    }
  }

  if (f.q) {
    conditions.push({
      OR: [
        { id: { contains: f.q, mode: "insensitive" } },
        { apiOrderId: { contains: f.q, mode: "insensitive" } },
        { link: { contains: f.q, mode: "insensitive" } },
        { user: { email: { contains: f.q, mode: "insensitive" } } },
        { service: { name: { contains: f.q, mode: "insensitive" } } },
        { service: { provider: { name: { contains: f.q, mode: "insensitive" } } } },
      ],
    });
  }

  if (f.providerId) {
    conditions.push({ service: { providerId: f.providerId } });
  }

  if (f.from) {
    const d = new Date(`${f.from}T00:00:00`);
    if (!Number.isNaN(d.getTime())) conditions.push({ createdAt: { gte: d } });
  }
  if (f.to) {
    const d = new Date(`${f.to}T23:59:59.999`);
    if (!Number.isNaN(d.getTime())) conditions.push({ createdAt: { lte: d } });
  }

  if (f.source === "agent") conditions.push({ placedByAgent: true });
  else if (f.source === "manual") conditions.push({ placedByAgent: false });

  return conditions.length ? { AND: conditions } : {};
}

export function buildAdminOrdersOrderBy(
  sort: AdminOrderSort,
): Prisma.OrderOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "charge_desc":
      return [{ charge: "desc" }, { createdAt: "desc" }];
    case "charge_asc":
      return [{ charge: "asc" }, { createdAt: "desc" }];
    case "quantity_desc":
      return [{ quantity: "desc" }, { createdAt: "desc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

/** Sekme sayıları: durum filtresi hariç diğer tüm filtreler uygulanmış halde. */
export function statusTabCondition(status: string): Prisma.OrderWhereInput | null {
  switch (status) {
    case "NOT_SENT":
      return notSentCondition;
    case "REFUNDED":
      return refundedCondition;
    case "CANCELED":
      return canceledWithoutRefundCondition;
    case "ALL":
      return null;
    default:
      return { status: status as OrderStatus };
  }
}

/** Durum filtresi dışındaki koşullar (sekme sayıları için temel where). */
export function buildAdminOrdersBaseWhere(f: AdminOrdersFilters): Prisma.OrderWhereInput {
  const withoutStatus: AdminOrdersFilters = { ...f, status: "ALL" };
  return buildAdminOrdersWhere(withoutStatus);
}
