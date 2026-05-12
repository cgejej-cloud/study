"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type TeamMatchItem = {
  id: string;
  createdAt: string;
  winnerTeam: number;
  t1Score: number | null;
  t2Score: number | null;
  team1Player1: { id: string; name: string };
  team1Player2: { id: string; name: string };
  team2Player1: { id: string; name: string };
  team2Player2: { id: string; name: string };
  season: { name: string } | null;
};

function timeAgo(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(isoStr).toLocaleDateString("ko-KR");
}

export default function TeamMatchHistoryPage() {
  const router = useRouter();
  const [myId, setMyId] = useState("");
  const [matches, setMatches] = useState<TeamMatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [meRes, tmRes] = await Promise.all([
        fetch("/api/me"),
        fetch("/api/team-matches"),
      ]);
      if (tmRes.status === 401) { router.push("/login"); return; }
      const [me, tmData] = await Promise.all([meRes.json(), tmRes.json()]);
      if (me?.id) setMyId(me.id);
      setMatches(Array.isArray(tmData) ? tmData : []);
      setLoading(false);
    })();
  }, [router]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/mypage" className="text-gray-400 hover:text-gray-600 text-lg" aria-label="마이페이지로 돌아가기">←</Link>
        <h1 className="font-extrabold text-[20px]" style={{ letterSpacing: "-0.03em" }}>팀 더블스 기록</h1>
        <Link href="/ranking/doubles" className="ml-auto btn btn-jade" style={{ fontSize: "12px" }}>
          새 기록 입력
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <span className="font-semibold text-gray-700 text-sm">최근 더블스 기록</span>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : matches.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">더블스 기록이 없습니다.</div>
        ) : (
          <div className="divide-y">
            {matches.map((m) => {
              const myTeam = [m.team1Player1.id, m.team1Player2.id].includes(myId) ? 1 : 2;
              const iWon = m.winnerTeam === myTeam;
              const partner = myTeam === 1
                ? (m.team1Player1.id === myId ? m.team1Player2 : m.team1Player1)
                : (m.team2Player1.id === myId ? m.team2Player2 : m.team2Player1);
              const opp1 = myTeam === 1 ? m.team2Player1 : m.team1Player1;
              const opp2 = myTeam === 1 ? m.team2Player2 : m.team1Player2;
              const myScore = myTeam === 1 ? m.t1Score : m.t2Score;
              const oppScore = myTeam === 1 ? m.t2Score : m.t1Score;
              return (
                <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-1.5 h-12 rounded-full shrink-0 ${iWon ? "bg-blue-400" : "bg-red-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800">
                      <span className="text-green-700">나</span>
                      <span className="text-gray-400"> &amp; </span>
                      <span>{partner.name}</span>
                      <span className="text-gray-400 mx-1.5">vs</span>
                      <span>{opp1.name}</span>
                      <span className="text-gray-400"> &amp; </span>
                      <span>{opp2.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`chip text-xs font-medium px-2 py-0.5 rounded-full ${iWon ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-500"}`}>
                        {iWon ? "승리" : "패배"}
                      </span>
                      {myScore !== null && oppScore !== null && (
                        <span className="text-xs text-gray-500 font-mono">{myScore}-{oppScore}</span>
                      )}
                      {m.season && <span className="text-xs text-gray-400">{m.season.name}</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{timeAgo(m.createdAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
