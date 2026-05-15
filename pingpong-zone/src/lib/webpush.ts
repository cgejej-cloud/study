import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const configured =
  !!process.env.VAPID_PUBLIC_KEY &&
  !!process.env.VAPID_PRIVATE_KEY &&
  !!process.env.VAPID_SUBJECT;

if (configured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

export type PushCategory = "match" | "challenge" | "general";

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  category: PushCategory = "general",
) {
  if (!configured) return;

  // 카테고리별 사용자 환경설정 확인 — "general" 은 항상 발송
  if (category !== "general") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notifyMatch: true, notifyChallenge: true },
    });
    if (user) {
      const allowed =
        category === "match"     ? user.notifyMatch     :
        category === "challenge" ? user.notifyChallenge : true;
      if (!allowed) return;
    }
  }

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const data = JSON.stringify({ ...payload, icon: payload.icon ?? "/icons/icon-192.png" });

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data,
        );
      } catch (err: unknown) {
        // 구독 만료(410) 또는 유효하지 않은 구독(404) → DB에서 제거
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
        }
      }
    }),
  );
}
