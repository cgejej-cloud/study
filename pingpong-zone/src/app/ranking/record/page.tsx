"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PLACEMENT_GAMES = 5;
const K_PLACEMENT = 48;
const K_NORMAL = 24;

type RankEntry = {
  id: string;
  name: string;
  eloRating: number;
  total: number;
  isPlacing: boolean;
  placementLeft: number;
};

type MatchResult = {
  match: { id: string };
  eloChange: Record<string, number>;
  placement: {
    me: { gamesPlayed: number; isPlacing: boolean };
    opponent: { gamesPlayed: number; isPlacing: boolean };
  };
};

function getTierIcon(elo: number) {
  if (elo >= 1400) return "👑";
  if (elo >= 1300) return "💎";
  if (elo >= 1200) return "💠";
  if (elo >= 1100) return "🔷";
  if (elo >= 1000) return "🥇";
  if (elo >= 900)  return "🥈";
  return "🥉";
}

function calcEloChange(myElo: number, oppElo: number, myGames: number, iWon: boolean) {
  const k = myGames < PLACEMENT_GAMES ? K_PLACEMENT : K_NORMAL;
  const expected = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
  return Math.round(k * ((iWon ? 1 : 0) - expected));
}

export default function RecordMatchPage() {
  const router = useRouter();
  const [myId, setMyId] = useState<string>("");
  const [me, setMe] = useState<RankEntry | null>(null);
  const [users, setUsers] = useState<RankEntry[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<RankEntry | null>(null);
  const [iWon, setIWon] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => {
      if (!d?.id) { router.push("/login"); return; }
      setMyId(d.id);
    });
    fetch("/api/ranking").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setUsers(data);
    });
  }, [router]);

  useEffect(() => {
    const found = users.find((u) => u.id === myId);
    if (found) setMe(found);
  }, [users, myId]);

  const opponents = users.filter((u) => u.id !== myId && u.name.includes(search));

  async function handleSubmit() {
    if (!selectedOpponent || iWon === null) return;
    setLoading(true);
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opponentId: selectedOpponent.id, iWon }),
    });
    setLoading(false);
    if (res.ok) setResult(await res.json());
  }

  if (result) {
    const myChange = result.eloChange[myId] ?? 0;
    const oppChange = result.eloChange[selectedOpponent!.id] ?? 0;
    const myPlacementAfter = result.placement.me;
    return (
      <div className="max-w-md mx-auto py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">{iWon ? "🎉" : "💪"}</div>
          <h2 className="text-2xl font-bold mb-2">{iWon ? "승리!" : "패배"}</h2>
          <p className="text-gray-500 mb-6">경기 결과가 기록되었습니다</p>

          <div className="bg-gray-50 rounded-xl p-5 space-y-3 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">내 ELO 변동</span>
              <span className={`font-bold text-lg ${myChange >= 0 ? "text-green-600" : "text-red-500"}`}>
                {myChange >= 0 ? "+" : ""}{myChange}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{selectedOpponent!.name} ELO 변동</span>
              <span className={`font-bold ${oppChange >= 0 ? "text-green-600" : "text-red-500"}`}>
                {oppChange >= 0 ? "+" : ""}{oppChange}
              </span>
            </div>
          </div>

          {myPlacementAfter.isPlacing && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 text-sm">
              <div className="font-semibold text-orange-700 mb-2">배치고사 진행 중</div>
              <div className="flex justify-center gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`w-5 h-5 rounded-full ${i < myPlacementAfter.gamesPlayed ? "bg-orange-400" : "bg-orange-100"}`} />
                ))}
              </div>
              <div className="text-orange-600">{myPlacementAfter.gamesPlayed}/5 완료 · {5 - myPlacementAfter.gamesPlayed}경기 남음</div>
            </div>
          )}

          <div className="flex gap-3">
            <Link href="/ranking" className="flex-1 bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-600 text-center">
              랭킹 확인
            </Link>
            <button
              onClick={() => { setResult(null); setSelectedOpponent(null); setIWon(null); }}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50"
            >
              추가 기록
            </button>
          </div>
        </div>
      </div>
    );
  }

  const myGames = me?.total ?? 0;
  const myElo = me?.eloRating ?? 1000;
  const myK = myGames < PLACEMENT_GAMES ? K_PLACEMENT : K_NORMAL;

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/ranking" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="text-3xl font-bold">경기 결과 기록</h1>
      </div>

      {me?.isPlacing && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5 text-sm">
          <div className="font-semibold text-orange-700 mb-1">배치고사 진행 중 (K={myK})</div>
          <div className="flex gap-1 mb-1">
            {Array.from({ length: PLACEMENT_GAMES }).map((_, i) => (
              <div key={i} className={`w-5 h-5 rounded-full ${i < myGames ? "bg-orange-400" : "bg-orange-100"}`} />
            ))}
          </div>
          <span className="text-orange-600">{me.placementLeft}경기 후 랭킹에 반영됩니다</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6 space-y-6">
        <div>
          <label className="block font-semibold mb-3">상대 선수 선택</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 검색"
            className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {opponents.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">검색 결과가 없습니다</p>
            ) : opponents.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedOpponent(u)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition ${
                  selectedOpponent?.id === u.id
                    ? "border-green-500 bg-green-50 ring-2 ring-green-400"
                    : "hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{u.name}</span>
                  {u.isPlacing && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">배치중</span>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {getTierIcon(u.eloRating)} {u.eloRating} ELO
                </span>
              </button>
            ))}
          </div>
        </div>

        {selectedOpponent && (
          <div>
            <label className="block font-semibold mb-3">경기 결과</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIWon(true)}
                className={`py-6 rounded-xl border-2 font-bold text-lg transition ${
                  iWon === true ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 hover:border-green-300"
                }`}
              >
                🏆 승리
              </button>
              <button
                type="button"
                onClick={() => setIWon(false)}
                className={`py-6 rounded-xl border-2 font-bold text-lg transition ${
                  iWon === false ? "border-red-400 bg-red-50 text-red-600" : "border-gray-200 hover:border-red-300"
                }`}
              >
                😢 패배
              </button>
            </div>
          </div>
        )}

        {selectedOpponent && iWon !== null && (
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
            <div className="font-semibold text-gray-700 mb-1">예상 ELO 변동</div>
            <div className="flex justify-between text-gray-600">
              <span>
                내 K값
                <span className={`ml-2 text-xs font-bold ${myGames < PLACEMENT_GAMES ? "text-orange-500" : "text-gray-500"}`}>
                  {myK} {myGames < PLACEMENT_GAMES ? "(배치중)" : ""}
                </span>
              </span>
              <span className={`font-bold ${iWon ? "text-green-600" : "text-red-500"}`}>
                {(() => {
                  const change = calcEloChange(myElo, selectedOpponent.eloRating, myGames, iWon);
                  return `${change >= 0 ? "+" : ""}${change}`;
                })()}
              </span>
            </div>
            {selectedOpponent.isPlacing && (
              <div className="text-xs text-orange-500">상대는 배치고사 중 (K={K_PLACEMENT})</div>
            )}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!selectedOpponent || iWon === null || loading}
          className="w-full bg-green-700 text-white py-3 rounded-lg font-bold hover:bg-green-600 disabled:opacity-40"
        >
          {loading ? "기록 중..." : "결과 저장"}
        </button>
      </div>
    </div>
  );
}
