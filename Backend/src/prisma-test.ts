process.env.PRISMA_CLIENT_ENGINE_TYPE = "binary";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  console.log("✅ Prisma connected successfully");
  await prisma.$disconnect();
}

main().catch(console.error);
