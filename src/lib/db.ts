import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;
const isDev = process.env.NODE_ENV === "development";

const prismaClientSingleton = () => {
  const pool = new Pool({ 
    connectionString,
    max: isDev ? 2 : 10,
    idleTimeoutMillis: isDev ? 1000 : 5000,
    connectionTimeoutMillis: 5000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const db = globalThis.prisma ?? prismaClientSingleton();

globalThis.prisma = db;
