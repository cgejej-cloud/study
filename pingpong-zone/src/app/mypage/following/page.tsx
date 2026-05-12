"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";

type Player = {
  id: string;
  name: string;
  eloRating: number;
  avatar: string | null;
};

export default function FollowingPage() {
  const [tab, setTab] = useState<"following" | "followers">("following");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [unfollowing, setUnfollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/follow?type=${tab}`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setPlayers(Array.isArray(d) ? d : []))
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, [tab]);

  async function handleUnfollow(playerId: string) {
    setUnfollowing((prev) => new Set(prev).add(playerId));
    const res = await fetch(`/api/follow/${playerId}`, { method: "DELETE" });
    if (res.ok) {
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    }
    setUnfollowing((prev) => {
      const next = new Set(prev);
      next.delete(playerId);
      return next;
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/mypage" className="text-[18px]" style={{ color: "var(--text-3)" }} aria-label="마이페이지로 돌아가기">←</Link>
        <h1 className="font-extrabold text-[20px]" style={{ letterSpacing: "-0.03em", color: "var(--text-1)" }}>팔로우</h1>
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--jade-50)" }}>
        {(["following", "followers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all"
            style={tab === t
              ? { background: "var(--jade-950)", color: "#fff" }
              : { color: "var(--text-2)" }}
          >
            {t === "following" ? "팔로잉" : "팔로워"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "var(--border)" }} />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">🏓</div>
          <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
            {tab === "following" ? "팔로우한 선수가 없습니다." : "팔로워가 없습니다."}
          </p>
          {tab === "following" && (
            <Link href="/ranking" className="btn btn-jade mx-auto mt-4" style={{ display: "inline-block" }}>
              선수 찾기
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {players.map((p) => (
            <div key={p.id} className="card p-4 flex items-center gap-3">
              <Link href={`/players/${p.id}`} className="shrink-0">
                <Avatar name={p.name} size="md" />
              </Link>
              <Link href={`/players/${p.id}`} className="flex-1 min-w-0 group">
                <p className="font-semibold text-[14px] group-hover:underline" style={{ color: "var(--text-1)" }}>{p.name}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>ELO {p.eloRating}점</p>
              </Link>
              {tab === "following" && (
                <button
                  onClick={() => handleUnfollow(p.id)}
                  disabled={unfollowing.has(p.id)}
                  className="btn"
                  style={{ fontSize: "12px", opacity: unfollowing.has(p.id) ? 0.5 : 1 }}
                >
                  팔로우 취소
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
