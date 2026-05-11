"use client";

import { useEffect, useState } from "react";

const HOURS = ["09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"];

type Slot = { startTime: string; endTime: string; type: "reserved" | "blocked"; reason?: string | null };
type TableStatus = { id: string; name: string; description: string | null; bookedSlots: Slot[] };

export default function TodayStatus() {
  const [tables, setTables] = useState<TableStatus[]>([]);
  const today = new Date().toISOString().split("T")[0];
  const nowHour = new Date().getHours();

  useEffect(() => {
    fetch(`/api/availability?date=${today}`)
      .then((r) => r.json())
      .then((data) => setTables(Array.isArray(data) ? data : []));
  }, [today]);

  function getSlotState(table: TableStatus, hour: string): "reserved" | "blocked" | "past" | "now" | "available" {
    const h = parseInt(hour);
    if (h < nowHour) return "past";
    if (h === nowHour) return "now";
    const slot = table.bookedSlots.find(
      (s) => s.startTime <= `${hour}:00` && s.endTime > `${hour}:00`
    );
    if (!slot) return "available";
    return slot.type;
  }

  if (tables.length === 0) return null;

  return (
    <section className="mt-8 bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">오늘의 예약 현황</h2>
        <span className="text-sm text-gray-400">{today}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left pr-3 py-1 font-semibold text-gray-600 w-24">탁구대</th>
              {HOURS.map((h) => (
                <th key={h} className="text-center py-1 font-medium text-gray-500 w-10">
                  {h}시
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tables.map((table) => (
              <tr key={table.id}>
                <td className="pr-3 py-2 font-semibold text-gray-700 text-sm">{table.name}</td>
                {HOURS.map((h) => {
                  const state = getSlotState(table, h);
                  return (
                    <td key={h} className="py-2 px-0.5">
                      <div
                        title={
                          state === "reserved" ? "예약됨" :
                          state === "blocked" ? "이용불가" :
                          state === "past" ? "지난시간" :
                          state === "now" ? "현재" : "예약가능"
                        }
                        className={`h-7 rounded text-center flex items-center justify-center text-xs font-medium ${
                          state === "reserved" ? "bg-red-400 text-white" :
                          state === "blocked" ? "bg-gray-400 text-white" :
                          state === "past" ? "bg-gray-100 text-gray-300" :
                          state === "now" ? "bg-yellow-400 text-white ring-2 ring-yellow-300" :
                          "bg-green-100 text-green-700"
                        }`}
                      >
                        {state === "reserved" ? "예약" :
                         state === "blocked" ? "불가" :
                         state === "past" ? "" :
                         state === "now" ? "현재" : "가능"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block" /> 예약가능</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> 예약됨</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-400 inline-block" /> 이용불가</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" /> 현재시간</span>
      </div>
    </section>
  );
}
