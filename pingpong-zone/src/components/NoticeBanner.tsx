"use client";

import { useEffect, useState } from "react";

type Notice = { id: string; title: string; body: string; isPinned: boolean };

export default function NoticeBanner() {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    fetch("/api/notices")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setNotices(Array.isArray(d) ? d.slice(0, 2) : []))
      .catch(() => {});
  }, []);

  if (notices.length === 0) return null;

  return (
    <div className="space-y-2 animate-slide-up">
      {notices.map((n) => (
        <div
          key={n.id}
          className="flex items-start gap-2.5 px-4 py-3 rounded-2xl text-[13px]"
          style={
            n.isPinned
              ? { background: "#fffbeb", border: "1px solid #fde68a" }
              : { background: "#eff6ff", border: "1px solid #bfdbfe" }
          }
        >
          <span className="text-base shrink-0 mt-0.5">{n.isPinned ? "📌" : "📢"}</span>
          <div className="min-w-0">
            <span className="font-bold" style={{ color: n.isPinned ? "#92400e" : "#1d4ed8" }}>
              {n.title}
            </span>
            {n.body && (
              <span className="ml-2" style={{ color: n.isPinned ? "#78350f" : "#1e40af" }}>
                {n.body}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
