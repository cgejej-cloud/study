"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const TIME_SLOTS = [
  "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00",
];

const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

type Table = { id: string; name: string; description: string };
type Reservation = { tableId: string; date: string; startTime: string; endTime: string; status: string };
type BlockedSlot = { tableId: string; date: string; startTime: string; endTime: string };
type SlotStatus = "available" | "reserved" | "blocked";

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

function WeeklyCalendar({
  tableId,
  onSelect,
}: {
  tableId: string;
  onSelect: (date: string, time: string) => void;
}) {
  const todayObj = new Date();
  const todayStr = todayObj.toISOString().split("T")[0];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayObj);
    d.setDate(todayObj.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  type DayMap = { [time: string]: SlotStatus };
  const [data, setData] = useState<{ [date: string]: DayMap | "loading" }>({});

  const fetchDay = useCallback(async (date: string) => {
    setData(prev => ({ ...prev, [date]: "loading" }));
    try {
      const res = await fetch(`/api/availability?date=${date}`);
      const json: Array<{ id: string; bookedSlots: Array<{ startTime: string; endTime: string; type: string }> }> = await res.json();
      const tableData = Array.isArray(json) ? json.find(t => t.id === tableId) : undefined;
      const dayMap: DayMap = {};
      for (const slot of TIME_SLOTS) dayMap[slot] = "available";
      if (tableData) {
        for (const s of tableData.bookedSlots) {
          for (const slot of TIME_SLOTS) {
            if (s.startTime <= slot && s.endTime > slot) {
              dayMap[slot] = s.type === "reserved" ? "reserved" : "blocked";
            }
          }
        }
      }
      setData(prev => ({ ...prev, [date]: dayMap }));
    } catch {
      const dayMap: DayMap = {};
      for (const slot of TIME_SLOTS) dayMap[slot] = "available";
      setData(prev => ({ ...prev, [date]: dayMap }));
    }
  }, [tableId]);

  useEffect(() => {
    if (!tableId) return;
    for (const date of days) fetchDay(date);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  const nowHour = todayObj.getHours();

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <div className="min-w-[580px]">
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `72px repeat(7, 1fr)` }}>
          <div />
          {days.map(date => {
            const d = new Date(date + "T00:00:00");
            const dow = d.getDay();
            const isToday = date === todayStr;
            return (
              <div key={date} className="text-center pb-2">
                <div className={`text-[10px] font-semibold ${dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-gray-500"}`}>
                  {WEEK_DAYS[dow]}
                </div>
                <div
                  className={`text-xs font-bold mt-0.5 w-6 h-6 rounded-full flex items-center justify-center mx-auto ${isToday ? "text-white" : "text-gray-800"}`}
                  style={isToday ? { background: "var(--jade-600)" } : undefined}
                >
                  {d.getDate()}
                </div>
              </div>
            );
          })}

          {TIME_SLOTS.map(time => (
            <>
              <div key={`label-${time}`} className="flex items-center justify-end pr-2 text-[10px] font-medium text-gray-400" style={{ height: "34px" }}>
                {time}
              </div>
              {days.map(date => {
                const dayData = data[date];
                const isLoading = dayData === "loading" || dayData === undefined;
                const status: SlotStatus = isLoading ? "available" : ((dayData as DayMap)[time] ?? "available");
                const hour = Number(time.split(":")[0]);
                const isPast = date < todayStr || (date === todayStr && hour <= nowHour);

                return (
                  <div key={`${date}-${time}`} className="px-0.5 py-0.5">
                    {isLoading ? (
                      <div className="skeleton h-7 rounded" />
                    ) : (
                      <button
                        type="button"
                        disabled={status !== "available" || isPast}
                        onClick={() => onSelect(date, time)}
                        className={`w-full h-7 rounded text-[9px] font-semibold transition-all ${
                          status === "available" && !isPast ? "hover:scale-105 active:scale-95" : "cursor-not-allowed"
                        }`}
                        style={
                          status === "reserved"
                            ? { background: "#fee2e2", color: "#f87171" }
                            : status === "blocked"
                            ? { background: "var(--border)", color: "var(--muted)" }
                            : isPast
                            ? { background: "#f1f5f9", color: "#94a3b8" }
                            : { background: "var(--jade-100)", color: "var(--jade-700)" }
                        }
                        aria-label={`${date} ${time} ${status === "available" && !isPast ? "예약 가능" : status === "reserved" ? "예약됨" : "불가"}`}
                      >
                        {status === "reserved" ? "예약됨" : status === "blocked" ? "불가" : ""}
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>

        <div className="flex gap-4 mt-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded inline-block" style={{ background: "var(--jade-100)" }} /> 예약 가능
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded inline-block bg-red-100" /> 예약됨
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded inline-block bg-gray-200" /> 이용불가
          </span>
        </div>
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
  const [recurring, setRecurring] = useState(false);
  const [recurWeeks, setRecurWeeks] = useState(4);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [waitlistMsg, setWaitlistMsg] = useState<Record<string, string>>({});
  const [viewTab, setViewTab] = useState<"slots" | "weekly">("slots");

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

  async function handleWaitlist(time: string) {
    if (!selectedTable || !selectedDate) return;
    const endTime = `${String(Number(time.split(":")[0]) + 1).padStart(2, "0")}:00`;
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: selectedTable, date: selectedDate, startTime: time, endTime }),
    });
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    setWaitlistMsg((prev) => ({
      ...prev,
      [time]: res.ok ? "대기 등록 완료!" : (data.error || "대기 등록 실패"),
    }));
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
        tableId: selectedTable, date: selectedDate, startTime: selectedTime, endTime,
        recurring: recurring ? { weeks: recurWeeks } : null,
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

    router.push(`/reserve/confirm/${data.id}`);
  }

  function handleWeeklySelect(date: string, time: string) {
    setSelectedDate(date);
    setSelectedTime(time);
    setViewTab("slots");
  }

  const step = !selectedTable ? 1 : !selectedDate ? 2 : !selectedTime ? 3 : 4;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">예약하기</h1>

      {/* 단계 표시 */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { n: 1, label: "탁구대" },
          { n: 2, label: "날짜" },
          { n: 3, label: "시간" },
          { n: 4, label: "확정" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            {i > 0 && <div className={`h-px flex-1 w-6 ${step > s.n - 1 ? "bg-green-500" : "bg-gray-200"}`} />}
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${step >= s.n ? "text-green-700" : "text-gray-400"}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step > s.n ? "bg-green-600 text-white" : step === s.n ? "bg-green-700 text-white" : "bg-gray-200 text-gray-400"}`}>
                {step > s.n ? "✓" : s.n}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-6">
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

        {selectedTable && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="font-semibold">시간 선택 (1시간 단위)</label>
              <div className="flex rounded-full overflow-hidden border border-gray-200">
                <button
                  type="button"
                  onClick={() => setViewTab("slots")}
                  className={`px-3 py-1.5 text-xs font-semibold transition-all ${viewTab === "slots" ? "bg-green-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                >
                  시간 선택
                </button>
                <button
                  type="button"
                  onClick={() => setViewTab("weekly")}
                  className={`px-3 py-1.5 text-xs font-semibold transition-all ${viewTab === "weekly" ? "bg-green-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                >
                  주간 보기
                </button>
              </div>
            </div>

            {viewTab === "slots" && !selectedDate && (
              <p className="text-sm text-gray-400 text-center py-4">날짜를 먼저 선택해주세요.</p>
            )}

            {viewTab === "slots" && selectedDate && (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {TIME_SLOTS.map((time) => {
                    const status = getSlotStatus(time);
                    const wMsg = waitlistMsg[time];
                    return (
                      <div key={time} className="flex flex-col gap-1">
                        <button
                          type="button"
                          disabled={status !== "available"}
                          onClick={() => setSelectedTime(time)}
                          aria-label={`${time} ${status === "reserved" ? "예약됨" : status === "blocked" ? "예약 불가" : "예약 가능"}`}
                          className={`min-h-[44px] py-3 rounded-lg text-sm font-medium transition ${
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
                        {status === "reserved" && (
                          <button
                            type="button"
                            onClick={() => handleWaitlist(time)}
                            disabled={!!wMsg}
                            className="text-xs py-1 rounded-lg font-semibold transition bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                          >
                            {wMsg || "대기"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block border" /> 예약가능</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block" /> 예약됨</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> 이용불가</span>
                </div>
              </>
            )}

            {viewTab === "weekly" && (
              <WeeklyCalendar tableId={selectedTable} onSelect={handleWeeklySelect} />
            )}
          </div>
        )}

        {/* 정기 예약 */}
        {selectedTable && selectedDate && selectedTime && (
          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                className="w-4 h-4 accent-green-600 rounded"
              />
              <span className="text-sm font-semibold text-gray-700">매주 같은 요일·시간 반복 예약</span>
            </label>
            {recurring && (
              <div className="flex items-center gap-3 pl-7">
                <span className="text-sm text-gray-600">총</span>
                <select
                  value={recurWeeks}
                  onChange={(e) => setRecurWeeks(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {[2, 3, 4, 6, 8, 12].map((w) => (
                    <option key={w} value={w}>{w}주</option>
                  ))}
                </select>
                <span className="text-sm text-gray-600">동안 반복</span>
              </div>
            )}
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
