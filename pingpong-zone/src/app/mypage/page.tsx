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
};

export default function MyPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/reservations");
      if (res.status === 401) {
        router.push("/login");
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
    if (!confirm("예약을 취소하시겠습니까?")) return;
    await fetch(`/api/reservations/${id}`, { method: "PATCH" });
    setTick((t) => t + 1);
  }

  const today = new Date().toISOString().split("T")[0];
  const upcoming = reservations.filter((r) => r.status === "confirmed" && r.date >= today);
  const past = reservations.filter((r) => r.status !== "confirmed" || r.date < today);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">마이페이지</h1>
        <Link href="/mypage/edit" className="text-sm text-green-700 hover:underline font-medium border border-green-700 px-3 py-1.5 rounded-lg">
          내 정보 수정
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">예정된 예약</h2>
        {loading ? (
          <p className="text-gray-400">불러오는 중...</p>
        ) : upcoming.length === 0 ? (
          <p className="text-gray-400">예정된 예약이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((r) => (
              <div key={r.id} className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-green-700">{r.table.name}</span>
                  <span className="text-gray-500 ml-3">{r.date}</span>
                  <span className="text-gray-500 ml-2">{r.startTime} ~ {r.endTime}</span>
                </div>
                <button
                  onClick={() => handleCancel(r.id)}
                  className="text-sm text-red-500 hover:underline"
                >
                  취소
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">지난 예약</h2>
        {past.length === 0 ? (
          <p className="text-gray-400">지난 예약이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {past.map((r) => (
              <div key={r.id} className="bg-gray-100 rounded-xl p-4 flex items-center justify-between opacity-60">
                <div>
                  <span className="font-semibold">{r.table.name}</span>
                  <span className="text-gray-500 ml-3">{r.date}</span>
                  <span className="text-gray-500 ml-2">{r.startTime} ~ {r.endTime}</span>
                </div>
                <span className={`text-sm ${r.status === "cancelled" ? "text-red-400" : "text-gray-400"}`}>
                  {r.status === "cancelled" ? "취소됨" : "완료"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
