import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: "user", NOT: { name: "(탈퇴한 회원)" } },
    select: { id: true, name: true, eloRating: true },
  });
  if (users.length < 4) { console.log("사용자 부족"); return; }

  const tables = await prisma.table.findMany();
  const season = await prisma.season.findFirst({ where: { isActive: true } });

  // 예약: 오늘 + 내일 각 사용자 1건
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < Math.min(6, users.length); i++) {
    const u = users[i];
    const t = tables[i % tables.length];
    const date = new Date(today); date.setDate(today.getDate() + (i % 2));
    const hour = 14 + (i % 6);
    await prisma.reservation.create({
      data: {
        userId: u.id, tableId: t.id,
        date: date.toISOString().split("T")[0],
        startTime: `${String(hour).padStart(2, "0")}:00`,
        endTime:   `${String(hour + 1).padStart(2, "0")}:00`,
      },
    });
  }

  // 매치: 사용자들 사이 confirmed 20건
  const k = 24;
  const elos = new Map(users.map((u) => [u.id, u.eloRating]));
  for (let i = 0; i < 20; i++) {
    const a = users[Math.floor(Math.random() * users.length)];
    let b = users[Math.floor(Math.random() * users.length)];
    while (b.id === a.id) b = users[Math.floor(Math.random() * users.length)];

    const ra = elos.get(a.id)!;
    const rb = elos.get(b.id)!;
    const aWon = Math.random() < 1 / (1 + Math.pow(10, (rb - ra) / 400));
    const exp = 1 / (1 + Math.pow(10, (rb - ra) / 400));
    const ach = Math.round(k * ((aWon ? 1 : 0) - exp));
    const bch = -ach;

    const winSets = 3;
    const loseSets = Math.floor(Math.random() * 3); // 0, 1, 2

    // 매치들을 2~22일 전으로 분산 (오늘의 한도에 영향 안 가도록)
    const daysAgo = 2 + i;
    const created = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    await prisma.match.create({
      data: {
        player1Id: a.id, player2Id: b.id,
        winnerId: aWon ? a.id : b.id,
        status: "confirmed",
        p1Score: aWon ? winSets : loseSets,
        p2Score: aWon ? loseSets : winSets,
        p1EloChange: ach,
        p2EloChange: bch,
        confirmedAt: created,
        seasonId: season?.id ?? null,
        createdAt: created,
      },
    });
    elos.set(a.id, ra + ach);
    elos.set(b.id, rb + bch);
  }

  // 사용자 elo 업데이트
  for (const [id, rating] of elos) {
    await prisma.user.update({ where: { id }, data: { eloRating: rating } });
  }

  // pending 매치 1건 (어드민이 본인에게 기록한 형태로 - 실제 시나리오엔 부적합하지만 시각화용)
  // 그냥 첫 두 사용자 사이로
  await prisma.match.create({
    data: {
      player1Id: users[0].id, player2Id: users[1].id,
      winnerId: users[0].id,
      status: "pending",
      p1Score: 3, p2Score: 1,
      p1EloChange: 12, p2EloChange: -12,
    },
  });

  console.log(`완료: 사용자 ${users.length}명, 예약 ${Math.min(6, users.length)}건, confirmed 매치 20건, pending 1건`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
