"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { renderMarkdown } from "@/lib/markdown";

type Notice = {
  id: string;
  title: string;
  content: string;
  contentMd: string | null;
  isPinned: boolean;
  isActive: boolean;
  createdAt: string;
};

export default function AdminNoticesPage() {
  const router = useRouter();
  const toast = useToast();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentMd, setContentMd] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/notices");
    if (res.status === 403) { router.push("/"); return; }
    setNotices(await res.json());
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/admin/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, contentMd: contentMd || null, isPinned }),
    });
    setLoading(false);
    if (res.ok) {
      setTitle(""); setContent(""); setContentMd(""); setIsPinned(false); setPreview(false);
      setMsg("공지가 등록되었습니다.");
      toast.show("공지가 등록되었습니다.", "success");
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.show(d.error || "등록에 실패했습니다.", "error");
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
    const res = await fetch(`/api/admin/notices/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.show("공지를 삭제했습니다.", "success");
      load();
    } else {
      toast.show("삭제에 실패했습니다.", "error");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-1)" }}>공지사항 관리</h1>
      </div>

      <form onSubmit={handleCreate} className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-2)" }}>새 공지 등록</h2>
        <input
          type="text" required value={title} onChange={e => setTitle(e.target.value)}
          placeholder="제목"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jade-500"
          style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text-1)" }}
        />
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--text-3)" }}>요약 텍스트 (Plain)</label>
          <textarea
            required value={content} onChange={e => setContent(e.target.value)}
            rows={2} placeholder="배너에 표시될 짧은 요약"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jade-500 resize-none"
            style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text-1)" }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold" style={{ color: "var(--text-3)" }}>마크다운 본문 (선택)</label>
            <button
              type="button"
              onClick={() => setPreview(p => !p)}
              className="btn btn-ghost text-xs py-1 px-2"
              style={{ fontSize: "11px" }}
            >
              {preview ? "편집" : "미리보기"}
            </button>
          </div>

          {preview ? (
            <div
              className="w-full border rounded-lg px-3 py-2 text-sm min-h-[120px]"
              style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text-1)" }}
              dangerouslySetInnerHTML={{ __html: contentMd ? renderMarkdown(contentMd) : "<span style=\"color:var(--text-3)\">내용 없음</span>" }}
            />
          ) : (
            <textarea
              value={contentMd} onChange={e => setContentMd(e.target.value)}
              rows={6} placeholder={"# 제목\n\n**굵게**, *기울임*, `코드`\n\n- 목록 항목\n\n[링크](https://example.com)"}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jade-500 resize-y font-mono"
              style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text-1)" }}
            />
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text-2)" }}>
            <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} className="rounded" />
            상단 고정
          </label>
          <button type="submit" disabled={loading} className="btn btn-jade disabled:opacity-50">
            {loading ? "등록 중..." : "등록"}
          </button>
        </div>
        {msg && <p className="text-xs" style={{ color: "var(--jade-600)" }}>{msg}</p>}
      </form>

      <div className="space-y-2">
        {notices.map((n) => (
          <div key={n.id} className={`card p-4 ${!n.isActive ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {n.isPinned && <span className="chip chip-rose">고정</span>}
                  {n.contentMd && <span className="chip chip-sky">MD</span>}
                  <span className="font-semibold text-sm truncate" style={{ color: "var(--text-1)" }}>{n.title}</span>
                </div>
                <p className="text-xs line-clamp-2" style={{ color: "var(--text-3)" }}>{n.content}</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{new Date(n.createdAt).toLocaleDateString("ko-KR")}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => toggleActive(n)}
                  className="text-xs border rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
                  {n.isActive ? "숨기기" : "표시"}
                </button>
                <button onClick={() => handleDelete(n.id)}
                  className="text-xs border rounded-lg px-2.5 py-1.5 transition-colors"
                  style={{ borderColor: "#fca5a5", color: "#ef4444" }}>
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
