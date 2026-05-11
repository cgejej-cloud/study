"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  type: "match" | "reservation" | "notice";
  title: string;
  message: string;
  createdAt: string;
};

type Payload = {
  pendingMatches: Notification[];
  upcomingSoon: Notification[];
  notices: Notification[];
  totalUnread: number;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function load() {
      fetch("/api/me/notifications")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d) setData(d); })
        .catch(() => {});
    }
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = data?.totalUnread ?? 0;
  const items = data
    ? [...data.pendingMatches, ...data.upcomingSoon, ...data.notices].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    : [];

  function hrefFor(n: Notification) {
    if (n.type === "match") return "/mypage";
    if (n.type === "reservation") return "/mypage";
    return "/";
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`알림 ${unread}개`}
        className="relative w-8 h-8 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <span className="font-semibold text-gray-700 text-sm">알림</span>
            <span className="text-xs text-gray-400">{items.length}건</span>
          </div>
          {items.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm text-gray-400">새 알림이 없습니다</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y">
              {items.map((n) => (
                <Link
                  key={`${n.type}-${n.id}`}
                  href={hrefFor(n)}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      n.type === "match" ? "bg-orange-400" :
                      n.type === "reservation" ? "bg-blue-400" :
                      "bg-gray-300"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
