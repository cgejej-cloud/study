"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type Reservation = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  table: { name: string; description: string | null };
  user: { name: string; email: string };
};

export default function ReserveConfirmPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reservations/${id}`)
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) { setReservation(data); setLoading(false); }
      });
  }, [id, router]);

  if (loading) return <div className="text-center py-20 text-gray-400">불러오는 중...</div>;
  if (!reservation) return <div className="text-center py-20 text-gray-400">예약 정보를 찾을 수 없습니다.</div>;

  const dateObj = new Date(reservation.date + "T00:00:00");
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-green-700 mb-2">예약이 완료되었습니다!</h1>
        <p className="text-gray-500 mb-8">예약 내역을 확인해주세요</p>

        <div className="bg-green-50 rounded-xl p-6 text-left space-y-4 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">탁구대</span>
            <span className="font-bold text-green-700">{reservation.table.name}</span>
          </div>
          {reservation.table.description && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">종류</span>
              <span className="font-medium">{reservation.table.description}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">날짜</span>
            <span className="font-medium">
              {reservation.date} ({weekDays[dateObj.getDay()]})
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">시간</span>
            <span className="font-medium">{reservation.startTime} ~ {reservation.endTime}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">예약자</span>
            <span className="font-medium">{reservation.user.name}</span>
          </div>
          <div className="border-t border-green-200 pt-4 flex justify-between items-center">
            <span className="text-gray-500 text-sm">예약 번호</span>
            <span className="text-xs text-gray-400 font-mono">{reservation.id.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/mypage"
            className="flex-1 bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-600 text-center"
          >
            내 예약 확인
          </Link>
          <Link
            href="/reserve"
            className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 text-center"
          >
            추가 예약
          </Link>
        </div>
      </div>
    </div>
  );
}
