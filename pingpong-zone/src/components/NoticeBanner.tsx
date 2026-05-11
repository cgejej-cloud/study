"use client";

import { useEffect, useState } from "react";

type Notice = { id: string; title: string; content: string; isPinned: boolean };

export default function NoticeBanner() {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    fetch("/api/notices")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setNotices(Array.isArray(data) ? data : []));
  }, []);

  if (notices.length === 0) return null;

  return (
    <div className="space-y-2">
      {notices.map((n) => (
        <div
          key={n.id}
          className={`rounded-xl px-4 py-3 flex items-start gap-3 ${
            n.isPinned
              ? "bg-amber-50 border border-amber-200"
              : "bg-blue-50 border border-blue-100"
          }`}
        >
          <span className="text-lg shrink-0">{n.isPinned ? "📌" : "📢"}</span>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${n.isPinned ? "text-amber-800" : "text-blue-800"}`}>
              {n.title}
            </p>
            <p className={`text-xs mt-0.5 line-clamp-2 ${n.isPinned ? "text-amber-700" : "text-blue-600"}`}>
              {n.content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
