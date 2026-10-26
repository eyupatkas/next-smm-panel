import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { Role } from "@prisma/client";

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error("Set ADMIN_PASSWORD to a unique password of at least 12 characters.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await db.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: Role.ADMIN,
    },
    create: {
      email,
      name: "Admin",
      username: "admin",
      password: hashedPassword,
      role: Role.ADMIN,
      balance: 0,
    },
    select: { id: true, email: true, role: true },
  });

  console.log("Admin updated:", user);
  console.log("Admin password updated. Password is not logged.");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });

