import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SAMPLE_NAMES = [
  "김민준", "이서연", "박지호", "최수아", "정도윤",
  "강하윤", "조시우", "윤예린", "임선우", "한지원",
];

async function main() {
  // 탁구대 시드 (idempotent)
  const tables = await Promise.all([
    prisma.table.upsert({ where: { id: "table-1" }, update: {},
      create: { id: "table-1", name: "1번 탁구대", description: "일반 탁구대" } }),
    prisma.table.upsert({ where: { id: "table-2" }, update: {},
      create: { id: "table-2", name: "2번 탁구대", description: "일반 탁구대" } }),
    prisma.table.upsert({ where: { id: "table-3" }, update: {},
      create: { id: "table-3", name: "3번 탁구대", description: "스마트 탁구대" } }),
    prisma.table.upsert({ where: { id: "table-4" }, update: {},
      create: { id: "table-4", name: "4번 탁구대", description: "스마트 탁구대" } }),
  ]);

  // 어드민
  const adminPass = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@pingpongzone.kr" },
    update: {},
    create: { name: "관리자", email: "admin@pingpongzone.kr", password: adminPass, role: "admin" },
  });

  // 데모 사용자 (--with-users 옵션 시)
  if (process.argv.includes("--with-users")) {
    const userPass = await bcrypt.hash("password1234", 10);
    for (const name of SAMPLE_NAMES) {
      const email = `${name}@demo.local`.toLowerCase();
      await prisma.user.upsert({
        where: { email },
        update: {},
        create: { name, email, password: userPass, eloRating: 950 + Math.floor(Math.random() * 200) },
      });
    }
    console.log(`데모 사용자 ${SAMPLE_NAMES.length}명 생성 (비밀번호: password1234)`);
  }

  // 활성 시즌 (--with-season 옵션)
  if (process.argv.includes("--with-season")) {
    const existing = await prisma.season.findFirst({ where: { isActive: true } });
    if (!existing) {
      await prisma.season.create({
        data: {
          name: `${new Date().getFullYear()} 시즌 1`,
          startDate: new Date(),
          isActive: true,
        },
      });
      console.log("활성 시즌 생성");
    }
  }

  // 샘플 공지 (--with-notice 옵션)
  if (process.argv.includes("--with-notice")) {
    const count = await prisma.notice.count();
    if (count === 0) {
      await prisma.notice.createMany({
        data: [
          { title: "탁구존 오픈 안내", content: "스마트 탁구장 예약/랭킹 서비스가 시작되었습니다 🎉", isPinned: true },
          { title: "랭킹 시스템 안내", content: "5경기 완료 시 정식 랭킹에 등록됩니다.", isPinned: false },
        ],
      });
      console.log("샘플 공지 2건 생성");
    }
  }

  console.log(`Seed 완료: 탁구대 ${tables.length}개`);
  console.log("어드민: admin@pingpongzone.kr / admin1234");
  console.log("옵션: --with-users  --with-season  --with-notice");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
