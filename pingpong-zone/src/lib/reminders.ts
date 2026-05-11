import { prisma } from "@/lib/prisma";
import { sendEmailIfEnabled } from "@/lib/email";

// 마지막 실행 시각 - 메모리 캐시로 1분에 1회만 실제 작업 수행
let lastRun = 0;
const COOLDOWN_MS = 60 * 1000;

// 1시간 이내 시작하는 confirmed 예약에 이메일 리마인더 발송
// 여러 곳에서 호출되어도 중복 발송되지 않도록 reminderSent 플래그로 가드
export async function sendUpcomingReservationReminders() {
  const now = Date.now();
  if (now - lastRun < COOLDOWN_MS) return;
  lastRun = now;

  try {
    const nowDate = new Date();
    const inOneHour = new Date(nowDate.getTime() + 60 * 60 * 1000);
    const today = nowDate.toISOString().split("T")[0];
    const tomorrow = inOneHour.toISOString().split("T")[0];

    const candidates = await prisma.reservation.findMany({
      where: {
        status: "confirmed",
        reminderSent: false,
        date: { in: [today, tomorrow] },
      },
      include: {
        user:  { select: { name: true, email: true, emailNotify: true } },
        table: { select: { name: true } },
      },
    });

    const upcoming = candidates.filter((r) => {
      const t = new Date(`${r.date}T${r.startTime}:00`).getTime();
      return t > nowDate.getTime() && t <= nowDate.getTime() + 60 * 60 * 1000;
    });

    for (const r of upcoming) {
      await sendEmailIfEnabled(
        r.user,
        `[탁구존] 예약 1시간 전 알림 — ${r.table.name} ${r.startTime}`,
        `<p>${r.user.name}님, 곧 예약 시간입니다!</p>
         <ul>
           <li>탁구대: <b>${r.table.name}</b></li>
           <li>시간: <b>${r.startTime} ~ ${r.endTime}</b></li>
         </ul>
         <p>늦지 않게 도착해주세요! 🏓</p>`
      );
      await prisma.reservation.update({
        where: { id: r.id },
        data:  { reminderSent: true },
      }).catch(() => {});
    }
  } catch (e) {
    console.error("[reminders]", e);
  }
}
