import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

process.on("SIGINT", async () => {
  console.log("🔌 Disconnecting Prisma (SIGINT)...");
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
