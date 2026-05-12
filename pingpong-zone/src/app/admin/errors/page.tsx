"use client";

import { useEffect, useState } from "react";

type ErrorLog = {
  id: string;
  message: string;
  stack: string | null;
  url: string | null;
  userId: string | null;
  createdAt: string;
};

export default function AdminErrorsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/errors");
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("이 에러 로그를 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/errors?id=${id}`, { method: "DELETE" });
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  async function handleDeleteAll() {
    if (!confirm("에러 로그를 전체 삭제하시겠습니까?")) return;
    await fetch("/api/admin/errors?all=true", { method: "DELETE" });
    setLogs([]);
  }

  function toggleStack(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-extrabold text-[22px]" style={{ letterSpacing: "-0.03em" }}>🔴 에러 로그</h1>
        {logs.length > 0 && (
          <button
            onClick={handleDeleteAll}
            className="btn text-[12px] px-3 py-1.5 rounded-lg font-semibold"
            style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c" }}
          >
            전체 삭제
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-[13px]" style={{ color: "var(--text-3)" }}>불러오는 중...</p>
      ) : logs.length === 0 ? (
        <div className="card p-10 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
          에러 로그가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] mb-1" style={{ color: "var(--text-3)" }}>
                    {new Date(log.createdAt).toLocaleString("ko-KR")}
                    {log.url && (
                      <span className="ml-2 font-mono" style={{ color: "var(--text-2)" }}>{log.url}</span>
                    )}
                  </p>
                  <p className="text-[13px] font-semibold break-all" style={{ color: "var(--text-1)" }}>{log.message}</p>
                  {log.stack && (
                    <button
                      onClick={() => toggleStack(log.id)}
                      className="text-[11px] mt-1 hover:underline"
                      style={{ color: "var(--jade-700)" }}
                    >
                      {expandedIds.has(log.id) ? "스택 숨기기" : "스택 보기"}
                    </button>
                  )}
                  {log.stack && expandedIds.has(log.id) && (
                    <pre className="mt-2 text-[11px] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all"
                      style={{ background: "#f8faf8", color: "var(--text-2)", border: "1px solid var(--border)" }}>
                      {log.stack}
                    </pre>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(log.id)}
                  className="shrink-0 text-[11px] hover:underline"
                  style={{ color: "#be123c" }}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
