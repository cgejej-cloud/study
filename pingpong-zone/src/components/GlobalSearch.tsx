"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";

type Result = { id: string; name: string; eloRating: number };

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);

  // 키보드 단축키: Ctrl/Cmd + K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && open) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // 디바운스 검색
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.ok ? r.json() : { players: [] })
        .then((d) => setResults(d.players ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        aria-label="검색 (Ctrl+K)"
        className="w-8 h-8 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        title="선수 검색 (Ctrl+K)"
      >
        🔍
      </button>
    );
  }

  return (
    <div ref={dropRef} className="fixed inset-0 z-[60] flex items-start justify-center pt-16 px-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b">
          <span className="text-gray-400">🔍</span>
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="선수 이름 검색..."
            aria-label="선수 검색"
            className="flex-1 text-sm focus:outline-none"
          />
          <kbd className="text-[10px] font-mono text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-sm text-gray-400">검색 중...</div>
          ) : results.length === 0 && q.trim() ? (
            <div className="p-6 text-center text-sm text-gray-400">검색 결과가 없습니다</div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">
              선수 이름을 입력하세요 · Ctrl/Cmd+K
            </div>
          ) : (
            results.map((p) => (
              <Link
                key={p.id}
                href={`/players/${p.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <Avatar name={p.name} size="sm" />
                <span className="flex-1 font-medium text-sm text-gray-800">{p.name}</span>
                <span className="text-xs text-gray-400">{p.eloRating}점</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
