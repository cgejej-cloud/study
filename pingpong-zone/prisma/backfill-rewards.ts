// 기존 confirmed 매치들에 대해 리워드 적립을 소급 적용
// 사용: npx tsx prisma/backfill-rewards.ts
import { PrismaClient } from "@prisma/client";
import { grantMatchRewards } from "../src/lib/rewards";

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany({
    where: { status: "confirmed" },
    select: { id: true, player1Id: true, player2Id: true, winnerId: true, confirmedAt: true, createdAt: true },
    orderBy: [{ confirmedAt: "asc" }, { createdAt: "asc" }],
  });

  console.log(`📦 ${matches.length} 개 confirmed 매치 백필 시작...`);
  let grantedCount = 0;
  for (const m of matches) {
    const ts = m.confirmedAt ?? m.createdAt;
    // 매치 시점(confirmedAt) 기준으로 streak/first_of_day가 정확히 잡히도록 시간 주입
    const r1 = await grantMatchRewards(m.id, m.player1Id, m.winnerId === m.player1Id, ts);
    const r2 = await grantMatchRewards(m.id, m.player2Id, m.winnerId === m.player2Id, ts);
    grantedCount += r1.length + r2.length;
  }
  console.log(`✅ 백필 완료: ${grantedCount}개 리워드 이벤트 적립`);

  const top = await prisma.user.findMany({
    where: { rewardPoints: { gt: 0 } },
    orderBy: { rewardPoints: "desc" },
    take: 5,
    select: { name: true, rewardPoints: true, totalMatches: true },
  });
  console.log("\n🏆 Top 5:");
  for (const t of top) console.log(`  ${t.name}: ${t.rewardPoints}pt (${t.totalMatches}경기)`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
