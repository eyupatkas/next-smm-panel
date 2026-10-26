import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Panelde para tüm kullanıcı taraflarında 4 ondalık basamakla tutulur.
 * Kullanıcı sütunları Float (double precision) olduğu için Prisma'nın
 * increment/decrement'i ikilik kayan nokta artıkları biriktirir
 * (örn. -3.64e-14 gibi "eksi sıfır" bakiyeler). Bu yüzden bakiye/harcama
 * güncellemeleri bu yardımcı üzerinden, SQL tarafında 4 haneye yuvarlanarak
 * ve asla 0'ın altına inmeyecek şekilde yapılmalıdır.
 */
export type MoneyClient = PrismaClient | Prisma.TransactionClient;

/** Para değerini 4 ondalığa yuvarlar; -0 değerini 0'a normalize eder. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const rounded = Number(value.toFixed(4));
  return rounded === 0 ? 0 : rounded;
}

type UserMoneyDelta = {
  balance?: number;
  spent?: number;
};

/**
 * Kullanıcının balance ve/veya spent alanını tek atomik UPDATE ile günceller.
 * - PostgreSQL ROUND(numeric, 4) ile kayan nokta artıkları temizlenir.
 * - GREATEST(..., 0) ile alanlar asla negatif olamaz (overdraft koruması).
 * - $transaction içinde tx ile, dışarıda db ile çağrılabilir.
 * Satır bulunamazsa null döner.
 */
export async function applyUserMoneyDelta(
  client: MoneyClient,
  userId: string,
  deltas: UserMoneyDelta,
): Promise<{ balance: number; spent: number } | null> {
  const balanceDelta = roundMoney(deltas.balance ?? 0);
  const spentDelta = roundMoney(deltas.spent ?? 0);

  if (balanceDelta === 0 && spentDelta === 0) {
    const current = await client.$queryRaw<Array<{ balance: number; spent: number }>>`
      SELECT balance, spent FROM "User" WHERE id = ${userId}
    `;
    return current[0] ?? null;
  }

  const rows = await client.$queryRaw<Array<{ balance: number; spent: number }>>`
    UPDATE "User"
    SET balance = GREATEST(ROUND((COALESCE(balance, 0) + ${balanceDelta}::double precision)::numeric, 4), 0)::double precision,
        spent   = GREATEST(ROUND((COALESCE(spent, 0)   + ${spentDelta}::double precision)::numeric, 4), 0)::double precision
    WHERE id = ${userId}
    RETURNING balance, spent
  `;

  return rows[0] ?? null;
}
