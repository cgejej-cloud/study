"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";

type Player = {
  id: string;
  name: string;
  eloRating: number;
  joinedAt: string;
  stats: {
    total: number;
    wins: number;
    losses: number;
    winRate: number | null;
    isPlacing: boolean;
    placementLeft: number;
    streak: { type: "W" | "L"; count: number } | null;
    recentForm: ("W" | "L")[];
  };
  headToHead: null | { vsId: string; vsName: string; wins: number; losses: number };
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
    progress?: { current: number; target: number };
  }>;
  recentMatches: Array<{
    id: string;
    opponentId: string;
    opponentName: string;
    won: boolean;
    createdAt: string;
    myChange: number | null;
  }>;
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

export default function PlayerProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [player, setPlayer] = useState<Player | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/players/${id}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setPlayer)
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-3">
        <div className="text-4xl">🏓</div>
        <p className="text-gray-500 text-sm">선수 정보를 불러올 수 없습니다.</p>
        <Link href="/ranking" className="inline-block bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600">
          랭킹으로
        </Link>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse space-y-4">
        <div className="h-24 bg-gray-100 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/ranking" className="text-gray-400 hover:text-gray-600 text-lg" aria-label="랭킹으로 돌아가기">←</Link>
        <h1 className="text-2xl font-bold text-gray-900">선수 프로필</h1>
      </div>

      {/* 프로필 헤더 */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex items-center gap-4">
        <Avatar name={player.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-gray-900">{player.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            현재 포인트 <span className="font-bold text-green-700">{player.eloRating}점</span>
            {player.stats.isPlacing && (
              <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">🔰 신입 보정</span>
            )}
            {player.stats.streak && player.stats.streak.count >= 3 && (
              <span className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                player.stats.streak.type === "W" ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"
              }`}>
                {player.stats.streak.type === "W" ? "🔥" : "❄️"} {player.stats.streak.count}{player.stats.streak.type === "W" ? "연승" : "연패"}
              </span>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            가입일 · {new Date(player.joinedAt).toLocaleDateString("ko-KR")}
          </p>
          {player.stats.recentForm.length > 0 && (
            <div className="flex gap-1 mt-2" aria-label="최근 폼">
              {player.stats.recentForm.map((f, i) => (
                <span
                  key={i}
                  className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center ${
                    f === "W" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-600"
                  }`}
                  title={f === "W" ? "승" : "패"}
                >
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "총 경기", value: player.stats.total, color: "text-gray-800" },
          { label: "승", value: player.stats.wins, color: "text-blue-600" },
          { label: "패", value: player.stats.losses, color: "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 다시 도전 CTA */}
      {player.headToHead && (
        <Link
          href={`/ranking/record?opponent=${player.id}`}
          className="block bg-green-700 hover:bg-green-600 text-white font-semibold text-center py-3 rounded-xl transition-colors"
        >
          🏓 {player.name}님과 경기 기록하기
        </Link>
      )}

      {/* 헤드투헤드 */}
      {player.headToHead && (player.headToHead.wins + player.headToHead.losses > 0) && (
        <div className="bg-gradient-to-r from-blue-50 to-red-50 border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-600 mb-2 text-center">⚔️ 나와의 상대 전적</p>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-500">{player.headToHead.vsName} (나)</div>
              <div className="text-2xl font-bold text-blue-600">{player.headToHead.wins}</div>
              <div className="text-xs text-gray-400">승</div>
            </div>
            <div className="text-gray-300 text-xl font-light">vs</div>
            <div className="text-center">
              <div className="text-xs text-gray-500">{player.name}</div>
              <div className="text-2xl font-bold text-red-500">{player.headToHead.losses}</div>
              <div className="text-xs text-gray-400">승</div>
            </div>
          </div>
        </div>
      )}

      {player.stats.winRate !== null && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold text-gray-700">승률</span>
            <span className="font-bold text-green-700">{player.stats.winRate}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${player.stats.winRate}%` }} />
          </div>
        </div>
      )}

      {/* 업적 */}
      {player.badges && player.badges.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">🏅 업적</h2>
            <span className="text-xs text-gray-400">
              {player.badges.filter(b => b.earned).length} / {player.badges.length}
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {player.badges.map((b) => (
              <div
                key={b.id}
                title={`${b.name}\n${b.description}${b.progress ? ` (${b.progress.current}/${b.progress.target})` : ""}`}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-center p-1.5 transition-opacity ${
                  b.earned
                    ? "bg-gradient-to-br from-amber-50 to-yellow-100 border border-amber-200"
                    : "bg-gray-50 border border-gray-100 opacity-40"
                }`}
              >
                <div className="text-xl sm:text-2xl">{b.icon}</div>
                <div className={`text-[9px] sm:text-[10px] font-semibold mt-0.5 leading-tight ${b.earned ? "text-amber-800" : "text-gray-400"}`}>
                  {b.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 최근 경기 */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <span className="font-semibold text-gray-700 text-sm">최근 경기</span>
        </div>
        {player.recentMatches.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">아직 경기 기록이 없습니다.</div>
        ) : (
          <div className="divide-y">
            {player.recentMatches.map((m) => (
              <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                <div className={`w-1.5 h-10 rounded-full shrink-0 ${m.won ? "bg-blue-400" : "bg-red-300"}`} />
                <Link href={`/players/${m.opponentId}`} className="flex-1 min-w-0 group">
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="font-semibold text-gray-800 group-hover:text-green-700">{m.opponentName}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      m.won ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-500"
                    }`}>
                      {m.won ? "승" : "패"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{timeAgo(m.createdAt)}</div>
                </Link>
                {m.myChange !== null && (
                  <span className={`text-sm font-bold ${m.myChange >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {m.myChange >= 0 ? "+" : ""}{m.myChange}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
