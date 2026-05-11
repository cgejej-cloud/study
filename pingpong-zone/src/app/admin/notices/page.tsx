"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Notice = { id: string; title: string; content: string; isPinned: boolean; isActive: boolean; createdAt: string };

export default function AdminNoticesPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/admin/notices");
    if (res.status === 403) { router.push("/"); return; }
    setNotices(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/admin/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, isPinned }),
    });
    setLoading(false);
    if (res.ok) {
      setTitle(""); setContent(""); setIsPinned(false);
      setMsg("공지가 등록되었습니다.");
      load();
    }
  }

  async function toggleActive(n: Notice) {
    await fetch(`/api/admin/notices/${n.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !n.isActive }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("공지를 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/notices/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="text-2xl font-bold text-gray-900">공지사항 관리</h1>
      </div>

      {/* 작성 폼 */}
      <form onSubmit={handleCreate} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">새 공지 등록</h2>
        <input
          type="text" required value={title} onChange={e => setTitle(e.target.value)}
          placeholder="제목"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <textarea
          required value={content} onChange={e => setContent(e.target.value)}
          rows={3} placeholder="내용"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} className="rounded" />
            상단 고정
          </label>
          <button type="submit" disabled={loading}
            className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50">
            {loading ? "등록 중..." : "등록"}
          </button>
        </div>
        {msg && <p className="text-xs text-green-600">{msg}</p>}
      </form>

      {/* 목록 */}
      <div className="space-y-2">
        {notices.map((n) => (
          <div key={n.id} className={`bg-white border rounded-xl p-4 shadow-sm ${!n.isActive ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {n.isPinned && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold">고정</span>}
                  <span className="font-semibold text-sm text-gray-800 truncate">{n.title}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{n.content}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString("ko-KR")}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => toggleActive(n)}
                  className="text-xs border rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors text-gray-600">
                  {n.isActive ? "숨기기" : "표시"}
                </button>
                <button onClick={() => handleDelete(n.id)}
                  className="text-xs border border-red-200 text-red-500 rounded-lg px-2.5 py-1.5 hover:bg-red-50 transition-colors">
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
