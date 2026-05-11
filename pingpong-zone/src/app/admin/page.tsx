"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Reservation = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  table: { name: string };
  user: { name: string; email: string; phone?: string };
};

export default function AdminPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/reservations?all=true");
      if (res.status === 401 || res.status === 403) {
        router.push("/");
        return;
      }
      const data = await res.json();
      if (!cancelled) {
        setReservations(Array.isArray(data) ? data : []);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tick, router]);

  async function handleCancel(id: string) {
    if (!confirm("이 예약을 취소하시겠습니까?")) return;
    await fetch(`/api/reservations/${id}`, { method: "PATCH" });
    setTick((t) => t + 1);
  }

  const filtered = reservations.filter((r) => r.date === filterDate);
  const confirmed = filtered.filter((r) => r.status === "confirmed");

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">관리자 대시보드</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link href="/admin/users" className="bg-white rounded-xl shadow p-5 text-center hover:shadow-md transition">
          <div className="text-3xl mb-1">👥</div>
          <div className="font-semibold text-gray-700">회원 관리</div>
        </Link>
        <Link href="/admin/tables" className="bg-white rounded-xl shadow p-5 text-center hover:shadow-md transition">
          <div className="text-3xl mb-1">🏓</div>
          <div className="font-semibold text-gray-700">탁구대 관리</div>
        </Link>
        <Link href="/admin/notices" className="bg-white rounded-xl shadow p-5 text-center hover:shadow-md transition">
          <div className="text-3xl mb-1">📢</div>
          <div className="font-semibold text-gray-700">공지사항</div>
        </Link>
        <Link href="/admin/seasons" className="bg-white rounded-xl shadow p-5 text-center hover:shadow-md transition">
          <div className="text-3xl mb-1">🏆</div>
          <div className="font-semibold text-gray-700">시즌 관리</div>
        </Link>
        <Link href="/admin/disputes" className="bg-white rounded-xl shadow p-5 text-center hover:shadow-md transition">
          <div className="text-3xl mb-1">⚖️</div>
          <div className="font-semibold text-gray-700">분쟁 경기</div>
        </Link>
        <Link href="/admin/stats" className="bg-white rounded-xl shadow p-5 text-center hover:shadow-md transition">
          <div className="text-3xl mb-1">📊</div>
          <div className="font-semibold text-gray-700">이용 통계</div>
        </Link>
        <div className="bg-white rounded-xl shadow p-5 text-center">
          <div className="text-3xl font-bold text-green-700">{confirmed.length}</div>
          <div className="text-gray-500 mt-1 text-sm">선택 날짜 예약</div>
        </div>
        <div className="bg-white rounded-xl shadow p-5 text-center">
          <div className="text-3xl font-bold text-blue-600">
            {reservations.filter((r) => r.status === "confirmed").length}
          </div>
          <div className="text-gray-500 mt-1 text-sm">전체 확정 예약</div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <label className="font-semibold">날짜 조회</label>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <span className="text-gray-500 text-sm">{filtered.length}건</span>
      </div>

      {loading ? (
        <p className="text-gray-400">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400">해당 날짜 예약이 없습니다.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["탁구대", "시간", "회원명", "이메일", "연락처", "상태", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => (
                <tr key={r.id} className={r.status === "cancelled" ? "opacity-40" : ""}>
                  <td className="px-4 py-3 font-medium">{r.table.name}</td>
                  <td className="px-4 py-3">{r.startTime} ~ {r.endTime}</td>
                  <td className="px-4 py-3">{r.user.name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.user.email}</td>
                  <td className="px-4 py-3 text-gray-500">{r.user.phone || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      r.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"
                    }`}>
                      {r.status === "confirmed" ? "확정" : "취소"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "confirmed" && (
                      <button
                        onClick={() => handleCancel(r.id)}
                        className="text-red-400 hover:underline text-xs"
                      >
                        취소
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
