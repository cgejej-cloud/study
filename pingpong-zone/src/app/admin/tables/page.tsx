"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";

const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00",
];

type Table = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count: { reservations: number };
};

type BlockedSlot = {
  id: string;
  tableId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string | null;
  table: { name: string };
};

export default function AdminTablesPage() {
  const router = useRouter();
  const toast = useToast();
  const [tables, setTables] = useState<Table[]>([]);
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [loading, setLoading] = useState(true);
  const [blockTableId, setBlockTableId] = useState("");
  const [blockDate, setBlockDate] = useState(new Date().toISOString().split("T")[0]);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");

  useEffect(() => {
    fetch("/api/admin/tables")
      .then((r) => {
        if (r.status === 401 || r.status === 403) { router.push("/"); return null; }
        return r.json();
      })
      .then((data) => { if (data) { setTables(data); setLoading(false); } });
  }, [router]);

  useEffect(() => {
    fetch("/api/admin/blocked")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setBlocked(data); });
  }, []);

  function startEdit(table: Table) {
    setEditing(table.id);
    setEditName(table.name);
    setEditDesc(table.description || "");
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/admin/tables/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDesc }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTables((prev) => prev.map((t) => t.id === id ? { ...t, ...updated } : t));
      setEditing(null);
      toast.show("탁구대 정보를 수정했습니다.", "success");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.show(data.error || "수정에 실패했습니다.", "error");
    }
  }

  async function toggleActive(table: Table) {
    const res = await fetch(`/api/admin/tables/${table.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !table.isActive }),
    });
    if (res.ok) {
      setTables((prev) => prev.map((t) => t.id === table.id ? { ...t, isActive: !t.isActive } : t));
      toast.show(`${table.name} ${!table.isActive ? "활성화" : "비활성화"}했습니다.`, "success");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.show(data.error || "변경에 실패했습니다.", "error");
    }
  }

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!blockTableId || !blockDate || !blockStart || !blockEnd) return;
    if (blockStart >= blockEnd) {
      toast.show("종료 시간이 시작 시간보다 커야 합니다.", "error");
      return;
    }
    const res = await fetch("/api/admin/blocked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: blockTableId, date: blockDate, startTime: blockStart, endTime: blockEnd, reason: blockReason || null }),
    });
    if (res.ok) {
      const slot = await res.json();
      setBlocked((prev) => [...prev, slot]);
      setBlockStart("");
      setBlockEnd("");
      setBlockReason("");
      toast.show("차단 시간을 추가했습니다.", "success");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.show(data.error || "추가에 실패했습니다.", "error");
    }
  }

  async function removeBlock(id: string) {
    if (!confirm("차단을 해제하시겠습니까?")) return;
    const res = await fetch(`/api/admin/blocked/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBlocked((prev) => prev.filter((b) => b.id !== id));
      toast.show("차단을 해제했습니다.", "success");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.show(data.error || "해제에 실패했습니다.", "error");
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="text-3xl font-bold">탁구대 관리</h1>
      </div>

      {loading ? (
        <p className="text-gray-400">불러오는 중...</p>
      ) : (
        <div className="grid gap-4 mb-10">
          {tables.map((table) => (
            <div key={table.id} className={`bg-white rounded-xl shadow p-5 ${!table.isActive ? "opacity-60" : ""}`}>
              {editing === table.id ? (
                <div className="flex gap-3 items-start">
                  <div className="flex-1 space-y-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="설명"
                      className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <button onClick={() => saveEdit(table.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">저장</button>
                  <button onClick={() => setEditing(null)} className="text-gray-400 px-2 py-1.5 text-sm">취소</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-lg">{table.name}</span>
                    {table.description && <span className="text-gray-500 ml-2 text-sm">{table.description}</span>}
                    <span className={`ml-3 px-2 py-0.5 rounded-full text-xs font-semibold ${table.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                      {table.isActive ? "운영중" : "비활성"}
                    </span>
                    <span className="ml-3 text-xs text-gray-400">누적 예약 {table._count.reservations}건</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <a
                      href={`/api/tables/${table.id}/qr`}
                      download={`${table.name}-qr.svg`}
                      className="text-sm text-purple-500 hover:underline"
                      title="QR 코드 다운로드"
                    >
                      QR
                    </a>
                    <button onClick={() => startEdit(table)} className="text-sm text-blue-500 hover:underline">수정</button>
                    <button onClick={() => toggleActive(table)} className={`text-sm hover:underline ${table.isActive ? "text-red-400" : "text-green-600"}`}>
                      {table.isActive ? "비활성화" : "활성화"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">이용 불가 시간대 설정</h2>
        <form onSubmit={addBlock} className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">탁구대</label>
            <select
              value={blockTableId}
              onChange={(e) => setBlockTableId(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">선택</option>
              {tables.filter((t) => t.isActive).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">날짜</label>
            <input
              type="date"
              min={today}
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">시작 시간</label>
            <select
              value={blockStart}
              onChange={(e) => setBlockStart(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">선택</option>
              {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">종료 시간</label>
            <select
              value={blockEnd}
              onChange={(e) => setBlockEnd(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">선택</option>
              {TIME_SLOTS.slice(1).map((t) => <option key={t} value={t}>{t}</option>)}
              <option value="22:00">22:00</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">사유 (선택)</label>
            <input
              type="text"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="점검, 청소 등"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full bg-red-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-600">
              차단 추가
            </button>
          </div>
        </form>
      </div>

      {(() => {
        const today2 = new Date().toISOString().split("T")[0];
        const upcoming = blocked.filter((b) => b.date >= today2);
        if (upcoming.length === 0) return null;
        return (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-lg">등록된 이용 불가 시간대</h2>
            <span className="text-xs text-gray-400">{upcoming.length}건 (과거 자동 숨김)</span>
          </div>
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-gray-50">
              <tr>
                {["탁구대", "날짜", "시간", "사유", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {upcoming.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)).map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium">{b.table.name}</td>
                  <td className="px-4 py-3">{b.date}</td>
                  <td className="px-4 py-3">{b.startTime} ~ {b.endTime}</td>
                  <td className="px-4 py-3 text-gray-500">{b.reason || "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => removeBlock(b.id)}
                      aria-label={`${b.date} ${b.startTime}-${b.endTime} 차단 해제`}
                      className="text-red-500 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        );
      })()}
    </div>
  );
}
