import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 탁구대 시드 데이터
  const tables = await Promise.all([
    prisma.table.upsert({
      where: { id: "table-1" },
      update: {},
      create: { id: "table-1", name: "1번 탁구대", description: "일반 탁구대" },
    }),
    prisma.table.upsert({
      where: { id: "table-2" },
      update: {},
      create: { id: "table-2", name: "2번 탁구대", description: "일반 탁구대" },
    }),
    prisma.table.upsert({
      where: { id: "table-3" },
      update: {},
      create: { id: "table-3", name: "3번 탁구대", description: "스마트 탁구대" },
    }),
    prisma.table.upsert({
      where: { id: "table-4" },
      update: {},
      create: { id: "table-4", name: "4번 탁구대", description: "스마트 탁구대" },
    }),
  ]);

  // 어드민 계정
  const hashedPassword = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@pingpongzone.kr" },
    update: {},
    create: {
      name: "관리자",
      email: "admin@pingpongzone.kr",
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log("Seed 완료:", tables.length, "개 탁구대 생성");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
