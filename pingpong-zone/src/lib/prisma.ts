import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Avoid instantiating Prisma during Next.js static build phase
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

function createPrismaClient() {
  if (isBuildPhase) return null as unknown as PrismaClient;
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
