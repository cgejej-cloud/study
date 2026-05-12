"use client";

import { useEffect, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";

type Notice = {
  id: string;
  title: string;
  content: string;
  contentMd: string | null;
  isPinned: boolean;
};

export default function NoticeBanner() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [modal, setModal] = useState<Notice | null>(null);

  useEffect(() => {
    fetch("/api/notices")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setNotices(Array.isArray(d) ? d.slice(0, 2) : []))
      .catch(() => {});
  }, []);

  if (notices.length === 0) return null;

  return (
    <>
      <div className="space-y-2 animate-slide-up">
        {notices.map((n) => (
          <div
            key={n.id}
            onClick={() => n.contentMd ? setModal(n) : undefined}
            className={`flex items-start gap-2.5 px-4 py-3 rounded-2xl text-[13px] ${n.contentMd ? "cursor-pointer hover:brightness-95 transition-all" : ""}`}
            style={
              n.isPinned
                ? { background: "#fffbeb", border: "1px solid #fde68a" }
                : { background: "#eff6ff", border: "1px solid #bfdbfe" }
            }
          >
            <span className="text-base shrink-0 mt-0.5">{n.isPinned ? "📌" : "📢"}</span>
            <div className="min-w-0 flex-1">
              <span className="font-bold" style={{ color: n.isPinned ? "#92400e" : "#1d4ed8" }}>
                {n.title}
              </span>
              {n.content && (
                <span className="ml-2" style={{ color: n.isPinned ? "#78350f" : "#1e40af" }}>
                  {n.content}
                </span>
              )}
            </div>
            {n.contentMd && (
              <span className="shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded" style={{ color: n.isPinned ? "#92400e" : "#1d4ed8", opacity: 0.6 }}>
                자세히 →
              </span>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setModal(null)}
        >
          <div
            className="card max-w-lg w-full max-h-[80vh] flex flex-col animate-pop-in"
            style={{ background: "var(--surface)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{modal.isPinned ? "📌" : "📢"}</span>
                <h2 className="font-bold text-base" style={{ color: "var(--text-1)" }}>{modal.title}</h2>
              </div>
              <button
                onClick={() => setModal(null)}
                aria-label="닫기"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors shrink-0"
                style={{ color: "var(--text-3)" }}
              >
                ✕
              </button>
            </div>
            <div
              className="overflow-y-auto px-5 py-4 text-sm leading-relaxed"
              style={{ color: "var(--text-1)" }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(modal.contentMd!) }}
            />
          </div>
        </div>
      )}
    </>
  );
}
