"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Season = {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
};

export default function SeasonsArchivePage() {
  const [seasons, setSeasons] = useState<Season[] | null>(null);

  useEffect(() => {
    fetch("/api/seasons")
      .then((r) => r.ok ? r.json() : { all: [] })
      .then((d) => setSeasons(d.all ?? []))
      .catch(() => setSeasons([]));
  }, []);

  if (seasons === null) {
    return (
      <div className="max-w-2xl mx-auto space-y-3 animate-pulse">
        <div className="h-8 w-32 bg-gray-100 rounded" />
        {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/ranking" className="text-gray-400 hover:text-gray-600 text-lg" aria-label="랭킹으로">←</Link>
        <h1 className="text-2xl font-bold text-gray-900">🏆 시즌 아카이브</h1>
      </div>

      {seasons.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-10 text-center">
          <p className="text-4xl mb-3">🏆</p>
          <p className="font-semibold text-gray-700">아직 시즌이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {seasons.map((s) => (
            <Link
              key={s.id}
              href={`/seasons/${s.id}`}
              className={`block bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow ${
                s.isActive ? "border-green-200" : "border-gray-100"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {s.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">진행 중</span>}
                    {s.endDate && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">종료</span>}
                    <span className="font-semibold text-gray-800 truncate">{s.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(s.startDate).toLocaleDateString("ko-KR")}
                    {s.endDate && ` ~ ${new Date(s.endDate).toLocaleDateString("ko-KR")}`}
                  </p>
                </div>
                <span className="text-gray-300 text-lg shrink-0">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
