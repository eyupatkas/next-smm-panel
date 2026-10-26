import { db } from "@/lib/db";

type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
};

export async function createUserNotification(input: NotificationInput) {
  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
      },
    });
  } catch (error) {
    console.error("[notification] create failed", error);
  }
}

export async function createBulkUserNotifications(inputs: NotificationInput[]) {
  for (const item of inputs) {
    await createUserNotification(item);
  }
}

export async function notifyOrderCreated(input: {
  userId: string;
  orderId: string;
  serviceName: string;
  amount: number;
}) {
  await createUserNotification({
    userId: input.userId,
    type: "ORDER_UPDATE",
    title: "Sipariş alındı",
    message: `${input.serviceName} siparişiniz alındı. Tutar: ${input.amount.toFixed(2)} TL`,
    link: "/dashboard/orders",
  });
}

export async function notifyOrderStatus(input: {
  userId: string;
  orderId: string;
  serviceName: string;
  status: "PROCESSING" | "COMPLETED" | "PARTIAL" | "CANCELED";
  refundedAmount?: number;
}) {
  if (input.status === "PROCESSING") {
    await createUserNotification({
      userId: input.userId,
      type: "ORDER_UPDATE",
      title: "Sipariş işleme alındı",
      message: `${input.serviceName} siparişiniz işleme alındı.`,
      link: "/dashboard/orders",
    });
    return;
  }

  if (input.status === "COMPLETED") {
    await createUserNotification({
      userId: input.userId,
      type: "ORDER_UPDATE",
      title: "Sipariş tamamlandı",
      message: `${input.serviceName} siparişiniz başarıyla tamamlandı.`,
      link: "/dashboard/orders",
    });
    return;
  }

  if (input.status === "PARTIAL") {
    const refundNote = input.refundedAmount && input.refundedAmount > 0
      ? ` İade: ${input.refundedAmount.toFixed(2)} TL.`
      : "";

    await createUserNotification({
      userId: input.userId,
      type: "ORDER_UPDATE",
      title: "Sipariş kısmi tamamlandı",
      message: `${input.serviceName} siparişiniz kısmi tamamlandı.${refundNote}`,
      link: "/dashboard/orders",
    });
    return;
  }

  const cancelRefundNote = input.refundedAmount && input.refundedAmount > 0
    ? ` İade: ${input.refundedAmount.toFixed(2)} TL.`
    : "";

  await createUserNotification({
    userId: input.userId,
    type: "ORDER_UPDATE",
    title: "Sipariş iptal edildi",
    message: `${input.serviceName} siparişiniz iptal edildi.${cancelRefundNote}`,
    link: "/dashboard/orders",
  });
}

export async function notifyBalanceChange(input: {
  userId: string;
  title: string;
  message: string;
}) {
  await createUserNotification({
    userId: input.userId,
    type: "BALANCE",
    title: input.title,
    message: input.message,
    link: "/dashboard/add-funds",
  });
}

export async function notifyPaymentResult(input: {
  userId: string;
  ok: boolean;
  title?: string;
  message: string;
  link?: string;
}) {
  await createUserNotification({
    userId: input.userId,
    type: "PAYMENT",
    title: input.title ?? (input.ok ? "Ödeme başarılı" : "Ödeme başarısız"),
    message: input.message,
    link: input.link ?? "/dashboard/orders",
  });
}
