"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type TableInfo = { id: string; name: string; description: string | null };

export default function QrLandingPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const router = useRouter();
  const [table, setTable] = useState<TableInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tables")
      .then((r) => r.ok ? r.json() : [])
      .then((tables: TableInfo[]) => {
        const found = tables.find((t) => t.id === tableId);
        setTable(found ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tableId]);

  function goReserve() {
    router.push(`/reserve?table=${tableId}`);
  }

  function goRecord() {
    router.push(`/ranking/record?table=${tableId}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-[13px]" style={{ color: "var(--text-3)" }}>불러오는 중...</div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="max-w-sm mx-auto py-16 text-center space-y-4">
        <div className="text-5xl">🏓</div>
        <p className="font-bold" style={{ color: "var(--text-1)" }}>탁구대를 찾을 수 없습니다</p>
        <Link href="/reserve" className="btn btn-jade mx-auto">예약 페이지로</Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto space-y-5 pt-4">
      <div
        className="card p-6 text-center"
        style={{ background: "linear-gradient(135deg, var(--jade-950) 0%, #1a4730 100%)" }}
      >
        <div className="text-5xl mb-2">🏓</div>
        <h1 className="font-extrabold text-[22px] text-white mb-1" style={{ letterSpacing: "-0.03em" }}>
          {table.name}
        </h1>
        {table.description && (
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.7)" }}>{table.description}</p>
        )}
        <div
          className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-[11px] font-bold"
          style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          QR 스캔으로 접속
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={goReserve}
          className="card p-5 text-center hover:opacity-90 transition-opacity cursor-pointer"
        >
          <div className="text-3xl mb-2">📅</div>
          <div className="font-bold text-[14px]" style={{ color: "var(--text-1)" }}>이 탁구대 예약</div>
          <div className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>원하는 시간 선택</div>
        </button>

        <button
          onClick={goRecord}
          className="card p-5 text-center hover:opacity-90 transition-opacity cursor-pointer"
        >
          <div className="text-3xl mb-2">🏆</div>
          <div className="font-bold text-[14px]" style={{ color: "var(--text-1)" }}>경기 기록</div>
          <div className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>방금 경기 결과 입력</div>
        </button>
      </div>

      <div className="card p-4">
        <p className="section-title mb-3">빠른 접근</p>
        <div className="space-y-2">
          {[
            { href: "/ranking", label: "🏓 랭킹 보기" },
            { href: "/mypage", label: "👤 내 정보" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors hover:opacity-80"
              style={{ background: "var(--jade-50)", color: "var(--jade-800)" }}
            >
              {item.label}
              <span style={{ color: "var(--text-3)" }}>→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
