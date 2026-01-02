import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: process.env.PRISMA_ACCELERATE_URL
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
