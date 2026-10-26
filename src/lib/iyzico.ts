/**
 * iyzico Ödeme Entegrasyon Yardımcı Modülü
 * Referans: https://dev.iyzipay.com/tr/odeme-formu/odeme-formu-baslatma
 */

// @ts-ignore
import Iyzipay from "iyzipay";
import { getSettings } from "@/lib/settings";
import { withGatewayRetry, GatewayPermanentError } from "@/lib/gateway-fetch";

export interface IyzicoConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

export async function getIyzicoConfig(): Promise<IyzicoConfig> {
  const s = await getSettings([
    "iyzico_api_key",
    "iyzico_secret_key",
    "iyzico_base_url",
  ]);
  return {
    apiKey: s.iyzico_api_key || "",
    secretKey: s.iyzico_secret_key || "",
    baseUrl: s.iyzico_base_url || "https://sandbox-api.iyzipay.com",
  };
}

export interface IyzicoInitializeParams {
  conversationId: string;
  price: string; // Toplam tutar (ondalıklı string, örn: "10.50")
  paidPrice: string; // Ödenen tutar (komisyonlu vb.)
  basketId: string; // Sipariş/Ödeme ID
  paymentGroup?: string; // DEFAULT
  callbackUrl: string; // Callback URL
  enabledInstallments?: number[]; // [1] (taksit istemiyorsak tek çekim)
  buyer: {
    id: string;
    name: string;
    surname: string;
    gsmNumber: string;
    email: string;
    identityNumber: string;
    registrationAddress: string;
    ip: string;
    city: string;
    country: string;
  };
  billingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
  };
  basketItems: Array<{
    id: string;
    name: string;
    category: string;
    itemType: string; // PHYSICAL veya VIRTUAL
    price: string;
  }>;
}

/**
 * iyzico Checkout Formunu başlatır ve HTML form kodunu/token'ı döner
 */
export async function createIyzicoCheckoutForm(params: IyzicoInitializeParams): Promise<{
  token: string;
  checkoutFormContent: string;
  paymentPageUrl: string;
}> {
  const config = await getIyzicoConfig();
  if (!config.apiKey || !config.secretKey) {
    throw new Error("iyzico API anahtarları veritabanında yapılandırılmamış.");
  }

  const iyzipay = new Iyzipay({
    apiKey: config.apiKey,
    secretKey: config.secretKey,
    uri: config.baseUrl,
  });

  const request = {
    locale: "tr",
    conversationId: params.conversationId,
    price: params.price,
    paidPrice: params.paidPrice,
    currency: "TRY",
    basketId: params.basketId,
    paymentGroup: params.paymentGroup || "PRODUCT",
    callbackUrl: params.callbackUrl,
    enabledInstallments: params.enabledInstallments || [1], // Tek çekim varsayılan
    buyer: {
      id: params.buyer.id,
      name: params.buyer.name,
      surname: params.buyer.surname,
      gsmNumber: params.buyer.gsmNumber,
      email: params.buyer.email,
      identityNumber: params.buyer.identityNumber,
      lastLoginDate: new Date().toISOString().slice(0, 19).replace("T", " "),
      registrationDate: new Date().toISOString().slice(0, 19).replace("T", " "),
      registrationAddress: params.buyer.registrationAddress,
      ip: params.buyer.ip,
      city: params.buyer.city,
      country: params.buyer.country,
    },
    shippingAddress: params.billingAddress, // SMM'de kargo adresi fatura adresiyle aynı
    billingAddress: params.billingAddress,
    basketItems: params.basketItems.map((item) => ({
      id: item.id,
      name: item.name,
      category1: item.category,
      itemType: item.itemType || "VIRTUAL",
      price: item.price,
    })),
  };

  // `err` yalnızca transport/ağ düzeyi başarısızlıklarda dolar (yeniden denenebilir);
  // kart reddi gibi iş kuralı hataları `result.status` üzerinden gelir (denenmez).
  return withGatewayRetry("iyzico", () =>
    new Promise<{ token: string; checkoutFormContent: string; paymentPageUrl: string }>(
      (resolve, reject) => {
        iyzipay.checkoutFormInitialize.create(request, (err: any, result: any) => {
          if (err) {
            return reject(err instanceof Error ? err : new Error(String(err)));
          }
          if (result.status !== "success") {
            return reject(
              new GatewayPermanentError(result.errorMessage || "iyzico form oluşturma başarısız.")
            );
          }
          resolve({
            token: result.token,
            checkoutFormContent: result.checkoutFormContent,
            paymentPageUrl: result.paymentPageUrl,
          });
        });
      }
    )
  );
}

/**
 * iyzico'dan dönen callback sonucunu sorgular ve doğrular
 */
export async function retrieveIyzicoCheckoutResult(token: string): Promise<{
  status: "SUCCESS" | "FAILURE";
  paymentId?: string;
  errorMessage?: string;
  basketId?: string;
  paidPrice?: number;
  rawResult?: any;
}> {
  const config = await getIyzicoConfig();
  const iyzipay = new Iyzipay({
    apiKey: config.apiKey,
    secretKey: config.secretKey,
    uri: config.baseUrl,
  });

  // Callback sonucu sorgusu da transport hatasına takılabilir; sonuç yanlışlıkla
  // FAILURE sayılmadan önce birkaç kez denenir.
  return withGatewayRetry("iyzico", () =>
    new Promise<{
      status: "SUCCESS" | "FAILURE";
      paymentId?: string;
      errorMessage?: string;
      basketId?: string;
      paidPrice?: number;
      rawResult?: any;
    }>((resolve, reject) => {
      iyzipay.checkoutForm.retrieve(
        {
          locale: "tr",
          token: token,
        },
        (err: any, result: any) => {
          if (err) {
            return reject(err instanceof Error ? err : new Error(String(err)));
          }

          if (result.status === "success" && result.paymentStatus === "SUCCESS") {
            resolve({
              status: "SUCCESS",
              paymentId: result.paymentId,
              basketId: result.basketId,
              paidPrice: Number(result.paidPrice),
              rawResult: result,
            });
          } else {
            resolve({
              status: "FAILURE",
              errorMessage: result.errorMessage || "Ödeme iyzico tarafından reddedildi veya tamamlanmadı.",
              basketId: result.basketId,
              rawResult: result,
            });
          }
        }
      );
    })
  );
}
