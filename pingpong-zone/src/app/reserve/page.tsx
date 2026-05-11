"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00",
];

const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

type Table = { id: string; name: string; description: string };
type Reservation = { tableId: string; date: string; startTime: string; endTime: string; status: string };
type BlockedSlot = { tableId: string; date: string; startTime: string; endTime: string };

function CalendarPicker({ selected, onChange, min }: {
  selected: string;
  onChange: (d: string) => void;
  min: string;
}) {
  const todayDate = new Date();
  const [view, setView] = useState(() => {
    const d = selected ? new Date(selected + "T00:00:00") : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const monthStr = `${view.year}-${String(view.month + 1).padStart(2, "0")}`;
  const todayStr = todayDate.toISOString().split("T")[0];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    setView(v => {
      const d = new Date(v.year, v.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }
  function nextMonth() {
    setView(v => {
      const d = new Date(v.year, v.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return (
    <div className="border rounded-xl p-4 bg-gray-50 w-fit">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded-full text-gray-600 font-bold">‹</button>
        <span className="font-semibold text-gray-800">{view.year}년 {view.month + 1}월</span>
        <button type="button" onClick={nextMonth} className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded-full text-gray-600 font-bold">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK_DAYS.map((d, i) => (
          <div key={d} className={`text-center text-xs font-semibold py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"}`}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dayStr = `${monthStr}-${String(day).padStart(2, "0")}`;
          const isDisabled = dayStr < min;
          const isSelected = dayStr === selected;
          const isToday = dayStr === todayStr;
          const dow = new Date(dayStr + "T00:00:00").getDay();
          return (
            <button
              key={dayStr}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(dayStr)}
              className={`w-9 h-9 rounded-full text-sm font-medium transition ${
                isSelected
                  ? "bg-green-600 text-white shadow"
                  : isDisabled
                  ? "text-gray-300 cursor-not-allowed"
                  : isToday
                  ? "border-2 border-green-500 text-green-700 hover:bg-green-50"
                  : dow === 0
                  ? "text-red-500 hover:bg-red-50"
                  : dow === 6
                  ? "text-blue-500 hover:bg-blue-50"
                  : "text-gray-700 hover:bg-green-100"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ReservePage() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);
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
    fetch(`/api/availability?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data: Array<{ id: string; bookedSlots: Array<{ startTime: string; endTime: string; type: string }> }>) => {
        if (!Array.isArray(data)) return;
        const tableData = data.find((t) => t.id === selectedTable);
        if (!tableData) return;
        const res: Reservation[] = tableData.bookedSlots
          .filter((s) => s.type === "reserved")
          .map((s) => ({ tableId: selectedTable, date: selectedDate, startTime: s.startTime, endTime: s.endTime, status: "confirmed" }));
        const blk: BlockedSlot[] = tableData.bookedSlots
          .filter((s) => s.type === "blocked")
          .map((s) => ({ tableId: selectedTable, date: selectedDate, startTime: s.startTime, endTime: s.endTime }));
        setReservations(res);
        setBlocked(blk);
      });
  }, [selectedDate, selectedTable]);

  function getSlotStatus(time: string): "reserved" | "blocked" | "available" {
    if (reservations.some((r) => r.startTime <= time && r.endTime > time)) return "reserved";
    if (blocked.some((b) => b.startTime <= time && b.endTime > time)) return "blocked";
    return "available";
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
      body: JSON.stringify({ tableId: selectedTable, date: selectedDate, startTime: selectedTime, endTime }),
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

    router.push(`/reserve/confirm/${data.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">예약하기</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-6">
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

        <div>
          <label className="block font-semibold mb-2">날짜 선택</label>
          <CalendarPicker
            selected={selectedDate}
            onChange={(d) => { setSelectedDate(d); setSelectedTime(""); }}
            min={today}
          />
        </div>

        {selectedTable && selectedDate && (
          <div>
            <label className="block font-semibold mb-2">시간 선택 (1시간 단위)</label>
            <div className="grid grid-cols-4 gap-2">
              {TIME_SLOTS.map((time) => {
                const status = getSlotStatus(time);
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={status !== "available"}
                    onClick={() => setSelectedTime(time)}
                    className={`py-2 rounded-lg text-sm font-medium transition ${
                      status === "reserved"
                        ? "bg-red-100 text-red-400 cursor-not-allowed"
                        : status === "blocked"
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : selectedTime === time
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 hover:bg-green-100"
                    }`}
                  >
                    {time}
                    {status === "reserved" && <div className="text-xs">예약됨</div>}
                    {status === "blocked" && <div className="text-xs">불가</div>}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block border" /> 예약가능</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block" /> 예약됨</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> 이용불가</span>
            </div>
          </div>
        )}

        {message && (
          <p className="text-sm font-medium text-red-500">{message}</p>
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
