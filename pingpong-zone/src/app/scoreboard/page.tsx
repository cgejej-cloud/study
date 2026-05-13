"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type SetResult = { p1: number; p2: number };
type Snapshot = {
  p1Points: number;
  p2Points: number;
  p1Sets: number;
  p2Sets: number;
  setHistory: SetResult[];
};

function ScoreboardInner() {
  const params = useSearchParams();
  const opponentId = params?.get("opponent") ?? "";
  const bestOf = Math.max(1, Number(params?.get("sets") ?? 5));
  const setsToWin = Math.ceil(bestOf / 2);

  const [p1Name, setP1Name] = useState("나");
  const [p2Name, setP2Name] = useState("상대");
  const [editingName, setEditingName] = useState<"p1" | "p2" | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const [p1Points, setP1Points] = useState(0);
  const [p2Points, setP2Points] = useState(0);
  const [p1Sets, setP1Sets] = useState(0);
  const [p2Sets, setP2Sets] = useState(0);
  const [setHistory, setSetHistory] = useState<SetResult[]>([]);
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [finished, setFinished] = useState(false);

  // Lock screen orientation to landscape if possible
  useEffect(() => {
    if (typeof screen !== "undefined" && screen.orientation && "lock" in screen.orientation) {
      (screen.orientation as ScreenOrientation & { lock: (o: string) => Promise<void> })
        .lock("landscape")
        .catch(() => {});
    }
    return () => {
      if (typeof screen !== "undefined" && screen.orientation && "unlock" in screen.orientation) {
        screen.orientation.unlock();
      }
    };
  }, []);

  // Load player names
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.name) setP1Name(d.name); })
      .catch(() => {});

    if (opponentId) {
      fetch(`/api/players/${opponentId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d?.name) setP2Name(d.name); })
        .catch(() => {});
    }
  }, [opponentId]);

  function makeSnapshot(): Snapshot {
    return { p1Points, p2Points, p1Sets, p2Sets, setHistory: [...setHistory] };
  }

  function addPoint(player: "p1" | "p2") {
    if (finished) return;
    const snap = makeSnapshot();

    const newP1 = player === "p1" ? p1Points + 1 : p1Points;
    const newP2 = player === "p2" ? p2Points + 1 : p2Points;

    // Set ends at 11+ with 2-point lead (deuce rule)
    const setOver =
      (newP1 >= 11 || newP2 >= 11) && Math.abs(newP1 - newP2) >= 2;

    setUndoStack((prev) => [...prev, snap]);

    if (setOver) {
      const newHist = [...setHistory, { p1: newP1, p2: newP2 }];
      const newP1Sets = p1Sets + (newP1 > newP2 ? 1 : 0);
      const newP2Sets = p2Sets + (newP2 > newP1 ? 1 : 0);
      setSetHistory(newHist);
      setP1Sets(newP1Sets);
      setP2Sets(newP2Sets);
      setP1Points(0);
      setP2Points(0);
      if (newP1Sets >= setsToWin || newP2Sets >= setsToWin) {
        setFinished(true);
      }
    } else {
      setP1Points(newP1);
      setP2Points(newP2);
    }
  }

  function undo() {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setP1Points(prev.p1Points);
    setP2Points(prev.p2Points);
    setP1Sets(prev.p1Sets);
    setP2Sets(prev.p2Sets);
    setSetHistory(prev.setHistory);
    setUndoStack((s) => s.slice(0, -1));
    setFinished(false);
  }

  function reset() {
    if (!confirm("스코어를 초기화하시겠습니까?")) return;
    setP1Points(0); setP2Points(0);
    setP1Sets(0); setP2Sets(0);
    setSetHistory([]); setUndoStack([]);
    setFinished(false);
  }

  function commitNameEdit() {
    const val = editInputRef.current?.value.trim();
    if (val && editingName) {
      if (editingName === "p1") setP1Name(val);
      else setP2Name(val);
    }
    setEditingName(null);
  }

  const winner = finished ? (p1Sets >= setsToWin ? "p1" : "p2") : null;
  const recordUrl = opponentId
    ? `/ranking/record?opponent=${opponentId}`
    : "/ranking/record";

  return (
    <div
      className="fixed inset-0 flex flex-col select-none"
      style={{ background: "#0f172a", zIndex: 50, touchAction: "manipulation" }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ background: "#1e293b", borderBottom: "1px solid #334155" }}
      >
        <Link
          href={opponentId ? `/players/${opponentId}` : "/ranking"}
          className="text-[12px] px-2 py-1 rounded"
          style={{ background: "#334155", color: "#94a3b8" }}
        >
          ← 나가기
        </Link>

        {/* Centre: set scores */}
        <div className="flex items-center gap-2">
          {Array.from({ length: setsToWin }).map((_, i) => (
            <div
              key={`l${i}`}
              className="w-3 h-3 rounded-full transition-all"
              style={{ background: i < p1Sets ? "#3b82f6" : "#334155" }}
            />
          ))}
          <span className="text-[20px] font-extrabold tabular-nums" style={{ color: "#60a5fa" }}>{p1Sets}</span>
          <span className="text-[13px] font-light" style={{ color: "#475569" }}>:</span>
          <span className="text-[20px] font-extrabold tabular-nums" style={{ color: "#f87171" }}>{p2Sets}</span>
          {Array.from({ length: setsToWin }).map((_, i) => (
            <div
              key={`r${i}`}
              className="w-3 h-3 rounded-full transition-all"
              style={{ background: i < p2Sets ? "#ef4444" : "#334155" }}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="text-[11px] px-2 py-1 rounded"
            style={{
              background: "#334155",
              color: undoStack.length === 0 ? "#475569" : "#e2e8f0",
            }}
          >
            ↩ 취소
          </button>
          <button
            onClick={reset}
            className="text-[11px] px-2 py-1 rounded"
            style={{ background: "#334155", color: "#f87171" }}
          >
            초기화
          </button>
        </div>
      </div>

      {/* ── Set history ── */}
      {setHistory.length > 0 && (
        <div
          className="shrink-0 flex gap-2 px-3 py-1.5 flex-wrap overflow-x-auto"
          style={{ background: "#1e293b", borderBottom: "1px solid #334155" }}
        >
          {setHistory.map((s, i) => (
            <span
              key={i}
              className="text-[11px] font-mono px-2 py-0.5 rounded-full shrink-0"
              style={{
                background: "#334155",
                color: s.p1 > s.p2 ? "#93c5fd" : "#fca5a5",
              }}
            >
              {i + 1}세트&nbsp;{s.p1}-{s.p2}
            </span>
          ))}
        </div>
      )}

      {/* ── Main scoring area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Player 1 */}
        <button
          onClick={() => addPoint("p1")}
          disabled={finished}
          className="flex-1 flex flex-col items-center justify-center gap-3 transition-opacity active:opacity-60"
          style={{
            background:
              finished && winner === "p1"
                ? "linear-gradient(180deg,#14532d,#166534)"
                : "linear-gradient(180deg,#172554,#1e3a8a)",
            border: "none",
            outline: "none",
            cursor: finished ? "default" : "pointer",
          }}
          aria-label={`${p1Name} 득점`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setEditingName("p1"); }}
            className="font-extrabold text-center px-2 py-0.5 rounded-lg"
            style={{
              fontSize: "clamp(12px, 2.5vw, 18px)",
              color: "#93c5fd",
              background: "rgba(59,130,246,0.15)",
              letterSpacing: "-0.02em",
            }}
          >
            {p1Name} ✏️
          </button>
          <div
            className="font-extrabold tabular-nums"
            style={{
              fontSize: "clamp(80px, 20vw, 160px)",
              color: "#dbeafe",
              lineHeight: 1,
            }}
          >
            {p1Points}
          </div>
          {!finished && (
            <span className="text-[11px]" style={{ color: "#3b82f6" }}>
              탭 → 득점
            </span>
          )}
          {finished && winner === "p1" && (
            <span className="text-[20px] font-bold" style={{ color: "#4ade80" }}>
              🏆 승리!
            </span>
          )}
          {finished && winner === "p2" && (
            <span className="text-[14px]" style={{ color: "#475569" }}>
              패배
            </span>
          )}
        </button>

        {/* Divider */}
        <div
          className="shrink-0 flex flex-col items-center justify-center gap-3"
          style={{ width: "52px", background: "#1e293b" }}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#475569" }}>
            세트
          </span>
          <span
            className="text-[24px] font-extrabold tabular-nums"
            style={{ color: "#60a5fa" }}
          >
            {p1Sets}
          </span>
          <div className="w-8 h-px" style={{ background: "#334155" }} />
          <span
            className="text-[24px] font-extrabold tabular-nums"
            style={{ color: "#f87171" }}
          >
            {p2Sets}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#475569" }}>
            세트
          </span>
        </div>

        {/* Player 2 */}
        <button
          onClick={() => addPoint("p2")}
          disabled={finished}
          className="flex-1 flex flex-col items-center justify-center gap-3 transition-opacity active:opacity-60"
          style={{
            background:
              finished && winner === "p2"
                ? "linear-gradient(180deg,#14532d,#166534)"
                : "linear-gradient(180deg,#4c0519,#7f1d1d)",
            border: "none",
            outline: "none",
            cursor: finished ? "default" : "pointer",
          }}
          aria-label={`${p2Name} 득점`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setEditingName("p2"); }}
            className="font-extrabold text-center px-2 py-0.5 rounded-lg"
            style={{
              fontSize: "clamp(12px, 2.5vw, 18px)",
              color: "#fca5a5",
              background: "rgba(239,68,68,0.15)",
              letterSpacing: "-0.02em",
            }}
          >
            {p2Name} ✏️
          </button>
          <div
            className="font-extrabold tabular-nums"
            style={{
              fontSize: "clamp(80px, 20vw, 160px)",
              color: "#fee2e2",
              lineHeight: 1,
            }}
          >
            {p2Points}
          </div>
          {!finished && (
            <span className="text-[11px]" style={{ color: "#ef4444" }}>
              탭 → 득점
            </span>
          )}
          {finished && winner === "p2" && (
            <span className="text-[20px] font-bold" style={{ color: "#4ade80" }}>
              🏆 승리!
            </span>
          )}
          {finished && winner === "p1" && (
            <span className="text-[14px]" style={{ color: "#475569" }}>
              패배
            </span>
          )}
        </button>
      </div>

      {/* ── Footer ── */}
      <div
        className="shrink-0 flex gap-3 px-4 py-3"
        style={{ background: "#1e293b", borderTop: "1px solid #334155" }}
      >
        {finished ? (
          <>
            <Link
              href={recordUrl}
              className="flex-1 py-3 rounded-xl font-bold text-center"
              style={{ background: "#16a34a", color: "#fff", fontSize: "14px" }}
            >
              🏓 경기 결과 기록하기
            </Link>
            <button
              onClick={reset}
              className="px-5 py-3 rounded-xl font-semibold"
              style={{ background: "#334155", color: "#e2e8f0", fontSize: "13px" }}
            >
              다시 시작
            </button>
          </>
        ) : (
          <button
            onClick={() => setFinished(true)}
            className="flex-1 py-3 rounded-xl font-semibold"
            style={{ background: "#334155", color: "#94a3b8", fontSize: "13px" }}
          >
            경기 종료
          </button>
        )}
      </div>

      {/* ── Name edit modal ── */}
      {editingName && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[60] p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setEditingName(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl p-5 space-y-3"
            style={{ background: "#1e293b", border: "1px solid #334155" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-bold text-[15px]" style={{ color: "#e2e8f0" }}>
              {editingName === "p1" ? "플레이어 1" : "플레이어 2"} 이름 변경
            </p>
            <input
              ref={editInputRef}
              autoFocus
              type="text"
              defaultValue={editingName === "p1" ? p1Name : p2Name}
              className="w-full rounded-xl px-4 py-2 text-[14px]"
              style={{
                background: "#334155",
                color: "#e2e8f0",
                border: "1px solid #475569",
                outline: "none",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNameEdit();
                if (e.key === "Escape") setEditingName(null);
              }}
            />
            <div className="flex gap-2">
              <button
                className="flex-1 py-2 rounded-xl text-[13px] font-semibold"
                style={{ background: "#475569", color: "#e2e8f0" }}
                onClick={() => setEditingName(null)}
              >
                취소
              </button>
              <button
                className="flex-1 py-2 rounded-xl text-[13px] font-semibold"
                style={{ background: "#3b82f6", color: "#fff" }}
                onClick={commitNameEdit}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScoreboardPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-slate-900 flex items-center justify-center text-slate-400">
          로딩 중...
        </div>
      }
    >
      <ScoreboardInner />
    </Suspense>
  );
}
