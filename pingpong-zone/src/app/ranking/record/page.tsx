"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type User = { id: string; name: string; eloRating: number };
type MatchResult = {
  match: { id: string };
  eloChange: Record<string, number>;
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

export default function RecordMatchPage() {
  const router = useRouter();
  const [myId, setMyId] = useState<string>("");
  const [myElo, setMyElo] = useState<number>(1000);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<User | null>(null);
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
    const me = users.find((u) => u.id === myId);
    if (me) setMyElo(me.eloRating);
  }, [users, myId]);

  const opponents = users.filter(
    (u) => u.id !== myId && u.name.includes(search)
  );

  async function handleSubmit() {
    if (!selectedOpponent || iWon === null) return;
    setLoading(true);
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opponentId: selectedOpponent.id, iWon }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setResult(data);
    }
  }

  if (result) {
    const myChange = result.eloChange[myId] ?? 0;
    const oppChange = result.eloChange[selectedOpponent!.id] ?? 0;
    return (
      <div className="max-w-md mx-auto py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">{iWon ? "🎉" : "💪"}</div>
          <h2 className="text-2xl font-bold mb-2">{iWon ? "승리!" : "패배"}</h2>
          <p className="text-gray-500 mb-6">경기 결과가 기록되었습니다</p>

          <div className="bg-gray-50 rounded-xl p-5 space-y-3 mb-6 text-sm">
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

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/ranking" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="text-3xl font-bold">경기 결과 기록</h1>
      </div>

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
            ) : (
              opponents.map((u) => (
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
                  <span className="font-medium">{u.name}</span>
                  <span className="text-sm text-gray-500">
                    {getTierIcon(u.eloRating)} {u.eloRating} ELO
                  </span>
                </button>
              ))
            )}
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
                  iWon === true
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 hover:border-green-300"
                }`}
              >
                🏆 승리
              </button>
              <button
                type="button"
                onClick={() => setIWon(false)}
                className={`py-6 rounded-xl border-2 font-bold text-lg transition ${
                  iWon === false
                    ? "border-red-400 bg-red-50 text-red-600"
                    : "border-gray-200 hover:border-red-300"
                }`}
              >
                😢 패배
              </button>
            </div>
          </div>
        )}

        {selectedOpponent && iWon !== null && (
          <div className="bg-gray-50 rounded-xl p-4 text-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">예상 ELO 변동</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>내 ELO ({myElo})</span>
              <span className={iWon ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                {(() => {
                  const exp = 1 / (1 + Math.pow(10, (selectedOpponent.eloRating - myElo) / 400));
                  const change = Math.round(32 * ((iWon ? 1 : 0) - exp));
                  return `${change >= 0 ? "+" : ""}${change}`;
                })()}
              </span>
            </div>
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
