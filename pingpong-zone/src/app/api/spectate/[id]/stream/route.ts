import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 라이브 스코어 SSE 스트림 — 2초마다 DB 폴링, 변경 시에만 전송
// 클라이언트가 끊으면(abort) 자동 종료
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let lastHash = "";

  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: string, payload: unknown) {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
        } catch {
          if (intervalId) clearInterval(intervalId);
        }
      }

      async function poll() {
        const gs = await prisma.gameSession.findUnique({
          where: { id },
          include: { sets: { orderBy: { setNumber: "asc" } } },
        }).catch(() => null);

        if (!gs) {
          emit("end", { reason: "session_not_found" });
          if (intervalId) clearInterval(intervalId);
          try { controller.close(); } catch {}
          return;
        }

        // 상태 해시 — sets 개수+마지막 점수+config+status
        const lastSet = gs.sets[gs.sets.length - 1];
        const hash = JSON.stringify({
          sets: gs.sets.length,
          last: lastSet ? [lastSet.team1Score, lastSet.team2Score] : null,
          status: gs.status,
          cfg: gs.config,
        });

        if (hash !== lastHash) {
          lastHash = hash;
          let team1Sets = 0, team2Sets = 0;
          for (const s of gs.sets) {
            if (s.team1Score > s.team2Score) team1Sets++;
            else if (s.team2Score > s.team1Score) team2Sets++;
          }
          emit("update", {
            status: gs.status,
            matchType: gs.matchType,
            config: gs.config,
            team1Sets,
            team2Sets,
            sets: gs.sets.map((s) => ({ setNumber: s.setNumber, team1Score: s.team1Score, team2Score: s.team2Score })),
          });
        }

        if (gs.status === "completed") {
          emit("end", { reason: "completed" });
          if (intervalId) clearInterval(intervalId);
          try { controller.close(); } catch {}
        }
      }

      emit("connected", { id });
      await poll();
      intervalId = setInterval(poll, 2000);

      req.signal.addEventListener("abort", () => {
        if (intervalId) clearInterval(intervalId);
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
