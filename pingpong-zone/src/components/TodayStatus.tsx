"use client";

import { useEffect, useState } from "react";

const HOURS = ["09","10","11","12","13","14","15","16","17","18","19","20","21"];

type Slot = { startTime: string; endTime: string; type: "reserved" | "blocked"; reason?: string | null };
type TableStatus = { id: string; name: string; description: string | null; bookedSlots: Slot[] };

export default function TodayStatus() {
  const [tables, setTables] = useState<TableStatus[] | null>(null);
  const [error, setError] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const nowHour = new Date().getHours();

  useEffect(() => {
    fetch(`/api/availability?date=${today}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => setTables(Array.isArray(d) ? d : []))
      .catch(() => setError(true));
  }, [today]);

  function getSlotState(table: TableStatus, hour: string): "reserved" | "blocked" | "past" | "now" | "available" {
    const h = parseInt(hour);
    if (h < nowHour) return "past";
    if (h === nowHour) return "now";
    const slot = table.bookedSlots.find(s => s.startTime <= `${hour}:00` && s.endTime > `${hour}:00`);
    if (!slot) return "available";
    return slot.type;
  }

  if (error) return (
    <div className="card p-4">
      <p className="section-title mb-1">오늘의 예약 현황</p>
      <p className="text-[13px]" style={{ color: "var(--text-3)" }}>현황을 불러오는 중 오류가 발생했습니다.</p>
    </div>
  );

  if (tables === null) return (
    <div className="card p-4">
      <div className="skeleton h-4 w-32 mb-3" />
      <div className="space-y-2">
        {[1,2].map(i => <div key={i} className="skeleton h-8 rounded-xl" />)}
      </div>
    </div>
  );

  if (tables.length === 0) return (
    <div className="card p-4 text-center py-8">
      <p className="text-3xl mb-2">🏓</p>
      <p className="text-[13px]" style={{ color: "var(--text-3)" }}>등록된 탁구대가 없습니다.</p>
    </div>
  );

  const SLOT_STYLE: Record<string, React.CSSProperties> = {
    available: { background: "var(--jade-100)", color: "var(--jade-700)" },
    reserved:  { background: "#fecaca", color: "#b91c1c" },
    blocked:   { background: "#e2e8f0", color: "#64748b" },
    past:      { background: "#f1f5f9", color: "#cbd5e1" },
    now:       { background: "var(--sun-400)", color: "white", boxShadow: "0 0 0 2px var(--sun-500)" },
  };

  const SLOT_LABEL: Record<string, string> = {
    available: "가능",
    reserved: "예약",
    blocked: "불가",
    past: "",
    now: "현재",
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="section-title">📅 오늘의 예약 현황</p>
        <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{today}</span>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <table style={{ width: "100%", fontSize: "11px" }}>
          <thead>
            <tr>
              <th className="text-left pr-3 py-1 font-bold" style={{ color: "var(--text-3)", width: "80px", fontSize: "11px" }}>탁구대</th>
              {HOURS.map((h) => (
                <th key={h} className="text-center py-1 font-semibold" style={{ color: "var(--text-3)", width: "36px", fontSize: "10px" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tables.map((table) => (
              <tr key={table.id}>
                <td className="pr-3 py-1.5 font-bold text-[12px]" style={{ color: "var(--text-2)" }}>{table.name}</td>
                {HOURS.map((h) => {
                  const state = getSlotState(table, h);
                  return (
                    <td key={h} className="py-1.5 px-0.5">
                      <div
                        title={state}
                        className="h-6 rounded-lg flex items-center justify-center font-bold transition-all"
                        style={{ ...SLOT_STYLE[state], fontSize: "10px", minWidth: "28px" }}
                      >
                        {SLOT_LABEL[state]}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mt-3 flex-wrap" style={{ fontSize: "11px", color: "var(--text-3)" }}>
        {[
          { style: SLOT_STYLE.available, label: "예약가능" },
          { style: SLOT_STYLE.reserved,  label: "예약됨" },
          { style: SLOT_STYLE.blocked,   label: "이용불가" },
          { style: SLOT_STYLE.now,       label: "현재시간" },
        ].map(({ style, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: style.background as string }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
