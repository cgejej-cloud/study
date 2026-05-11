"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00",
];

type Table = { id: string; name: string; description: string };
type Reservation = { tableId: string; date: string; startTime: string; endTime: string; status: string };

export default function ReservePage() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetch("/api/tables").then((r) => r.json()).then(setTables);
  }, []);

  useEffect(() => {
    if (!selectedDate || !selectedTable) return;
    fetch(`/api/reservations?date=${selectedDate}&tableId=${selectedTable}`)
      .then((r) => r.json())
      .then((data) => setReservations(Array.isArray(data) ? data : []));
  }, [selectedDate, selectedTable]);

  function isBooked(time: string) {
    return reservations.some(
      (r) =>
        r.tableId === selectedTable &&
        r.date === selectedDate &&
        r.status === "confirmed" &&
        r.startTime <= time &&
        r.endTime > time
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTable || !selectedDate || !selectedTime) return;
    setLoading(true);
    setMessage("");

    const endTime = `${String(Number(selectedTime.split(":")[0]) + 1).padStart(2, "0")}:00`;

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableId: selectedTable,
        date: selectedDate,
        startTime: selectedTime,
        endTime,
      }),
    });

    setLoading(false);

    if (res.status === 401) {
      router.push("/login");
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "예약 실패");
      return;
    }

    setMessage("✅ 예약이 완료되었습니다!");
    setSelectedTime("");
    // 예약 목록 새로고침
    fetch(`/api/reservations?date=${selectedDate}&tableId=${selectedTable}`)
      .then((r) => r.json())
      .then((d) => setReservations(Array.isArray(d) ? d : []));
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">예약하기</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-6">
        {/* 탁구대 선택 */}
        <div>
          <label className="block font-semibold mb-2">탁구대 선택</label>
          <div className="grid grid-cols-2 gap-3">
            {tables.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setSelectedTable(t.id); setSelectedTime(""); }}
                className={`border rounded-lg p-3 text-left transition ${
                  selectedTable === t.id
                    ? "border-green-600 bg-green-50 ring-2 ring-green-500"
                    : "hover:border-green-400"
                }`}
              >
                <div className="font-semibold">{t.name}</div>
                <div className="text-sm text-gray-500">{t.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 날짜 선택 */}
        <div>
          <label className="block font-semibold mb-2">날짜 선택</label>
          <input
            type="date"
            min={today}
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(""); }}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* 시간 선택 */}
        {selectedTable && selectedDate && (
          <div>
            <label className="block font-semibold mb-2">시간 선택 (1시간 단위)</label>
            <div className="grid grid-cols-4 gap-2">
              {TIME_SLOTS.map((time) => {
                const booked = isBooked(time);
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={booked}
                    onClick={() => setSelectedTime(time)}
                    className={`py-2 rounded-lg text-sm font-medium transition ${
                      booked
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : selectedTime === time
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 hover:bg-green-100"
                    }`}
                  >
                    {booked ? `${time} 마감` : time}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {message && (
          <p className={`text-sm font-medium ${message.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={!selectedTable || !selectedDate || !selectedTime || loading}
          className="w-full bg-green-700 text-white py-3 rounded-lg font-bold hover:bg-green-600 disabled:opacity-40"
        >
          {loading ? "처리 중..." : "예약 확정"}
        </button>
      </form>
    </div>
  );
}
