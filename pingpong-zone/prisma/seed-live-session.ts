// 데모용 라이브 세션 1개 생성 — /spectate 페이지 시연
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 기존 활성 세션 + 관련 예약 정리
  const existing = await prisma.gameSession.findMany({ where: { status: "active" } });
  for (const s of existing) {
    await prisma.setScore.deleteMany({ where: { sessionId: s.id } });
    const resId = s.reservationId;
    await prisma.gameSession.delete({ where: { id: s.id } });
    await prisma.reservationParticipant.deleteMany({ where: { reservationId: resId } });
    await prisma.reservation.delete({ where: { id: resId } }).catch(() => {});
  }

  // 두 명의 데모 사용자 + 탁구대 + 예약(오늘 현재 시간대) 준비
  const seoyeon = await prisma.user.findUnique({ where: { email: "seoyeon@demo.local" } });
  const jiho    = await prisma.user.findUnique({ where: { email: "jiho@demo.local" } });
  const table   = await prisma.table.findFirst();
  if (!seoyeon || !jiho || !table) {
    console.log("⚠ 데모 사용자/탁구대 부족 — seed --with-users 먼저 실행하세요");
    return;
  }

  const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // KST
  const today = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours();
  const startTime = `${String(hour).padStart(2, "0")}:00`;
  const endTime   = `${String((hour + 1) % 24).padStart(2, "0")}:00`;

  // 기존 같은 시간 예약 정리 (참가자 → 예약 순서)
  const sameSlot = await prisma.reservation.findMany({
    where: { userId: seoyeon.id, date: today, startTime, tableId: table.id },
  });
  for (const r of sameSlot) {
    await prisma.reservationParticipant.deleteMany({ where: { reservationId: r.id } });
    await prisma.reservation.delete({ where: { id: r.id } }).catch(() => {});
  }

  const reservation = await prisma.reservation.create({
    data: {
      userId: seoyeon.id,
      tableId: table.id,
      date: today,
      startTime,
      endTime,
      status: "confirmed",
      participants: {
        create: [
          { userId: seoyeon.id },
          { userId: jiho.id },
        ],
      },
    },
  });

  const gs = await prisma.gameSession.create({
    data: {
      reservationId: reservation.id,
      matchType: "singles",
      config: { player1Id: seoyeon.id, player2Id: jiho.id },
      status: "active",
      sets: {
        create: [
          { setNumber: 1, team1Score: 11, team2Score: 7 },
          { setNumber: 2, team1Score: 9, team2Score: 11 },
        ],
      },
    },
    include: { sets: true },
  });

  console.log(`✅ 라이브 데모 세션 생성: ${gs.id}`);
  console.log(`   ${seoyeon.name} vs ${jiho.name} · ${table.name} · ${today} ${startTime}`);
  console.log(`   세트: 11-7 / 9-11 (1:1)`);
  console.log(`   /spectate 페이지에서 확인`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
