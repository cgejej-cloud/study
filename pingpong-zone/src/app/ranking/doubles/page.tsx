"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Player = { id: string; name: string; eloRating: number };

function PlayerSearch({
  label,
  value,
  onSelect,
  excludeIds,
}: {
  label: string;
  value: Player | null;
  onSelect: (p: Player) => void;
  excludeIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 1) { setResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(
        (data.players ?? []).filter((p: Player) => !excludeIds.includes(p.id))
      );
      setOpen(true);
    }, 200);
    return () => clearTimeout(t);
  }, [query, excludeIds]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {value ? (
        <div className="flex items-center justify-between card px-3 py-2">
          <div>
            <span className="font-semibold text-sm text-gray-800">{value.name}</span>
            <span className="ml-2 text-xs text-gray-400">ELO {value.eloRating}</span>
          </div>
          <button
            type="button"
            onClick={() => { onSelect(null as unknown as Player); setQuery(""); }}
            className="text-xs text-red-400 hover:text-red-600"
          >
            변경
          </button>
        </div>
      ) : (
        <input
          type="text"
          placeholder="이름으로 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      )}
      {open && results.length > 0 && !value && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full text-left px-4 py-2.5 hover:bg-green-50 transition-colors"
              onClick={() => { onSelect(p); setQuery(""); setOpen(false); }}
            >
              <span className="font-semibold text-sm text-gray-800">{p.name}</span>
              <span className="ml-2 text-xs text-gray-400">ELO {p.eloRating}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DoublesRecordPage() {
  const router = useRouter();
  const [me, setMe] = useState<Player | null>(null);
  const [partner, setPartner] = useState<Player | null>(null);
  const [opp1, setOpp1] = useState<Player | null>(null);
  const [opp2, setOpp2] = useState<Player | null>(null);
  const [myTeamWon, setMyTeamWon] = useState<boolean | null>(null);
  const [t1Score, setT1Score] = useState("");
  const [t2Score, setT2Score] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/me").then(async (r) => {
      if (r.status === 401) { router.push("/login"); return; }
      const data = await r.json();
      if (data?.id) setMe({ id: data.id, name: data.name, eloRating: data.eloRating ?? 1000 });
    });
  }, [router]);

  const excludeIds = [me?.id, partner?.id, opp1?.id, opp2?.id].filter(Boolean) as string[];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!me || !partner || !opp1 || !opp2) {
      setError("4명의 선수를 모두 선택해주세요.");
      return;
    }
    if (myTeamWon === null) {
      setError("승패를 선택해주세요.");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/team-matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        team1Player2Id: partner.id,
        team2Player1Id: opp1.id,
        team2Player2Id: opp2.id,
        myTeam: 1,
        myTeamWon,
        t1Score: t1Score !== "" ? parseInt(t1Score, 10) : undefined,
        t2Score: t2Score !== "" ? parseInt(t2Score, 10) : undefined,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/mypage/team-matches"), 1500);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "기록에 실패했습니다.");
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="text-5xl mb-4">🏓</div>
        <h2 className="text-xl font-bold text-green-700 mb-2">기록 완료!</h2>
        <p className="text-gray-500 text-sm">더블스 기록이 저장되었습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="font-extrabold text-[20px]" style={{ letterSpacing: "-0.03em" }}>팀 더블스 기록 입력</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card p-5 space-y-4">
          <h2 className="section-title">팀 1 (내 팀)</h2>
          <div className="card px-3 py-2 bg-green-50 border border-green-200">
            <p className="text-xs font-semibold text-gray-500 mb-0.5">나 (기록자)</p>
            <p className="font-semibold text-sm text-gray-800">{me?.name ?? "로딩 중..."}</p>
          </div>
          <PlayerSearch
            label="파트너"
            value={partner}
            onSelect={setPartner}
            excludeIds={excludeIds.filter((id) => id !== partner?.id)}
          />
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="section-title">팀 2 (상대팀)</h2>
          <PlayerSearch
            label="상대 1"
            value={opp1}
            onSelect={setOpp1}
            excludeIds={excludeIds.filter((id) => id !== opp1?.id)}
          />
          <PlayerSearch
            label="상대 2"
            value={opp2}
            onSelect={setOpp2}
            excludeIds={excludeIds.filter((id) => id !== opp2?.id)}
          />
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="section-title">경기 결과</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMyTeamWon(true)}
              className={`py-3 rounded-xl font-semibold text-sm border-2 transition-colors ${
                myTeamWon === true
                  ? "bg-green-600 border-green-600 text-white"
                  : "border-gray-200 text-gray-600 hover:border-green-400"
              }`}
            >
              내 팀 승리
            </button>
            <button
              type="button"
              onClick={() => setMyTeamWon(false)}
              className={`py-3 rounded-xl font-semibold text-sm border-2 transition-colors ${
                myTeamWon === false
                  ? "bg-red-500 border-red-500 text-white"
                  : "border-gray-200 text-gray-600 hover:border-red-400"
              }`}
            >
              상대 팀 승리
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">세트 스코어 (선택사항)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="99"
                placeholder="내 팀"
                value={t1Score}
                onChange={(e) => setT1Score(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="text-gray-400 font-bold">:</span>
              <input
                type="number"
                min="0"
                max="99"
                placeholder="상대팀"
                value={t2Score}
                onChange={(e) => setT2Score(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-jade w-full py-3 text-base font-bold disabled:opacity-50"
        >
          {submitting ? "저장 중..." : "기록 저장"}
        </button>
      </form>
    </div>
  );
}
