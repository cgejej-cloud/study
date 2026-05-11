"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";

type Standing = {
  id: string;
  name: string;
  rating: number;
  rank: number;
  wins: number;
  losses: number;
  delta?: number;
  winRate?: number | null;
};

type Payload = {
  season: { id: string; name: string; isClosed: boolean; endDate?: string; startDate?: string };
  standings: Standing[];
};

export default function SeasonStandingsPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/seasons/${id}/standings`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-3">
        <div className="text-4xl">🏆</div>
        <p className="text-gray-500 text-sm">시즌 정보를 불러올 수 없습니다.</p>
        <Link href="/ranking" className="inline-block bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600">
          랭킹으로
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-gray-100 rounded" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/ranking" className="text-gray-400 hover:text-gray-600 text-lg" aria-label="랭킹으로 돌아가기">←</Link>
        <h1 className="text-2xl font-bold text-gray-900">🏆 {data.season.name}</h1>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          data.season.isClosed ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"
        }`}>
          {data.season.isClosed ? "종료" : "진행 중"}
        </span>
      </div>

      {data.standings.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-10 text-center">
          <p className="text-4xl mb-3">🏓</p>
          <p className="font-semibold text-gray-700">시즌 경기 기록이 없습니다</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["순위", "선수", data.season.isClosed ? "최종 포인트" : "시즌 포인트", "승", "패"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.standings.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-400">
                    {s.rank === 1 ? "🥇" : s.rank === 2 ? "🥈" : s.rank === 3 ? "🥉" : `#${s.rank}`}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    <div className="flex items-center gap-2">
                      <Avatar name={s.name} size="sm" />
                      <Link href={`/players/${s.id}`} className="hover:text-green-700 hover:underline">{s.name}</Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-800">
                    {data.season.isClosed ? `${s.rating}점` : (
                      <span className={(s.delta ?? 0) >= 0 ? "text-green-600" : "text-red-500"}>
                        {(s.delta ?? 0) >= 0 ? "+" : ""}{s.delta ?? 0}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-blue-600 font-medium">{s.wins}</td>
                  <td className="px-4 py-3 text-red-400 font-medium">{s.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
