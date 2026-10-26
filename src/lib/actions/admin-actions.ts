"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Role, OrderStatus } from "@prisma/client";
import { getMarkupSettings, setSettings } from "@/lib/settings";
import { syncOrderWithProvider, syncProviderOrdersBatch } from "@/lib/services/provider-order-sync";
import { normalizeServiceCatalogCategories } from "@/lib/services/catalog-normalization";
import { ensureAdmin, slugify } from "@/lib/actions/admin-action-helpers";
import {
  analyzePackageProfitability,
  recommendPackagePricing,
  type PackageComboItem,
} from "@/lib/services/package-profitability";
import { applyUserMoneyDelta } from "@/lib/money";

export async function saveAdminSettings(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const interval = Math.max(15000, Number(formData.get("provider_sync_interval_ms") || 60000) || 60000);
  const batchLimit = Math.max(1, Math.min(100, Number(formData.get("provider_sync_batch_limit") || 25) || 25));
  const retailMarkup = Math.max(0, Number(formData.get("retail_markup_percent") || 200) || 200);
  const resellerMarkup = Math.max(0, Number(formData.get("reseller_markup_percent") || 100) || 100);
  const serviceSyncHours = Math.max(1, Number(formData.get("service_sync_interval_hours") || 6) || 6);
  const usdToTryRate = Math.max(1, Number(formData.get("usd_to_try_rate") || 35) || 35);

  const values = {
    provider_sync_interval_ms: String(interval),
    provider_sync_batch_limit: String(batchLimit),
    retail_markup_percent: String(retailMarkup),
    reseller_markup_percent: String(resellerMarkup),
    service_sync_interval_hours: String(serviceSyncHours),
    usd_to_try_rate: String(usdToTryRate),
  };

  await setSettings(values);
  revalidatePath("/admin/settings");
}

export async function savePaymentSettings(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const rawVatRate = Number(formData.get("vat_rate"));
  const vatRate = Number.isFinite(rawVatRate) ? Math.min(100, Math.max(0, rawVatRate)) : 20;
  const values = {
    // Kart sağlayıcıları reddedildi; yeni tahsilatlar yalnızca kripto ve banka transferiyle alınır.
    paytr_enabled: "0",
    paytr_test_mode: formData.get("paytr_test_mode") === "on" ? "1" : "0",
    paytr_merchant_id: String(formData.get("paytr_merchant_id") || "").trim(),
    paytr_merchant_key: String(formData.get("paytr_merchant_key") || "").trim(),
    paytr_merchant_salt: String(formData.get("paytr_merchant_salt") || "").trim(),
    shopier_enabled: "0",
    shopier_api_key: String(formData.get("shopier_api_key") || "").trim(),
    shopier_api_secret: String(formData.get("shopier_api_secret") || "").trim(),
    iyzico_enabled: "0",
    iyzico_api_key: String(formData.get("iyzico_api_key") || "").trim(),
    iyzico_secret_key: String(formData.get("iyzico_secret_key") || "").trim(),
    iyzico_base_url: String(formData.get("iyzico_base_url") || "https://api.iyzipay.com").trim(),
    cryptomus_enabled: formData.get("cryptomus_enabled") === "on" ? "1" : "0",
    cryptomus_merchant_id: String(formData.get("cryptomus_merchant_id") || "").trim(),
    cryptomus_api_key: String(formData.get("cryptomus_api_key") || "").trim(),
    polar_enabled: "0",
    polar_api_key: String(formData.get("polar_api_key") || "").trim(),
    polar_product_id: String(formData.get("polar_product_id") || "").trim(),
    polar_webhook_secret: String(formData.get("polar_webhook_secret") || "").trim(),
    bank_transfer_enabled: formData.get("bank_transfer_enabled") === "on" ? "1" : "0",
    bank_transfer_iban: String(formData.get("bank_transfer_iban") || "").replace(/\s+/g, " ").trim(),
    bank_transfer_holder: String(formData.get("bank_transfer_holder") || "").trim(),
    bank_transfer_bank: String(formData.get("bank_transfer_bank") || "").trim(),
    vat_rate: String(vatRate),
  };

  await setSettings(values);
  revalidatePath("/admin/settings/payments");
  revalidatePath("/services");
  revalidatePath("/dashboard/new-order");
  revalidatePath("/packages");
}

export async function approveBankTransferPayment(paymentId: string) {
  const session = await auth();
  ensureAdmin(session);
  if (!paymentId) return { error: "Ödeme bulunamadı." };

  const result = await db.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id: paymentId, method: "BANK_TRANSFER", status: "PENDING" },
      select: { id: true, userId: true, amount: true },
    });
    if (!payment) return false;

    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, method: "BANK_TRANSFER", status: "PENDING" },
      data: { status: "COMPLETED", gatewayStatus: "ADMIN_APPROVED" },
    });
    if (claimed.count !== 1) return false;

    await applyUserMoneyDelta(tx, payment.userId, { balance: payment.amount });
    return true;
  });

  revalidatePath("/admin/finance");
  revalidatePath("/dashboard/add-funds");
  return result ? { success: "Havale onaylandı ve bakiye eklendi." } : { error: "Ödeme zaten işlenmiş veya bulunamadı." };
}

export async function updateServiceAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const id = String(formData.get("id") || "");
  const price = Number(formData.get("price"));
  const retailPriceRaw = formData.get("retailPrice");
  const resellerPriceRaw = formData.get("resellerPrice");
  const status = formData.get("status") === "on";
  const descriptionRaw = formData.get("description");
  const description =
    descriptionRaw === null ? undefined : (String(descriptionRaw).trim() || null);
  const linkFormatRaw = formData.get("linkFormat");
  const linkFormat = linkFormatRaw ? String(linkFormatRaw) : undefined;

  if (!id || Number.isNaN(price)) return;

  // Backward compatible: if columns don't exist in DB, fall back to updating only `price` and `status`.
  try {
    await db.service.update({
      where: { id },
      data: {
        price,
        status,
        retailPrice:
          retailPriceRaw === null || retailPriceRaw === "" ? null : Number(retailPriceRaw),
        resellerPrice:
          resellerPriceRaw === null || resellerPriceRaw === "" ? null : Number(resellerPriceRaw),
        ...(description !== undefined ? { description } : {}),
        ...(linkFormat ? { linkFormat } : {}),
      },
    });
  } catch {
    await db.service.update({
      where: { id },
      data: { price, status },
    });
  }

  revalidatePath("/admin/services");
  revalidatePath("/dashboard/new-order");
  revalidatePath("/dashboard/reseller/pricing");
}

export async function toggleServiceStatusAdmin(id: string, status: boolean) {
  const session = await auth();
  ensureAdmin(session);
  if (!id) return;
  await db.service.update({ where: { id }, data: { status } });
  revalidatePath("/admin/services");
  revalidatePath("/dashboard/new-order");
  revalidatePath("/dashboard/services");
}

export async function normalizeServiceCatalogCategoriesAdmin() {
  const session = await auth();
  ensureAdmin(session);

  const result = await normalizeServiceCatalogCategories(db);

  revalidatePath("/admin/services");
  revalidatePath("/admin/settings/providers");
  revalidatePath("/dashboard/new-order");
  revalidatePath("/dashboard/mass-order");
  revalidatePath("/dashboard/services");
  revalidatePath("/servis-listesi");

  return result;
}

export async function updateUserAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const id = String(formData.get("id") || "");
  const role = String(formData.get("role") || "") as Role;
  const parentId = String(formData.get("parentId") || "");

  if (!id) return;
  if (session!.user!.id === id && role && role !== "ADMIN") {
    throw new Error("Kendi admin rolünüzü değiştiremezsiniz.");
  }

  const data: Record<string, unknown> = {};
  if (role && ["ADMIN", "USER", "RESELLER"].includes(role)) data.role = role;

  // Backward compatible: parentId may not exist in old DB schema.
  if (parentId) data.parentId = parentId;
  if (parentId === "__none__") data.parentId = null;

  try {
    await db.user.update({ where: { id }, data });
  } catch {
    // if parentId column doesn't exist, retry without it
    if ("parentId" in data) {
      const rest: Record<string, unknown> = { ...data };
      delete rest.parentId;
      await db.user.update({ where: { id }, data: rest });
    }
  }

  revalidatePath("/admin/users");
  revalidatePath("/dashboard/reseller/customers");
}

export async function updateOrderStatusAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as OrderStatus;

  if (!id) return;
  if (!["PENDING", "PROCESSING", "COMPLETED", "PARTIAL", "CANCELED", "REFUNDED"].includes(status)) return;

  const order = await db.order.findUnique({
    where: { id },
    select: { id: true, status: true, charge: true, quantity: true, remains: true, userId: true, refundedAmount: true, error: true },
  });
  if (!order) return;

  const isCancelOrRefund = status === "CANCELED" || status === "REFUNDED";
  const wasAlreadyCancelOrRefund = order.status === "CANCELED" || order.status === "REFUNDED";

  // Kısmi iade hesapla: sadece ilk kez iptal/iade statüsüne geçiliyorsa
  if (isCancelOrRefund && !wasAlreadyCancelOrRefund) {
    // awaiting_payment: ödeme hiç onaylanmadı — bakiye iadesi yapılmaz
    if (order.error === "awaiting_payment") {
      await db.order.update({
        where: { id },
        data: { status, cancelledAt: new Date() },
      });
      revalidatePath("/admin/orders");
      revalidatePath("/dashboard/orders");
      revalidatePath("/dashboard");
      return;
    }

    const charge = Number(order.charge);
    let refundAmount = charge; // varsayılan: tam iade

    // Eğer kısmen teslim edilmişse (remains > 0), yalnızca teslim edilmeyeni iade et
    if (order.remains > 0 && order.quantity > 0) {
      const deliveredFraction = Math.max(0, (order.quantity - order.remains) / order.quantity);
      refundAmount = Number((charge * (1 - deliveredFraction)).toFixed(4));
    }

    // Koşullu statü geçişi ve iade aynı transaction'da; paralel admin/sync
    // çağrılarından yalnızca biri kullanıcı bakiyesini artırabilir.
    if (refundAmount > 0 && !order.refundedAmount) {
      await db.$transaction(async (tx) => {
        const updated = await tx.order.updateMany({
          where: {
            id,
            refundedAmount: null,
            status: { notIn: ["CANCELED", "REFUNDED", "PARTIAL"] },
          },
          data: {
            status,
            cancelledAt: new Date(),
            refundedAmount: refundAmount,
          },
        });
        if (updated.count === 1) {
          await applyUserMoneyDelta(tx, order.userId, {
            balance: refundAmount,
            spent: -refundAmount,
          });
        }
      });
    } else {
      // Zaten iade edilmiş ya da iade tutarı sıfır
      await db.order.update({
        where: { id },
        data: { status, cancelledAt: new Date() },
      });
    }
  } else {
    await db.order.update({
      where: { id },
      data: { status },
    });
  }

  revalidatePath("/admin/orders");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
}

export async function syncOrderWithProviderAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const id = String(formData.get("id") || "");
  if (!id) return;
  await syncOrderWithProvider(id, undefined, { allowAmbiguousRetry: true });



  revalidatePath("/admin/orders");
  revalidatePath("/admin/provider-logs");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
}

export async function changeOrderServiceAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const orderId = String(formData.get("orderId") || "").trim();
  const serviceId = String(formData.get("serviceId") || "").trim();

  if (!orderId || !serviceId) return { error: "Geçersiz parametreler." };

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, apiOrderId: true, status: true },
  });
  if (!order) return { error: "Sipariş bulunamadı." };
  if (order.apiOrderId) return { error: "Sipariş zaten sağlayıcıya iletildi; servis değiştirilemez." };

  const service = await db.service.findUnique({
    where: { id: serviceId },
    select: { id: true, name: true },
  });
  if (!service) return { error: "Servis bulunamadı." };

  await db.order.update({
    where: { id: orderId },
    data: {
      serviceId,
      providerSyncError: null,
    },
  });

  revalidatePath("/admin/orders");
  return { ok: true };
}

export async function syncProviderOrdersBatchAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const limit = Math.max(1, Math.min(100, Number(formData.get("limit") || 25) || 25));

  await syncProviderOrdersBatch(limit);

  revalidatePath("/admin/orders");
  revalidatePath("/admin/provider-logs");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
}

// ─── Category CRUD ──────────────────────────────────────────────────────────

export async function createCategoryAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const name = String(formData.get("name") || "").trim();
  const parentId = String(formData.get("parentId") || "").trim() || null;
  const icon = String(formData.get("icon") || "").trim() || null;

  if (!name) return;

  const maxSort = await db.category.aggregate({ _max: { sortOrder: true } });
  const nextSort = (maxSort._max.sortOrder ?? 0) + 1;

  await db.category.create({
    data: { name, parentId, icon, sortOrder: nextSort, status: true },
  });

  revalidatePath("/admin/packages");
  revalidatePath("/admin/services");
  revalidatePath("/dashboard/services");
}

export async function updateCategoryAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const status = formData.get("status") === "on";

  if (!id || !name) return;

  await db.category.update({ where: { id }, data: { name, status } });

  revalidatePath("/admin/packages");
  revalidatePath("/admin/services");
  revalidatePath("/dashboard/services");
}

// ─── Package CRUD ───────────────────────────────────────────────────────────

export async function createPackageAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const quantity = Number(formData.get("quantity") || 0);
  const price = Number(formData.get("price") || 0);
  const retailPrice = formData.get("retailPrice") ? Number(formData.get("retailPrice")) : null;
  const resellerPrice = formData.get("resellerPrice") ? Number(formData.get("resellerPrice")) : null;
  const showOnHomepage = formData.get("showOnHomepage") === "on";
  const categoryId = String(formData.get("categoryId") || "");
  const serviceId = String(formData.get("serviceId") || "");

  if (!name || !categoryId || !serviceId || quantity <= 0 || price <= 0) return;

  await db.package.create({
    data: { name, description, quantity, price, retailPrice, resellerPrice, showOnHomepage, categoryId, serviceId, status: true },
  });

  revalidatePath("/admin/packages");
  revalidatePath("/dashboard/services");
  revalidatePath("/");
  revalidatePath("/services");
}

export async function updatePackageAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const quantity = Number(formData.get("quantity") || 0);
  const price = Number(formData.get("price") || 0);
  const retailPrice = formData.get("retailPrice") ? Number(formData.get("retailPrice")) : null;
  const resellerPrice = formData.get("resellerPrice") ? Number(formData.get("resellerPrice")) : null;
  const serviceId = String(formData.get("serviceId") || "");
  const status = formData.get("status") === "on";
  const showOnHomepage = formData.get("showOnHomepage") === "on";

  if (!id || !name || quantity <= 0 || price <= 0) return;

  await db.package.update({
    where: { id },
    data: { name, quantity, price, retailPrice, resellerPrice, serviceId: serviceId || undefined, status, showOnHomepage },
  });

  revalidatePath("/admin/packages");
  revalidatePath("/dashboard/services");
  revalidatePath("/");
  revalidatePath("/services");
}

export async function deletePackageAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const id = String(formData.get("id") || "");
  if (!id) return;

  await db.package.delete({ where: { id } });

  revalidatePath("/admin/packages");
  revalidatePath("/dashboard/services");
  revalidatePath("/");
  revalidatePath("/services");
}

export async function bulkRepricePackagesAdmin(input: {
  packageIds: string[];
  retailMarkupPercent?: number;
  resellerMarkupPercent?: number;
  onlyIncrease?: boolean;
}) {
  const session = await auth();
  ensureAdmin(session);

  const packageIds = Array.from(new Set(input.packageIds.filter(Boolean)));
  if (packageIds.length === 0) {
    return { packageCount: 0, updatedCount: 0, skippedCount: 0, totalLift: 0 };
  }

  const defaultMarkups = await getMarkupSettings();
  const retailMarkupPercent = Number.isFinite(input.retailMarkupPercent)
    ? Math.max(0, Number(input.retailMarkupPercent))
    : defaultMarkups.retailMarkupPercent;
  const resellerMarkupPercent = Number.isFinite(input.resellerMarkupPercent)
    ? Math.max(0, Number(input.resellerMarkupPercent))
    : defaultMarkups.resellerMarkupPercent;
  const onlyIncrease = input.onlyIncrease ?? true;

  const packages = await db.package.findMany({
    where: { id: { in: packageIds } },
    select: {
      id: true,
      quantity: true,
      price: true,
      retailPrice: true,
      resellerPrice: true,
      comboItems: true,
      service: { select: { id: true, name: true } },
    },
  });

  const serviceIds = Array.from(new Set(
    packages.flatMap((pkg) => {
      const comboItems = Array.isArray(pkg.comboItems) ? (pkg.comboItems as PackageComboItem[]) : [];
      return [pkg.service.id, ...comboItems.map((item) => item.serviceId)];
    })
  ));

  const services = await db.service.findMany({
    where: { id: { in: serviceIds } },
    select: {
      id: true,
      name: true,
      price: true,
      min: true,
      max: true,
      serviceType: true,
      provider: { select: { name: true } },
    },
  });

  const serviceMap = new Map(
    services.map((service) => [
      service.id,
      {
        id: service.id,
        name: service.name,
        price: service.price,
        min: service.min,
        max: service.max,
        serviceType: service.serviceType,
        providerName: service.provider?.name ?? null,
      },
    ])
  );

  const updates = packages.flatMap((pkg) => {
    const comboItems = Array.isArray(pkg.comboItems) ? (pkg.comboItems as PackageComboItem[]) : null;
    const profitability = analyzePackageProfitability({
      quantity: pkg.quantity,
      price: pkg.price,
      retailPrice: pkg.retailPrice,
      resellerPrice: pkg.resellerPrice,
      linkedServiceId: pkg.service.id,
      linkedServiceName: pkg.service.name,
      comboItems,
      serviceMap,
    });

    const recommendation = recommendPackagePricing({
      profitability,
      price: pkg.price,
      retailPrice: pkg.retailPrice,
      resellerPrice: pkg.resellerPrice,
      retailMarkupPercent,
      resellerMarkupPercent,
      onlyIncrease,
    });

    if (!recommendation?.needsUpdate) {
      return [];
    }

    return [{
      id: pkg.id,
      data: {
        price: recommendation.price ?? pkg.price,
        retailPrice: recommendation.retailPrice,
        resellerPrice: recommendation.resellerPrice,
      },
      totalLift: recommendation.totalLift,
    }];
  });

  if (updates.length > 0) {
    await db.$transaction(
      updates.map((item) =>
        db.package.update({
          where: { id: item.id },
          data: item.data,
        })
      )
    );
  }

  revalidatePath("/admin/packages");
  revalidatePath("/dashboard/services");
  revalidatePath("/");
  revalidatePath("/services");

  return {
    packageCount: packages.length,
    updatedCount: updates.length,
    skippedCount: packages.length - updates.length,
    totalLift: Number(updates.reduce((sum, item) => sum + item.totalLift, 0).toFixed(2)),
  };
}

export async function createBlogPostAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const title = String(formData.get("title") || "").trim();
  const excerpt = String(formData.get("excerpt") || "").trim() || null;
  const content = String(formData.get("content") || "").trim();
  const coverImage = String(formData.get("coverImage") || "").trim() || null;
  const published = formData.get("published") === "on";
  const featured = formData.get("featured") === "on";

  if (!title || !content) return;

  const baseSlug = slugify(title);
  const existing = await db.blogPost.count({ where: { slug: { startsWith: baseSlug } } });
  const slug = existing > 0 ? `${baseSlug}-${existing + 1}` : baseSlug;

  await db.blogPost.create({
    data: {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      published,
      featured,
      publishedAt: published ? new Date() : null,
    },
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
}

export async function updateBlogPostAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();
  const slugRaw = String(formData.get("slug") || "").trim();
  const excerpt = String(formData.get("excerpt") || "").trim() || null;
  const content = String(formData.get("content") || "").trim();
  const coverImage = String(formData.get("coverImage") || "").trim() || null;
  const published = formData.get("published") === "on";
  const featured = formData.get("featured") === "on";

  if (!id || !title || !content) return;

  const slug = slugify(slugRaw || title);
  const current = await db.blogPost.findUnique({ where: { id }, select: { publishedAt: true } });

  await db.blogPost.update({
    where: { id },
    data: {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      published,
      featured,
      publishedAt: published ? current?.publishedAt ?? new Date() : null,
    },
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
}

export async function deleteBlogPostAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const id = String(formData.get("id") || "");
  if (!id) return;

  const current = await db.blogPost.findUnique({ where: { id }, select: { slug: true } });
  await db.blogPost.delete({ where: { id } });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  if (current?.slug) {
    revalidatePath(`/blog/${current.slug}`);
  }
}

// ─── Reseller Applications ──────────────────────────────────────────────────

export async function approveResellerApplication(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const applicationId = String(formData.get("applicationId") || "");
  const userId = String(formData.get("userId") || "");
  if (!applicationId || !userId) return;

  await db.$transaction([
    db.resellerApplication.update({
      where: { id: applicationId },
      data: { status: "APPROVED" },
    }),
    db.user.update({
      where: { id: userId },
      data: { role: "RESELLER" },
    }),
    db.notification.create({
      data: {
        userId,
        type: "SYSTEM",
        title: "Bayi Başvurunuz Onaylandı!",
        message: "Tebrikler! Bayi statüsüne geçtiniz. Bayi panelinize erişebilirsiniz.",
        link: "/dashboard/reseller/customers",
      },
    }),
  ]);

  revalidatePath("/admin/reseller-applications");
  revalidatePath("/admin/users");
}

export async function rejectResellerApplication(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const applicationId = String(formData.get("applicationId") || "");
  if (!applicationId) return;

  const app = await db.resellerApplication.findUnique({
    where: { id: applicationId },
    select: { userId: true },
  });

  await db.resellerApplication.update({
    where: { id: applicationId },
    data: { status: "REJECTED" },
  });

  if (app?.userId) {
    await db.notification.create({
      data: {
        userId: app.userId,
        type: "SYSTEM",
        title: "Bayi Başvurunuz Değerlendirildi",
        message: "Başvurunuz bu aşamada onaylanamadı. Daha fazla bilgi için destek ekibimizle iletişime geçebilirsiniz.",
        link: "/dashboard/tickets",
      },
    });
  }

  revalidatePath("/admin/reseller-applications");
}

// ─── Markup Settings ──────────────────────────────────────────────────────────

export async function updateMarkupSettings(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const retail = Number(formData.get("retail_markup_percent") || 40);
  const reseller = Number(formData.get("reseller_markup_percent") || 15);
  const syncHours = Number(formData.get("service_sync_interval_hours") || 6);

  if (!Number.isFinite(retail) || retail < 0 || retail > 500) {
    throw new Error("Geçersiz perakende kar oranı.");
  }
  if (!Number.isFinite(reseller) || reseller < 0 || reseller > 500) {
    throw new Error("Geçersiz bayi kar oranı.");
  }
  if (!Number.isFinite(syncHours) || syncHours < 1 || syncHours > 168) {
    throw new Error("Geçersiz sync aralığı.");
  }

  await setSettings({
    retail_markup_percent: String(retail),
    reseller_markup_percent: String(reseller),
    service_sync_interval_hours: String(syncHours),
  });

  revalidatePath("/admin/settings/providers");
}

// ─── Announcements CRUD ─────────────────────────────────────────────────────

export async function createAnnouncementAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const active = formData.get("active") === "on";
  const pinned = formData.get("pinned") === "on";
  const sortOrder = Number(formData.get("sortOrder") || 0);

  if (!title || !content) {
    return;
  }

  await db.announcement.create({
    data: {
      title,
      content,
      active,
      pinned,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    },
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}

export async function updateAnnouncementAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const id = String(formData.get("id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const active = formData.get("active") === "on";
  const pinned = formData.get("pinned") === "on";
  const sortOrder = Number(formData.get("sortOrder") || 0);

  if (!id || !title || !content) {
    return;
  }

  await db.announcement.update({
    where: { id },
    data: {
      title,
      content,
      active,
      pinned,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    },
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}

export async function deleteAnnouncementAdmin(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const id = String(formData.get("id") || "").trim();
  if (!id) {
    return;
  }

  await db.announcement.delete({ where: { id } });

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}

// ─── Admin Support Tickets ───────────────────────────────────────────────────

export async function adminReplyTicket(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const ticketId = String(formData.get("ticketId") || "").trim();
  const message = String(formData.get("message") || "").trim();
  if (!ticketId || !message) return;

  await db.ticket.update({
    where: { id: ticketId },
    data: {
      status: "ANSWERED",
      messages: { create: { message, isAdmin: true } },
    },
  });

  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
}

export async function adminCloseTicket(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const ticketId = String(formData.get("ticketId") || "").trim();
  if (!ticketId) return;

  await db.ticket.update({ where: { id: ticketId }, data: { status: "CLOSED" } });

  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
}

export async function adminReopenTicket(formData: FormData) {
  const session = await auth();
  ensureAdmin(session);

  const ticketId = String(formData.get("ticketId") || "").trim();
  if (!ticketId) return;

  await db.ticket.update({ where: { id: ticketId }, data: { status: "OPEN" } });

  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
}
