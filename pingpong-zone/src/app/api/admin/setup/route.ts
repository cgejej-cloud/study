import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const SETUP_SECRET = process.env.SETUP_SECRET;
  if (!SETUP_SECRET) {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }
  const { secret } = await req.json().catch(() => ({}));
  if (secret !== SETUP_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  const run = async (sql: string, label: string) => {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push(`✅ ${label}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already exists")) {
        results.push(`⏭ ${label} (already exists)`);
      } else {
        results.push(`❌ ${label}: ${msg}`);
      }
    }
  };

  // Migration 0001: init
  await run(`CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL,"name" TEXT NOT NULL,"email" TEXT NOT NULL,"password" TEXT,"phone" TEXT,"role" TEXT NOT NULL DEFAULT 'user',"eloRating" INTEGER NOT NULL DEFAULT 1000,"emailNotify" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "User_pkey" PRIMARY KEY ("id"))`, "User table");
  await run(`CREATE TABLE IF NOT EXISTS "Table" ("id" TEXT NOT NULL,"name" TEXT NOT NULL,"description" TEXT,"isActive" BOOLEAN NOT NULL DEFAULT true,CONSTRAINT "Table_pkey" PRIMARY KEY ("id"))`, "Table table");
  await run(`CREATE TABLE IF NOT EXISTS "BlockedSlot" ("id" TEXT NOT NULL,"tableId" TEXT NOT NULL,"date" TEXT NOT NULL,"startTime" TEXT NOT NULL,"endTime" TEXT NOT NULL,"reason" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "BlockedSlot_pkey" PRIMARY KEY ("id"))`, "BlockedSlot table");
  await run(`CREATE TABLE IF NOT EXISTS "Season" ("id" TEXT NOT NULL,"name" TEXT NOT NULL,"startDate" TIMESTAMP(3) NOT NULL,"endDate" TIMESTAMP(3),"isActive" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Season_pkey" PRIMARY KEY ("id"))`, "Season table");
  await run(`CREATE TABLE IF NOT EXISTS "Reservation" ("id" TEXT NOT NULL,"userId" TEXT NOT NULL,"tableId" TEXT NOT NULL,"date" TEXT NOT NULL,"startTime" TEXT NOT NULL,"endTime" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'confirmed',"isRecurring" BOOLEAN NOT NULL DEFAULT false,"recurrenceEnd" TEXT,"parentId" TEXT,"reminderSent" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id"))`, "Reservation table");
  await run(`CREATE TABLE IF NOT EXISTS "Match" ("id" TEXT NOT NULL,"player1Id" TEXT NOT NULL,"player2Id" TEXT NOT NULL,"winnerId" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'confirmed',"p1Score" INTEGER,"p2Score" INTEGER,"p1EloChange" INTEGER,"p2EloChange" INTEGER,"confirmedAt" TIMESTAMP(3),"seasonId" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Match_pkey" PRIMARY KEY ("id"))`, "Match table");
  await run(`CREATE TABLE IF NOT EXISTS "Notice" ("id" TEXT NOT NULL,"title" TEXT NOT NULL,"content" TEXT NOT NULL,"isPinned" BOOLEAN NOT NULL DEFAULT false,"isActive" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Notice_pkey" PRIMARY KEY ("id"))`, "Notice table");
  await run(`CREATE TABLE IF NOT EXISTS "SeasonSnapshot" ("id" TEXT NOT NULL,"userId" TEXT NOT NULL,"seasonId" TEXT NOT NULL,"rating" INTEGER NOT NULL,"rank" INTEGER,"wins" INTEGER NOT NULL DEFAULT 0,"losses" INTEGER NOT NULL DEFAULT 0,CONSTRAINT "SeasonSnapshot_pkey" PRIMARY KEY ("id"))`, "SeasonSnapshot table");

  // indexes
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`, "User email index");
  await run(`CREATE INDEX IF NOT EXISTS "BlockedSlot_tableId_date_idx" ON "BlockedSlot"("tableId","date")`, "BlockedSlot index");
  await run(`CREATE INDEX IF NOT EXISTS "Reservation_userId_date_idx" ON "Reservation"("userId","date")`, "Reservation index 1");
  await run(`CREATE INDEX IF NOT EXISTS "Reservation_tableId_date_status_idx" ON "Reservation"("tableId","date","status")`, "Reservation index 2");
  await run(`CREATE INDEX IF NOT EXISTS "Reservation_date_status_idx" ON "Reservation"("date","status")`, "Reservation index 3");
  await run(`CREATE INDEX IF NOT EXISTS "Reservation_parentId_idx" ON "Reservation"("parentId")`, "Reservation index 4");
  await run(`CREATE INDEX IF NOT EXISTS "Match_player1Id_status_idx" ON "Match"("player1Id","status")`, "Match index 1");
  await run(`CREATE INDEX IF NOT EXISTS "Match_player2Id_status_idx" ON "Match"("player2Id","status")`, "Match index 2");
  await run(`CREATE INDEX IF NOT EXISTS "Match_status_createdAt_idx" ON "Match"("status","createdAt")`, "Match index 3");
  await run(`CREATE INDEX IF NOT EXISTS "Match_seasonId_idx" ON "Match"("seasonId")`, "Match index 4");
  await run(`CREATE INDEX IF NOT EXISTS "Notice_isActive_isPinned_createdAt_idx" ON "Notice"("isActive","isPinned","createdAt")`, "Notice index");
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "SeasonSnapshot_userId_seasonId_key" ON "SeasonSnapshot"("userId","seasonId")`, "SeasonSnapshot index");

  // foreign keys (ignore errors if already exist)
  await run(`ALTER TABLE "BlockedSlot" ADD CONSTRAINT "BlockedSlot_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "BlockedSlot FK");
  await run(`ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "Reservation FK userId");
  await run(`ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "Reservation FK tableId");
  await run(`ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE`, "Reservation FK parentId");
  await run(`ALTER TABLE "Match" ADD CONSTRAINT "Match_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "Match FK p1");
  await run(`ALTER TABLE "Match" ADD CONSTRAINT "Match_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "Match FK p2");
  await run(`ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "Match FK winner");
  await run(`ALTER TABLE "Match" ADD CONSTRAINT "Match_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE`, "Match FK season");
  await run(`ALTER TABLE "SeasonSnapshot" ADD CONSTRAINT "SeasonSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "SeasonSnapshot FK user");
  await run(`ALTER TABLE "SeasonSnapshot" ADD CONSTRAINT "SeasonSnapshot_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "SeasonSnapshot FK season");

  // Migration 0002: add features
  await run(`CREATE TABLE IF NOT EXISTS "PasswordResetToken" ("id" TEXT NOT NULL,"token" TEXT NOT NULL,"userId" TEXT NOT NULL,"expiresAt" TIMESTAMP(3) NOT NULL,"used" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"))`, "PasswordResetToken table");
  await run(`CREATE TABLE IF NOT EXISTS "Tournament" ("id" TEXT NOT NULL,"name" TEXT NOT NULL,"description" TEXT,"status" TEXT NOT NULL DEFAULT 'open',"maxPlayers" INTEGER NOT NULL DEFAULT 8,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id"))`, "Tournament table");
  await run(`CREATE TABLE IF NOT EXISTS "TournamentPlayer" ("id" TEXT NOT NULL,"tournamentId" TEXT NOT NULL,"userId" TEXT NOT NULL,"seed" INTEGER,CONSTRAINT "TournamentPlayer_pkey" PRIMARY KEY ("id"))`, "TournamentPlayer table");
  await run(`CREATE TABLE IF NOT EXISTS "TournamentMatch" ("id" TEXT NOT NULL,"tournamentId" TEXT NOT NULL,"round" INTEGER NOT NULL,"position" INTEGER NOT NULL,"player1Id" TEXT,"player2Id" TEXT,"winnerId" TEXT,"p1Score" INTEGER,"p2Score" INTEGER,"status" TEXT NOT NULL DEFAULT 'pending',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "TournamentMatch_pkey" PRIMARY KEY ("id"))`, "TournamentMatch table");
  await run(`CREATE TABLE IF NOT EXISTS "ErrorLog" ("id" TEXT NOT NULL,"message" TEXT NOT NULL,"stack" TEXT,"url" TEXT,"userId" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id"))`, "ErrorLog table");
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token")`, "PasswordResetToken index 1");
  await run(`CREATE INDEX IF NOT EXISTS "PasswordResetToken_token_idx" ON "PasswordResetToken"("token")`, "PasswordResetToken index 2");
  await run(`CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId")`, "PasswordResetToken index 3");
  await run(`CREATE INDEX IF NOT EXISTS "Tournament_status_createdAt_idx" ON "Tournament"("status","createdAt")`, "Tournament index");
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "TournamentPlayer_tournamentId_userId_key" ON "TournamentPlayer"("tournamentId","userId")`, "TournamentPlayer index 1");
  await run(`CREATE INDEX IF NOT EXISTS "TournamentPlayer_tournamentId_idx" ON "TournamentPlayer"("tournamentId")`, "TournamentPlayer index 2");
  await run(`CREATE INDEX IF NOT EXISTS "TournamentMatch_tournamentId_round_idx" ON "TournamentMatch"("tournamentId","round")`, "TournamentMatch index");
  await run(`CREATE INDEX IF NOT EXISTS "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt")`, "ErrorLog index");
  await run(`ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "PasswordResetToken FK");
  await run(`ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "TournamentPlayer FK tournament");
  await run(`ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "TournamentPlayer FK user");
  await run(`ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "TournamentMatch FK tournament");
  await run(`ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`, "TournamentMatch FK p1");
  await run(`ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`, "TournamentMatch FK p2");
  await run(`ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`, "TournamentMatch FK winner");

  // Migration 0003: social & events
  await run(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatar" TEXT`, "User.avatar column");
  await run(`ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "contentMd" TEXT`, "Notice.contentMd column");
  await run(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "eventId" TEXT`, "Match.eventId column");
  await run(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "eloMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0`, "Match.eloMultiplier column");
  await run(`CREATE TABLE IF NOT EXISTS "Follow" ("id" TEXT NOT NULL,"followerId" TEXT NOT NULL,"followingId" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Follow_pkey" PRIMARY KEY ("id"))`, "Follow table");
  await run(`CREATE TABLE IF NOT EXISTS "MatchChallenge" ("id" TEXT NOT NULL,"challengerId" TEXT NOT NULL,"challengedId" TEXT NOT NULL,"message" TEXT,"status" TEXT NOT NULL DEFAULT 'pending',"expiresAt" TIMESTAMP(3) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "MatchChallenge_pkey" PRIMARY KEY ("id"))`, "MatchChallenge table");
  await run(`CREATE TABLE IF NOT EXISTS "PushSubscription" ("id" TEXT NOT NULL,"userId" TEXT NOT NULL,"endpoint" TEXT NOT NULL,"p256dh" TEXT NOT NULL,"auth" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id"))`, "PushSubscription table");
  await run(`CREATE TABLE IF NOT EXISTS "ReservationWaitlist" ("id" TEXT NOT NULL,"userId" TEXT NOT NULL,"tableId" TEXT NOT NULL,"date" TEXT NOT NULL,"startTime" TEXT NOT NULL,"endTime" TEXT NOT NULL,"notified" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "ReservationWaitlist_pkey" PRIMARY KEY ("id"))`, "ReservationWaitlist table");
  await run(`CREATE TABLE IF NOT EXISTS "Event" ("id" TEXT NOT NULL,"name" TEXT NOT NULL,"description" TEXT,"type" TEXT NOT NULL,"config" JSONB NOT NULL,"startDate" TIMESTAMP(3) NOT NULL,"endDate" TIMESTAMP(3) NOT NULL,"isActive" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Event_pkey" PRIMARY KEY ("id"))`, "Event table");
  await run(`CREATE TABLE IF NOT EXISTS "TeamMatch" ("id" TEXT NOT NULL,"team1Player1Id" TEXT NOT NULL,"team1Player2Id" TEXT NOT NULL,"team2Player1Id" TEXT NOT NULL,"team2Player2Id" TEXT NOT NULL,"winnerTeam" INTEGER NOT NULL,"t1Score" INTEGER,"t2Score" INTEGER,"status" TEXT NOT NULL DEFAULT 'confirmed',"seasonId" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "TeamMatch_pkey" PRIMARY KEY ("id"))`, "TeamMatch table");
  await run(`CREATE TABLE IF NOT EXISTS "RankSnapshot" ("id" TEXT NOT NULL,"userId" TEXT NOT NULL,"rank" INTEGER NOT NULL,"eloRating" INTEGER NOT NULL,"snapshotDate" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "RankSnapshot_pkey" PRIMARY KEY ("id"))`, "RankSnapshot table");
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "Follow_followerId_followingId_key" ON "Follow"("followerId","followingId")`, "Follow index 1");
  await run(`CREATE INDEX IF NOT EXISTS "Follow_followerId_idx" ON "Follow"("followerId")`, "Follow index 2");
  await run(`CREATE INDEX IF NOT EXISTS "Follow_followingId_idx" ON "Follow"("followingId")`, "Follow index 3");
  await run(`CREATE INDEX IF NOT EXISTS "MatchChallenge_challengedId_status_idx" ON "MatchChallenge"("challengedId","status")`, "MatchChallenge index 1");
  await run(`CREATE INDEX IF NOT EXISTS "MatchChallenge_challengerId_idx" ON "MatchChallenge"("challengerId")`, "MatchChallenge index 2");
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint")`, "PushSubscription index 1");
  await run(`CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId")`, "PushSubscription index 2");
  await run(`CREATE INDEX IF NOT EXISTS "ReservationWaitlist_tableId_date_startTime_idx" ON "ReservationWaitlist"("tableId","date","startTime")`, "ReservationWaitlist index 1");
  await run(`CREATE INDEX IF NOT EXISTS "ReservationWaitlist_userId_idx" ON "ReservationWaitlist"("userId")`, "ReservationWaitlist index 2");
  await run(`CREATE INDEX IF NOT EXISTS "Event_isActive_startDate_endDate_idx" ON "Event"("isActive","startDate","endDate")`, "Event index");
  await run(`CREATE INDEX IF NOT EXISTS "Match_eventId_idx" ON "Match"("eventId")`, "Match eventId index");
  await run(`CREATE INDEX IF NOT EXISTS "TeamMatch_status_createdAt_idx" ON "TeamMatch"("status","createdAt")`, "TeamMatch index 1");
  await run(`CREATE INDEX IF NOT EXISTS "TeamMatch_seasonId_idx" ON "TeamMatch"("seasonId")`, "TeamMatch index 2");
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "RankSnapshot_userId_snapshotDate_key" ON "RankSnapshot"("userId","snapshotDate")`, "RankSnapshot index 1");
  await run(`CREATE INDEX IF NOT EXISTS "RankSnapshot_snapshotDate_idx" ON "RankSnapshot"("snapshotDate")`, "RankSnapshot index 2");
  await run(`ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "Follow FK follower");
  await run(`ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "Follow FK following");
  await run(`ALTER TABLE "MatchChallenge" ADD CONSTRAINT "MatchChallenge_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "MatchChallenge FK challenger");
  await run(`ALTER TABLE "MatchChallenge" ADD CONSTRAINT "MatchChallenge_challengedId_fkey" FOREIGN KEY ("challengedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "MatchChallenge FK challenged");
  await run(`ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "PushSubscription FK");
  await run(`ALTER TABLE "ReservationWaitlist" ADD CONSTRAINT "ReservationWaitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "ReservationWaitlist FK user");
  await run(`ALTER TABLE "ReservationWaitlist" ADD CONSTRAINT "ReservationWaitlist_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "ReservationWaitlist FK table");
  await run(`ALTER TABLE "Match" ADD CONSTRAINT "Match_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE`, "Match FK event");
  await run(`ALTER TABLE "TeamMatch" ADD CONSTRAINT "TeamMatch_team1Player1Id_fkey" FOREIGN KEY ("team1Player1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "TeamMatch FK t1p1");
  await run(`ALTER TABLE "TeamMatch" ADD CONSTRAINT "TeamMatch_team1Player2Id_fkey" FOREIGN KEY ("team1Player2Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "TeamMatch FK t1p2");
  await run(`ALTER TABLE "TeamMatch" ADD CONSTRAINT "TeamMatch_team2Player1Id_fkey" FOREIGN KEY ("team2Player1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "TeamMatch FK t2p1");
  await run(`ALTER TABLE "TeamMatch" ADD CONSTRAINT "TeamMatch_team2Player2Id_fkey" FOREIGN KEY ("team2Player2Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "TeamMatch FK t2p2");
  await run(`ALTER TABLE "TeamMatch" ADD CONSTRAINT "TeamMatch_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE`, "TeamMatch FK season");
  await run(`ALTER TABLE "RankSnapshot" ADD CONSTRAINT "RankSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE`, "RankSnapshot FK");

  // Migration 0004: reservationId on MatchChallenge
  await run(`ALTER TABLE "MatchChallenge" ADD COLUMN IF NOT EXISTS "reservationId" TEXT`, "MatchChallenge.reservationId column");
  await run(`ALTER TABLE "MatchChallenge" ADD CONSTRAINT "MatchChallenge_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE`, "MatchChallenge FK reservation");

  // Migration 0005: racketType / playStyle / title on User
  await run(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "racketType" TEXT`, "User.racketType column");
  await run(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "playStyle" TEXT`, "User.playStyle column");
  await run(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "title" TEXT`, "User.title column");

  // 어드민 계정 생성 (ADMIN_EMAIL / ADMIN_PASSWORD 환경변수 필요)
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: "admin", password: hashed },
      });
      results.push(`✅ 어드민 계정 업데이트: ${adminEmail}`);
    } else {
      await prisma.user.create({
        data: { name: "관리자", email: adminEmail, password: hashed, role: "admin" },
      });
      results.push(`✅ 어드민 계정 생성: ${adminEmail}`);
    }
  } else {
    results.push("⏭ 어드민 계정 생성 건너뜀 (ADMIN_EMAIL / ADMIN_PASSWORD 미설정)");
  }

  return NextResponse.json({ ok: true, results });
}
