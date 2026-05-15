"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// 진행 중인 라이브 경기 수를 헤더에 표시 (>0 일 때만 노출)
export default function LiveBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function load() {
      fetch("/api/spectate")
        .then((r) => r.ok ? r.json() : [])
        .then((d) => setCount(Array.isArray(d) ? d.length : 0))
        .catch(() => {});
    }
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);

  if (count === 0) return null;

  return (
    <Link
      href="/spectate"
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
      style={{ background: "rgba(239,68,68,0.18)", color: "#fca5a5" }}
      aria-label={`라이브 경기 ${count}건 보기`}
      title="라이브 경기 관전"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      LIVE {count}
    </Link>
  );
}
