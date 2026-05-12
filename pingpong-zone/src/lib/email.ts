const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.SMTP_FROM ?? "탁구존 <noreply@pingpongzone.kr>";

export async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log(`[Email 미설정] TO: ${to} | SUBJECT: ${subject}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Resend 전송 실패]", res.status, err);
    throw new Error(`Resend error ${res.status}`);
  }
}

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

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const link = `${BASE_URL}/reset-password?token=${token}`;
  await sendEmail(
    to,
    "[탁구존] 비밀번호 재설정",
    `<p>${name}님, 비밀번호 재설정을 요청하셨습니다.</p>
     <p>아래 링크를 클릭하여 비밀번호를 재설정해 주세요. 링크는 1시간 후 만료됩니다.</p>
     <p><a href="${link}">${link}</a></p>
     <p>본인이 요청하지 않으셨다면 이 이메일을 무시하세요.</p>`
  );
}

export async function sendWaitlistNotice(opts: {
  to: string;
  name: string;
  tableName: string;
  date: string;
  startTime: string;
  endTime: string;
}) {
  const { to, name, tableName, date, startTime, endTime } = opts;
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  await sendEmail(
    to,
    `[탁구존] 대기 중인 슬롯이 열렸습니다 — ${date} ${startTime}`,
    `<p>${name}님, 대기하셨던 슬롯에 자리가 생겼습니다!</p>
     <ul>
       <li>탁구대: <b>${tableName}</b></li>
       <li>날짜: <b>${date}</b></li>
       <li>시간: <b>${startTime} ~ ${endTime}</b></li>
     </ul>
     <p><a href="${BASE_URL}/reserve">지금 예약하러 가기</a></p>`
  );
}
