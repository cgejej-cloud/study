"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Stats = {
  summary: {
    totalUsers: number;
    todayRes: number;
    weekRes: number;
    monthRes: number;
    totalMatches: number;
    disputedCount: number;
  };
  hourStats: { hour: string; count: number }[];
  tableStats: { name: string; count: number }[];
  dowStats: { label: string; count: number }[];
};

function BarChart({ data, maxVal }: { data: { label: string; count: number }[]; maxVal: number }) {
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-8 text-right shrink-0">{d.label}</span>
          <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
            <div
              className="h-full bg-green-500 rounded transition-all"
              style={{ width: maxVal > 0 ? `${(d.count / maxVal) * 100}%` : "0%" }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-600 w-5 shrink-0">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminStatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => { if (r.status === 403) { router.push("/"); return null; } return r.json(); })
      .then(d => { if (d) { setStats(d); setLoading(false); } });
  }, [router]);

  if (loading) return <div className="text-gray-400 text-sm">불러오는 중...</div>;
  if (!stats)  return null;

  const maxHour = Math.max(...stats.hourStats.map(h => h.count), 1);
  const maxDow  = Math.max(...stats.dowStats.map(d => d.count), 1);
  const maxTable = Math.max(...stats.tableStats.map(t => t.count), 1);

  const summaryCards = [
    { label: "전체 회원", value: stats.summary.totalUsers, color: "text-gray-800" },
    { label: "오늘 예약", value: stats.summary.todayRes, color: "text-green-700" },
    { label: "이번 주 예약", value: stats.summary.weekRes, color: "text-blue-600" },
    { label: "이번 달 예약", value: stats.summary.monthRes, color: "text-purple-600" },
    { label: "총 경기 수", value: stats.summary.totalMatches, color: "text-amber-600" },
    { label: "이의제기 대기", value: stats.summary.disputedCount, color: stats.summary.disputedCount > 0 ? "text-red-500" : "text-gray-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="text-2xl font-bold text-gray-900">이용 통계</h1>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {summaryCards.map((c) => (
          <div key={c.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm text-center">
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* 시간대별 예약 */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">시간대별 예약 (전체)</h2>
          <BarChart data={stats.hourStats.map(h => ({ label: h.hour, count: h.count }))} maxVal={maxHour} />
        </div>

        {/* 요일별 예약 */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">요일별 예약 (전체)</h2>
          <BarChart data={stats.dowStats} maxVal={maxDow} />
        </div>
      </div>

      {/* 탁구대별 */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">탁구대별 예약 수</h2>
        <BarChart data={stats.tableStats.map(t => ({ label: t.name, count: t.count }))} maxVal={maxTable} />
      </div>

      {stats.summary.disputedCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-red-700">
            이의제기 대기 경기 {stats.summary.disputedCount}건이 있습니다.
          </p>
          <Link href="/admin/disputes"
            className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-500 transition-colors font-semibold">
            처리하러 가기
          </Link>
        </div>
      )}
    </div>
  );
}
