"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";

type Season = {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { matches: number };
};

export default function AdminSeasonsPage() {
  const router = useRouter();
  const toast = useToast();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/seasons");
    if (res.status === 403) { router.push("/"); return; }
    setSeasons(await res.json());
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/admin/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, startDate }),
    });
    setLoading(false);
    if (res.ok) {
      setName("");
      toast.show("시즌이 생성되었습니다.", "success");
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.show(d.error || "생성에 실패했습니다.", "error");
    }
  }

  async function handleAction(id: string, action: "activate" | "close") {
    const label = action === "activate" ? "시즌을 활성화" : "시즌을 종료(랭킹 스냅샷 저장)";
    if (!confirm(`${label}하시겠습니까?`)) return;
    const res = await fetch(`/api/admin/seasons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      toast.show(action === "activate" ? "시즌을 활성화했습니다." : "시즌이 종료되었습니다.", "success");
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.show(d.error || "처리에 실패했습니다.", "error");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="text-2xl font-bold text-gray-900">시즌 관리</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">시즌제 안내</p>
        <p className="text-xs text-blue-600">활성 시즌 기간의 경기에 시즌 태그가 붙습니다. 시즌 종료 시 현재 포인트로 순위 스냅샷이 저장됩니다.</p>
      </div>

      {/* 생성 폼 */}
      <form onSubmit={handleCreate} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">새 시즌 만들기</h2>
        <div className="grid grid-cols-2 gap-3">
          <input type="text" required value={name} onChange={e => setName(e.target.value)}
            placeholder="시즌 이름 (예: 2025 시즌 1)"
            className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <div>
            <label className="text-xs text-gray-500 mb-1 block">시작일</label>
            <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50">
          {loading ? "생성 중..." : "시즌 생성"}
        </button>
      </form>

      {/* 시즌 목록 */}
      <div className="space-y-3">
        {seasons.map((s) => (
          <div key={s.id} className={`bg-white border rounded-xl p-4 shadow-sm ${s.isActive ? "border-green-200" : "border-gray-100"}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  {s.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">진행 중</span>}
                  {s.endDate && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">종료</span>}
                  <span className="font-semibold text-gray-800">{s.name}</span>
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(s.startDate).toLocaleDateString("ko-KR")}
                  {s.endDate && ` ~ ${new Date(s.endDate).toLocaleDateString("ko-KR")}`}
                  {" · "}경기 {s._count.matches}건
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Link href={`/seasons/${s.id}`}
                  className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  보기
                </Link>
                {!s.isActive && !s.endDate && (
                  <button onClick={() => handleAction(s.id, "activate")}
                    className="text-xs bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors">
                    활성화
                  </button>
                )}
                {s.isActive && (
                  <button onClick={() => handleAction(s.id, "close")}
                    className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                    종료
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {seasons.length === 0 && <p className="text-gray-400 text-sm text-center py-4">생성된 시즌이 없습니다.</p>}
      </div>
    </div>
  );
}
