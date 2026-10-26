/**
 * PayTR ve Cryptomus'un göreli minimum tutarları.
 * Bu modül hem sunucu hem istemci tarafında kullanılabilir
 * (node API'lerine bağımlılık içermez).
 */

/** PayTR minimum tahsilat tutarı (TL). */
export const PAYTR_MINIMUM_PAYMENT_TL = 1;

/** Cryptomus, bu tutarın altında TL fatura açmayı reddediyor ("Minimum amount 20.00 TRY"). */
export const CRYPTOMUS_MINIMUM_TL = 20;
