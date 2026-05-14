export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { prisma } = await import("@/lib/prisma");

  const run = async (sql: string) => {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      // 이미 존재하거나 적용된 경우 무시
    }
  };

  await run(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatar" TEXT`);
  await run(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nickname" TEXT`);
  await run(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT`);
  await run(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileColor" TEXT`);
  await run(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "racketType" TEXT`);
  await run(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "playStyle" TEXT`);
  await run(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "title" TEXT`);
  await run(`ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "contentMd" TEXT`);
  await run(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "eventId" TEXT`);
  await run(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "eloMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0`);
  await run(`ALTER TABLE "MatchChallenge" ADD COLUMN IF NOT EXISTS "reservationId" TEXT`);
  await run(`ALTER TABLE "MatchChallenge" ADD CONSTRAINT "MatchChallenge_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
}
