import nodemailer from "nodemailer";

const configured =
  !!process.env.SMTP_HOST &&
  !!process.env.SMTP_USER &&
  !!process.env.SMTP_PASS;

const transporter = configured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_PORT === "465",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const FROM = process.env.SMTP_FROM ?? "탁구존 <noreply@pingpongzone.kr>";

export async function sendEmail(to: string, subject: string, html: string) {
  if (!transporter) {
    console.log(`[Email 미설정] TO: ${to} | SUBJECT: ${subject}`);
    return;
  }
  await transporter.sendMail({ from: FROM, to, subject, html });
}

// 사용자 알림 옵션을 존중하는 헬퍼 - 호출처가 깜빡할 수 없도록 단일 경로 제공
export async function sendEmailIfEnabled(
  user: { email: string | null; emailNotify: boolean } | null | undefined,
  subject: string,
  html: string,
) {
  if (!user?.email || !user.emailNotify) return;
  await sendEmail(user.email, subject, html).catch((e) => {
    console.error("[Email 전송 실패]", e);
  });
}

export async function sendReservationConfirm(opts: {
  to: string;
  name: string;
  tableName: string;
  date: string;
  startTime: string;
  endTime: string;
}) {
  const { to, name, tableName, date, startTime, endTime } = opts;
  await sendEmail(
    to,
    `[탁구존] 예약이 완료되었습니다 — ${date} ${startTime}`,
    `<p>${name}님, 예약이 확정되었습니다.</p>
     <ul>
       <li>탁구대: <b>${tableName}</b></li>
       <li>날짜: <b>${date}</b></li>
       <li>시간: <b>${startTime} ~ ${endTime}</b></li>
     </ul>
     <p>이용 1시간 전에 잊지 마세요! 🏓</p>`
  );
}

export async function sendMatchPendingNotice(opts: {
  to: string;
  opponentName: string;
  result: "win" | "loss";
}) {
  const { to, opponentName, result } = opts;
  await sendEmail(
    to,
    `[탁구존] ${opponentName}님이 경기를 기록했습니다`,
    `<p><b>${opponentName}</b>님이 경기를 기록했습니다.</p>
     <p>결과: 귀하의 <b>${result === "win" ? "승리" : "패배"}</b></p>
     <p>마이페이지에서 확인하거나 이의를 제기해 주세요. 24시간 내 미확인 시 자동 승인됩니다.</p>
     <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/mypage">마이페이지 바로가기</a>`
  );
}
