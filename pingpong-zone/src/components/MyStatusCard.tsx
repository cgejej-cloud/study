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
  if (elo >= 1400) return { name: "그랜드마스터", icon: "👑", color: "text-yellow-600" };
  if (elo >= 1300) return { name: "마스터",       icon: "💎", color: "text-purple-600" };
  if (elo >= 1200) return { name: "다이아",       icon: "💠", color: "text-blue-500" };
  if (elo >= 1100) return { name: "플래티넘",     icon: "🔷", color: "text-teal-600" };
  if (elo >= 1000) return { name: "골드",         icon: "🥇", color: "text-amber-500" };
  if (elo >= 900)  return { name: "실버",         icon: "🥈", color: "text-gray-500" };
  return                  { name: "브론즈",       icon: "🥉", color: "text-orange-400" };
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

  const tier = getTier(data.eloRating);

  return (
    <Link
      href="/mypage/matches"
      className="block bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        <Avatar name={me.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-gray-900 truncate">{me.name}</span>
            <span className={`text-xs font-semibold ${tier.color}`}>{tier.icon} {tier.name}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
            <span><span className="font-bold text-green-700">{data.eloRating}</span> 점</span>
            <span className="text-gray-300">·</span>
            <span>{data.stats.wins}승 {data.stats.losses}패</span>
            {data.stats.winRate !== null && (
              <>
                <span className="text-gray-300">·</span>
                <span>승률 {data.stats.winRate}%</span>
              </>
            )}
            {data.stats.streak && data.stats.streak.count >= 2 && (
              <>
                <span className="text-gray-300">·</span>
                <span className={data.stats.streak.type === "W" ? "text-orange-600 font-semibold" : "text-gray-500"}>
                  {data.stats.streak.type === "W" ? "🔥" : "❄️"} {data.stats.streak.count}{data.stats.streak.type === "W" ? "연승" : "연패"}
                </span>
              </>
            )}
          </div>
          {data.stats.isPlacing && (
            <p className="text-[11px] text-orange-600 mt-1">
              🔰 신입 보정 {5 - data.stats.placementLeft}/5 경기 완료
            </p>
          )}
        </div>
        <span className="text-gray-300 text-lg shrink-0">→</span>
      </div>
    </Link>
  );
}
