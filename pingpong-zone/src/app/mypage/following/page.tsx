"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useToast } from "@/components/Toast";

type Player = {
  id: string;
  name: string;
  eloRating: number;
  avatar: string | null;
};

type SentChallenge = {
  id: string;
  message: string | null;
  expiresAt: string;
  createdAt: string;
  challenged: Player;
};

type ReceivedChallenge = {
  id: string;
  message: string | null;
  expiresAt: string;
  createdAt: string;
  challenger: Player;
};

function timeLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "만료됨";
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "1시간 미만";
  if (h < 24) return `${h}시간 후 만료`;
  return `${Math.floor(h / 24)}일 후 만료`;
}

function timeAgo(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "방금 전";
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function FollowingPage() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"following" | "followers" | "challenges">("following");
  const [following, setFollowing] = useState<Player[]>([]);
  const [followers, setFollowers] = useState<Player[]>([]);
  const [sentChallenges, setSentChallenges] = useState<SentChallenge[]>([]);
  const [receivedChallenges, setReceivedChallenges] = useState<ReceivedChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [unfollowing, setUnfollowing] = useState<Set<string>>(new Set());
  const [challenging, setChallenging] = useState<Set<string>>(new Set());
  const [challengeSentTo, setChallengeSentTo] = useState<Set<string>>(new Set());
  const [cancelling, setCancelling] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    const [fgRes, frRes, sentRes, rcvRes] = await Promise.all([
      fetch("/api/follow?type=following"),
      fetch("/api/follow?type=followers"),
      fetch("/api/challenges?type=sent"),
      fetch("/api/challenges"),
    ]);
    const [fg, fr, sent, rcv] = await Promise.all([
      fgRes.ok ? fgRes.json() : [],
      frRes.ok ? frRes.json() : [],
      sentRes.ok ? sentRes.json() : [],
      rcvRes.ok ? rcvRes.json() : [],
    ]);
    setFollowing(Array.isArray(fg) ? fg : []);
    setFollowers(Array.isArray(fr) ? fr : []);
    setSentChallenges(Array.isArray(sent) ? sent : []);
    setReceivedChallenges(Array.isArray(rcv) ? rcv : []);
    // Pre-mark already-pending challenges
    if (Array.isArray(sent)) {
      setChallengeSentTo(new Set(sent.map((c: SentChallenge) => c.challenged.id)));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const followerIds = new Set(followers.map((f) => f.id));

  async function handleUnfollow(playerId: string) {
    setUnfollowing((prev) => new Set(prev).add(playerId));
    const res = await fetch(`/api/follow/${playerId}`, { method: "DELETE" });
    if (res.ok) {
      setFollowing((prev) => prev.filter((p) => p.id !== playerId));
    }
    setUnfollowing((prev) => { const next = new Set(prev); next.delete(playerId); return next; });
  }

  async function handleChallenge(playerId: string, playerName: string) {
    if (challenging.has(playerId) || challengeSentTo.has(playerId)) return;
    setChallenging((prev) => new Set(prev).add(playerId));
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengedId: playerId }),
      });
      if (res.ok) {
        const data = await res.json();
        setChallengeSentTo((prev) => new Set(prev).add(playerId));
        setSentChallenges((prev) => [
          { id: data.id, message: null, expiresAt: data.expiresAt, createdAt: data.createdAt, challenged: { id: playerId, name: playerName, eloRating: 0, avatar: null } },
          ...prev,
        ]);
        toast.show(`${playerName}님께 경기를 신청했습니다!`, "success");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.show(data.error || "신청에 실패했습니다.", "error");
      }
    } finally {
      setChallenging((prev) => { const next = new Set(prev); next.delete(playerId); return next; });
    }
  }

  async function handleCancelChallenge(challengeId: string, challengedId: string) {
    setCancelling((prev) => new Set(prev).add(challengeId));
    const res = await fetch(`/api/challenges/${challengeId}`, { method: "DELETE" });
    if (res.ok) {
      setSentChallenges((prev) => prev.filter((c) => c.id !== challengeId));
      setChallengeSentTo((prev) => { const next = new Set(prev); next.delete(challengedId); return next; });
      toast.show("경기 신청을 취소했습니다.", "success");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.show(data.error || "취소에 실패했습니다.", "error");
    }
    setCancelling((prev) => { const next = new Set(prev); next.delete(challengeId); return next; });
  }

  async function handleChallengeAction(challengeId: string, action: "accept" | "reject") {
    const res = await fetch(`/api/challenges/${challengeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.show(data.error || "처리에 실패했습니다.", "error");
      return;
    }
    const data = await res.json();
    if (action === "accept" && data.redirectUrl) {
      router.push(data.redirectUrl);
      return;
    }
    setReceivedChallenges((prev) => prev.filter((c) => c.id !== challengeId));
    toast.show(action === "accept" ? "챌린지를 수락했습니다." : "거절했습니다.", "success");
  }

  const TABS = [
    { key: "following" as const, label: "팔로잉" },
    { key: "followers" as const, label: "팔로워" },
    { key: "challenges" as const, label: "경기 신청", badge: receivedChallenges.length + sentChallenges.length },
  ];

  const players = tab === "following" ? following : tab === "followers" ? followers : [];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/mypage" className="text-[18px]" style={{ color: "var(--text-3)" }} aria-label="마이페이지로 돌아가기">←</Link>
        <h1 className="font-extrabold text-[20px]" style={{ letterSpacing: "-0.03em", color: "var(--text-1)" }}>친구 관리</h1>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--jade-50)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all relative"
            style={tab === t.key
              ? { background: "var(--jade-950)", color: "#fff" }
              : { color: "var(--text-2)" }}
          >
            {t.label}
            {t.badge && t.badge > 0 ? (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{ background: "#ef4444", color: "#fff" }}
              >
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* 팔로잉 / 팔로워 */}
      {(tab === "following" || tab === "followers") && (
        <>
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
              {players.map((p) => {
                const isFriend = tab === "following" ? followerIds.has(p.id) : following.some((f) => f.id === p.id);
                const hasPendingChallenge = challengeSentTo.has(p.id);
                return (
                  <div key={p.id} className="card p-4 flex items-center gap-3">
                    <Link href={`/players/${p.id}`} className="shrink-0">
                      <Avatar name={p.name} size="md" />
                    </Link>
                    <Link href={`/players/${p.id}`} className="flex-1 min-w-0 group">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-[14px] group-hover:underline" style={{ color: "var(--text-1)" }}>{p.name}</p>
                        {isFriend && (
                          <span className="chip text-[10px] font-bold" style={{ background: "var(--jade-50)", color: "var(--jade-700)" }}>
                            친구
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>ELO {p.eloRating}점</p>
                    </Link>
                    <div className="flex gap-2 shrink-0">
                      {tab === "following" && (
                        <>
                          {hasPendingChallenge ? (
                            <span className="btn" style={{ fontSize: "11px", opacity: 0.5 }}>신청중</span>
                          ) : (
                            <Link
                              href={`/match/new?opponent=${p.id}`}
                              className="btn btn-jade"
                              style={{ fontSize: "11px" }}
                            >
                              ⚔️ 경기신청+예약
                            </Link>
                          )}
                          <button
                            onClick={() => handleUnfollow(p.id)}
                            disabled={unfollowing.has(p.id)}
                            className="btn"
                            style={{ fontSize: "11px", opacity: unfollowing.has(p.id) ? 0.5 : 1 }}
                          >
                            팔로우 취소
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 경기 신청 탭 */}
      {tab === "challenges" && (
        <div className="space-y-6">
          {/* 받은 신청 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-bold text-[14px]" style={{ color: "var(--text-1)" }}>받은 경기 신청</h2>
              {receivedChallenges.length > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {receivedChallenges.length}
                </span>
              )}
            </div>
            {loading ? (
              <div className="h-16 rounded-2xl animate-pulse" style={{ background: "var(--border)" }} />
            ) : receivedChallenges.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-[13px]" style={{ color: "var(--text-3)" }}>받은 경기 신청이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {receivedChallenges.map((c) => (
                  <div
                    key={c.id}
                    className="card p-4"
                    style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #eff6ff 100%)", border: "1px solid #e9d5ff" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <Link href={`/players/${c.challenger.id}`} className="text-[13px] font-semibold hover:underline" style={{ color: "#7c3aed" }}>
                          {c.challenger.name}
                        </Link>
                        <span className="text-[13px]" style={{ color: "var(--text-1)" }}>님이 경기를 신청했습니다</span>
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
                          ELO {c.challenger.eloRating}점 · {timeAgo(c.createdAt)} · {timeLeft(c.expiresAt)}
                        </p>
                        {c.message && (
                          <p className="text-[12px] mt-1 italic" style={{ color: "var(--text-2)" }}>&quot;{c.message}&quot;</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleChallengeAction(c.id, "accept")} className="btn btn-jade" style={{ fontSize: "12px" }}>
                          수락
                        </button>
                        <button onClick={() => handleChallengeAction(c.id, "reject")} className="btn" style={{ fontSize: "12px" }}>
                          거절
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 보낸 신청 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-bold text-[14px]" style={{ color: "var(--text-1)" }}>보낸 경기 신청</h2>
              {sentChallenges.length > 0 && (
                <span className="chip text-[11px]">{sentChallenges.length}</span>
              )}
            </div>
            {loading ? (
              <div className="h-16 rounded-2xl animate-pulse" style={{ background: "var(--border)" }} />
            ) : sentChallenges.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-[13px]" style={{ color: "var(--text-3)" }}>보낸 경기 신청이 없습니다.</p>
                <Link href="/ranking" className="btn btn-jade mx-auto mt-4" style={{ display: "inline-block" }}>
                  선수 찾기
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {sentChallenges.map((c) => (
                  <div key={c.id} className="card p-4" style={{ border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <Link href={`/players/${c.challenged.id}`} className="text-[13px] font-semibold hover:underline" style={{ color: "var(--jade-700)" }}>
                          {c.challenged.name}
                        </Link>
                        <span className="text-[13px]" style={{ color: "var(--text-1)" }}>님에게 신청함</span>
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
                          {timeAgo(c.createdAt)} · {timeLeft(c.expiresAt)}
                        </p>
                        {c.message && (
                          <p className="text-[12px] mt-1 italic" style={{ color: "var(--text-2)" }}>&quot;{c.message}&quot;</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleCancelChallenge(c.id, c.challenged.id)}
                        disabled={cancelling.has(c.id)}
                        className="btn"
                        style={{ fontSize: "12px", color: "#e11d48", opacity: cancelling.has(c.id) ? 0.5 : 1 }}
                      >
                        {cancelling.has(c.id) ? "취소 중..." : "취소"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
