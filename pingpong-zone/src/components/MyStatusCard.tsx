"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";

type Me = { id: string; name: string };
type Stats = {
  eloRating: number;
  stats: {
    total: number;
    wins: number;
    losses: number;
    winRate: number | null;
    isPlacing: boolean;
    placementLeft: number;
    streak: { type: "W" | "L"; count: number } | null;
  };
};

function getTier(elo: number) {
  if (elo >= 1400) return { name: "그랜드마스터", icon: "👑", color: "#d97706" };
  if (elo >= 1300) return { name: "마스터",       icon: "💎", color: "#7c3aed" };
  if (elo >= 1200) return { name: "다이아",       icon: "💠", color: "#2563eb" };
  if (elo >= 1100) return { name: "플래티넘",     icon: "🔷", color: "#0d9488" };
  if (elo >= 1000) return { name: "골드",         icon: "🥇", color: "#d97706" };
  if (elo >=  900) return { name: "실버",         icon: "🥈", color: "#64748b" };
  return                  { name: "브론즈",       icon: "🥉", color: "#c2410c" };
}

export default function MyStatusCard() {
  const [me, setMe] = useState<Me | null>(null);
  const [data, setData] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d?.id) { setMe(null); return; }
        setMe({ id: d.id, name: d.name });
        return fetch(`/api/players/${d.id}`).then((r) => r.json());
      })
      .then((d) => { if (d?.eloRating !== undefined) setData(d); })
      .catch(() => {});
  }, []);

  if (!me || !data) return null;

  const { stats } = data;
  const tier = stats.isPlacing ? null : getTier(data.eloRating);

  return (
    <Link
      href="/mypage/matches"
      className="flex items-center gap-3 rounded-2xl px-4 py-3.5 animate-slide-up"
      style={{ background: "linear-gradient(120deg, var(--jade-50) 0%, #f0fdf4 100%)", border: "1px solid var(--jade-200)", display: "flex" }}
    >
      <Avatar name={me.name} size="lg" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-[14px] truncate" style={{ color: "var(--text-1)" }}>{me.name}</span>
          {tier && (
            <span
              className="chip"
              style={{ background: "var(--jade-100)", color: tier.color, fontSize: "10px" }}
            >
              {tier.icon} {tier.name}
            </span>
          )}
          {stats.isPlacing && (
            <span className="chip" style={{ background: "#fff7ed", color: "#c2410c", fontSize: "10px" }}>
              🔰 배치중
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap" style={{ fontSize: "12px", color: "var(--text-3)" }}>
          <span>
            <span className="font-extrabold text-[15px]" style={{ color: "var(--jade-700)" }}>{data.eloRating}</span>
            <span className="ml-0.5">점</span>
          </span>
          <span style={{ color: "var(--border)" }}>·</span>
          <span>{stats.wins}승 {stats.losses}패</span>
          {stats.winRate !== null && (
            <>
              <span style={{ color: "var(--border)" }}>·</span>
              <span>승률 {stats.winRate}%</span>
            </>
          )}
          {stats.streak && stats.streak.count >= 2 && (
            <span
              className="chip"
              style={
                stats.streak.type === "W"
                  ? { background: "#fff7ed", color: "#c2410c" }
                  : { background: "#f1f5f9", color: "#64748b" }
              }
            >
              {stats.streak.type === "W" ? "🔥" : "❄️"} {stats.streak.count}{stats.streak.type === "W" ? "연승" : "연패"}
            </span>
          )}
        </div>

        {stats.isPlacing && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-3.5 h-1.5 rounded-full"
                style={{ background: i < stats.total ? "var(--jade-500)" : "var(--jade-100)" }}
              />
            ))}
            <span className="text-[11px] ml-0.5" style={{ color: "#c2410c" }}>
              신입보정 {stats.total}/5
            </span>
          </div>
        )}
      </div>

      <span className="text-[18px]" style={{ color: "var(--jade-300)" }}>›</span>
    </Link>
  );
}
