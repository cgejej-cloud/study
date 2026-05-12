"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type EventType =
  | "elo_multiplier"
  | "bonus_elo_win"
  | "bonus_elo_streak"
  | "double_placement"
  | "elo_floor_boost";

type Event = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  config: Record<string, unknown>;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: "elo_multiplier", label: "⚡ ELO 배율" },
  { value: "bonus_elo_win", label: "🎁 승리 보너스" },
  { value: "bonus_elo_streak", label: "🔥 연승 보너스" },
  { value: "double_placement", label: "🚀 배치 K값 2배" },
  { value: "elo_floor_boost", label: "🛡️ 하한선 상승" },
];

const TYPE_LABEL: Record<string, string> = {
  elo_multiplier: "⚡ ELO 배율",
  bonus_elo_win: "🎁 승리 보너스",
  bonus_elo_streak: "🔥 연승 보너스",
  double_placement: "🚀 배치 K값 2배",
  elo_floor_boost: "🛡️ 하한선 상승",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function buildConfig(type: EventType, fields: Record<string, string>): Record<string, unknown> {
  if (type === "elo_multiplier") return { multiplier: Number(fields.multiplier ?? 2) };
  if (type === "bonus_elo_win") return { bonus: Number(fields.bonus ?? 10) };
  if (type === "bonus_elo_streak") return { streak: Number(fields.streak ?? 3), bonus: Number(fields.bonus ?? 20) };
  if (type === "double_placement") return {};
  if (type === "elo_floor_boost") return { floor: Number(fields.floor ?? 500) };
  return {};
}

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<EventType>("elo_multiplier");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [configFields, setConfigFields] = useState<Record<string, string>>({ multiplier: "2" });

  function handleTypeChange(t: EventType) {
    setType(t);
    if (t === "elo_multiplier") setConfigFields({ multiplier: "2" });
    else if (t === "bonus_elo_win") setConfigFields({ bonus: "10" });
    else if (t === "bonus_elo_streak") setConfigFields({ streak: "3", bonus: "20" });
    else if (t === "double_placement") setConfigFields({});
    else if (t === "elo_floor_boost") setConfigFields({ floor: "500" });
  }

  async function load() {
    const res = await fetch("/api/admin/events");
    if (res.status === 401 || res.status === 403) { router.push("/"); return; }
    const data = await res.json();
    setEvents(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        type,
        config: buildConfig(type, configFields),
        startDate,
        endDate,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error ?? "오류가 발생했습니다."); return; }
    setName(""); setDescription(""); setStartDate(""); setEndDate("");
    load();
  }

  async function handleToggle(event: Event) {
    await fetch(`/api/admin/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !event.isActive }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("이벤트를 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    load();
  }

  const now = new Date();
  function getStatus(event: Event) {
    if (!event.isActive) return { label: "비활성", cls: "bg-gray-100 text-gray-500" };
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    if (now < start) return { label: "예정", cls: "bg-blue-100 text-blue-600" };
    if (now > end) return { label: "종료", cls: "bg-red-100 text-red-500" };
    return { label: "진행 중", cls: "bg-green-100 text-green-700" };
  }

  return (
    <div className="space-y-8">
      <h1 className="font-extrabold text-[22px]" style={{ letterSpacing: "-0.03em" }}>⚡ 이벤트 관리</h1>

      <div className="card p-6">
        <h2 className="font-bold text-[15px] mb-5" style={{ color: "var(--text-1)" }}>이벤트 생성</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--text-2)" }}>이벤트명 *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="이벤트 이름"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--text-2)" }}>타입 *</label>
              <select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as EventType)}
                className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {EVENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--text-2)" }}>설명</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="이벤트 설명 (선택)"
            />
          </div>

          {type === "elo_multiplier" && (
            <div className="p-4 rounded-xl" style={{ background: "var(--jade-50)" }}>
              <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--jade-800)" }}>배율</label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={configFields.multiplier ?? "2"}
                onChange={(e) => setConfigFields({ multiplier: e.target.value })}
                className="border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
              />
            </div>
          )}

          {type === "bonus_elo_win" && (
            <div className="p-4 rounded-xl" style={{ background: "var(--jade-50)" }}>
              <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--jade-800)" }}>보너스 포인트</label>
              <input
                type="number"
                min="1"
                value={configFields.bonus ?? "10"}
                onChange={(e) => setConfigFields({ bonus: e.target.value })}
                className="border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
              />
            </div>
          )}

          {type === "bonus_elo_streak" && (
            <div className="p-4 rounded-xl flex gap-6" style={{ background: "var(--jade-50)" }}>
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--jade-800)" }}>연승 수</label>
                <input
                  type="number"
                  min="2"
                  value={configFields.streak ?? "3"}
                  onChange={(e) => setConfigFields((prev) => ({ ...prev, streak: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500 w-28"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--jade-800)" }}>보너스 포인트</label>
                <input
                  type="number"
                  min="1"
                  value={configFields.bonus ?? "20"}
                  onChange={(e) => setConfigFields((prev) => ({ ...prev, bonus: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500 w-28"
                />
              </div>
            </div>
          )}

          {type === "double_placement" && (
            <div className="p-4 rounded-xl text-[13px]" style={{ background: "var(--jade-50)", color: "var(--jade-700)" }}>
              추가 설정 없음 — 배치 게임(첫 5경기) K값이 2배로 적용됩니다.
            </div>
          )}

          {type === "elo_floor_boost" && (
            <div className="p-4 rounded-xl" style={{ background: "var(--jade-50)" }}>
              <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--jade-800)" }}>하한선</label>
              <input
                type="number"
                min="100"
                value={configFields.floor ?? "500"}
                onChange={(e) => setConfigFields({ floor: e.target.value })}
                className="border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--text-2)" }}>시작일시 *</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--text-2)" }}>종료일시 *</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-[13px]">{error}</p>}

          <button type="submit" disabled={submitting} className="btn btn-jade">
            {submitting ? "생성 중..." : "이벤트 생성"}
          </button>
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-[#f8faf8]">
            <tr>
              {["이름", "타입", "시작", "종료", "상태", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">불러오는 중...</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">이벤트가 없습니다.</td></tr>
            ) : events.map((ev) => {
              const status = getStatus(ev);
              return (
                <tr key={ev.id} className={!ev.isActive ? "opacity-50" : ""}>
                  <td className="px-4 py-3 font-semibold">{ev.name}</td>
                  <td className="px-4 py-3 text-gray-600">{TYPE_LABEL[ev.type] ?? ev.type}</td>
                  <td className="px-4 py-3 text-gray-500 text-[12px]">{formatDate(ev.startDate)}</td>
                  <td className="px-4 py-3 text-gray-500 text-[12px]">{formatDate(ev.endDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${status.cls}`}>{status.label}</span>
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(ev)}
                      className="text-[12px] font-semibold text-gray-500 hover:text-green-700 border border-gray-200 rounded-lg px-2 py-1 hover:bg-green-50 transition-colors"
                    >
                      {ev.isActive ? "비활성화" : "활성화"}
                    </button>
                    <button
                      onClick={() => handleDelete(ev.id)}
                      className="text-[12px] font-semibold text-red-400 hover:underline"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
