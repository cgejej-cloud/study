-- AddColumn User.avatar
ALTER TABLE "User" ADD COLUMN "avatar" TEXT;

-- AddColumn Notice.contentMd
ALTER TABLE "Notice" ADD COLUMN "contentMd" TEXT;

-- AddColumns Match.eventId, Match.eloMultiplier
ALTER TABLE "Match" ADD COLUMN "eventId" TEXT;
ALTER TABLE "Match" ADD COLUMN "eloMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- CreateTable Follow
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable MatchChallenge
CREATE TABLE "MatchChallenge" (
    "id" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "challengedId" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable PushSubscription
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable ReservationWaitlist
CREATE TABLE "ReservationWaitlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReservationWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable Event
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable TeamMatch
CREATE TABLE "TeamMatch" (
    "id" TEXT NOT NULL,
    "team1Player1Id" TEXT NOT NULL,
    "team1Player2Id" TEXT NOT NULL,
    "team2Player1Id" TEXT NOT NULL,
    "team2Player2Id" TEXT NOT NULL,
    "winnerTeam" INTEGER NOT NULL,
    "t1Score" INTEGER,
    "t2Score" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "seasonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable RankSnapshot
CREATE TABLE "RankSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "eloRating" INTEGER NOT NULL,
    "snapshotDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RankSnapshot_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

CREATE INDEX "MatchChallenge_challengedId_status_idx" ON "MatchChallenge"("challengedId", "status");
CREATE INDEX "MatchChallenge_challengerId_idx" ON "MatchChallenge"("challengerId");

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

CREATE INDEX "ReservationWaitlist_tableId_date_startTime_idx" ON "ReservationWaitlist"("tableId", "date", "startTime");
CREATE INDEX "ReservationWaitlist_userId_idx" ON "ReservationWaitlist"("userId");

CREATE INDEX "Event_isActive_startDate_endDate_idx" ON "Event"("isActive", "startDate", "endDate");
CREATE INDEX "Match_eventId_idx" ON "Match"("eventId");

CREATE INDEX "TeamMatch_status_createdAt_idx" ON "TeamMatch"("status", "createdAt");
CREATE INDEX "TeamMatch_seasonId_idx" ON "TeamMatch"("seasonId");

CREATE UNIQUE INDEX "RankSnapshot_userId_snapshotDate_key" ON "RankSnapshot"("userId", "snapshotDate");
CREATE INDEX "RankSnapshot_snapshotDate_idx" ON "RankSnapshot"("snapshotDate");

-- ForeignKeys
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MatchChallenge" ADD CONSTRAINT "MatchChallenge_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchChallenge" ADD CONSTRAINT "MatchChallenge_challengedId_fkey" FOREIGN KEY ("challengedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReservationWaitlist" ADD CONSTRAINT "ReservationWaitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReservationWaitlist" ADD CONSTRAINT "ReservationWaitlist_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Match" ADD CONSTRAINT "Match_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TeamMatch" ADD CONSTRAINT "TeamMatch_team1Player1Id_fkey" FOREIGN KEY ("team1Player1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamMatch" ADD CONSTRAINT "TeamMatch_team1Player2Id_fkey" FOREIGN KEY ("team1Player2Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamMatch" ADD CONSTRAINT "TeamMatch_team2Player1Id_fkey" FOREIGN KEY ("team2Player1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamMatch" ADD CONSTRAINT "TeamMatch_team2Player2Id_fkey" FOREIGN KEY ("team2Player2Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamMatch" ADD CONSTRAINT "TeamMatch_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RankSnapshot" ADD CONSTRAINT "RankSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
