// 워밍 인스턴스에서 마이그레이션 중복 실행 방지용 모듈 싱글톤 플래그
let initialized = false;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (initialized) return;
  initialized = true;

  try {
    const { prisma } = await import("@/lib/prisma");
    const bcrypt = await import("bcryptjs");

    const run = async (sql: string) => {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch {
        // 이미 존재하거나 적용된 경우 무시
      }
    };

    // 컬럼 마이그레이션
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

    // Migration 0006: check-in / game session
    await run(`ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "checkInCode" TEXT`);
    await run(`CREATE TABLE IF NOT EXISTS "ReservationParticipant" ("id" TEXT NOT NULL, "reservationId" TEXT NOT NULL, "userId" TEXT NOT NULL, "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ReservationParticipant_pkey" PRIMARY KEY ("id"))`);
    await run(`CREATE UNIQUE INDEX IF NOT EXISTS "ReservationParticipant_reservationId_userId_key" ON "ReservationParticipant"("reservationId","userId")`);
    await run(`CREATE INDEX IF NOT EXISTS "ReservationParticipant_reservationId_idx" ON "ReservationParticipant"("reservationId")`);
    await run(`ALTER TABLE "ReservationParticipant" ADD CONSTRAINT "ReservationParticipant_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
    await run(`ALTER TABLE "ReservationParticipant" ADD CONSTRAINT "ReservationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
    await run(`CREATE TABLE IF NOT EXISTS "GameSession" ("id" TEXT NOT NULL, "reservationId" TEXT NOT NULL, "matchType" TEXT NOT NULL, "config" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id"))`);
    await run(`CREATE UNIQUE INDEX IF NOT EXISTS "GameSession_reservationId_key" ON "GameSession"("reservationId")`);
    await run(`ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
    await run(`CREATE TABLE IF NOT EXISTS "SetScore" ("id" TEXT NOT NULL, "sessionId" TEXT NOT NULL, "setNumber" INTEGER NOT NULL, "team1Score" INTEGER NOT NULL, "team2Score" INTEGER NOT NULL, "players" JSONB, "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SetScore_pkey" PRIMARY KEY ("id"))`);
    await run(`CREATE INDEX IF NOT EXISTS "SetScore_sessionId_idx" ON "SetScore"("sessionId")`);

    // 어드민 계정 자동 생성 (ADMIN_EMAIL / ADMIN_PASSWORD 환경변수 설정 시)
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      const existing = await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true, role: true } });
      if (existing) {
        if (existing.role !== "admin") {
          await prisma.user.update({ where: { email: adminEmail }, data: { role: "admin" } });
        }
      } else {
        const hashed = await bcrypt.default.hash(adminPassword, 10);
        await prisma.user.create({
          data: { name: "관리자", email: adminEmail, password: hashed, role: "admin" },
        });
      }
    }
  } catch (e) {
    initialized = false; // 실패 시 다음 콜드스타트에서 재시도
    console.error("[instrumentation] 초기화 오류:", e);
  }
}
