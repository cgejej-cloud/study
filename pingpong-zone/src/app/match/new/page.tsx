"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useToast } from "@/components/Toast";

type Player = {
  id: string;
  name: string;
  nickname?: string | null;
  eloRating: number;
  avatar?: string | null;
  profileColor?: string | null;
};

type Table = { id: string; name: string; description?: string | null };

type Slot = { startTime: string; endTime: string; type: "reserved" | "blocked" };

type TableAvailability = Table & { bookedSlots: Slot[] };

const HOURS = Array.from({ length: 13 }, (_, i) => {
  const h = 10 + i;
  return `${String(h).padStart(2, "0")}:00`;
}); // 10:00 ~ 22:00

function isSlotBooked(start: string, end: string, bookedSlots: Slot[]) {
  return bookedSlots.some(
    (s) =>
      (s.startTime <= start && s.endTime > start) ||
      (s.startTime < end && s.endTime >= end) ||
      (s.startTime >= start && s.endTime <= end)
  );
}

function today() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function MatchNewInner() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const opponentIdParam = params?.get("opponent") ?? "";

  // 상대 선택
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [searching, setSearching] = useState(false);
  const { kstToday, kstHour } = useMemo(() => {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return { kstToday: kst.toISOString().split("T")[0], kstHour: kst.getUTCHours() };
  }, []);

  const [opponent, setOpponent] = useState<Player | null>(null);

  // 예약
  const [date, setDate] = useState(today());
  const [tables, setTables] = useState<TableAvailability[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  // 메시지
  const [message, setMessage] = useState("");

  // 제출
  const [submitting, setSubmitting] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);

  // 내 정보
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.id) setMyId(d.id); else router.push("/login"); })
      .catch(() => router.push("/login"));
  }, [router]);

  // URL에 opponent 파라미터가 있으면 바로 로드
  useEffect(() => {
    if (!opponentIdParam) return;
    fetch(`/api/players/${opponentIdParam}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.id) setOpponent(d); })
      .catch(() => {});
  }, [opponentIdParam]);

  // 선수 검색
  useEffect(() => {
    if (searchQ.trim().length < 1) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQ.trim())}`);
        const data = await res.json();
        setSearchResults((data.players ?? []).filter((p: Player) => p.id !== myId));
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ, myId]);

  // 날짜/테이블 가용성 로드
  const loadAvailability = useCallback(async (d: string) => {
    setLoadingSlots(true);
    setSelectedTableId("");
    setSelectedStart("");
    setSelectedEnd("");
    try {
      const res = await fetch(`/api/availability?date=${d}`);
      if (res.ok) setTables(await res.json());
    } catch {}
    setLoadingSlots(false);
  }, []);

  useEffect(() => {
    if (date) loadAvailability(date);
  }, [date, loadAvailability]);

  // 시작 시간 선택 시 종료 시간 자동 +1h
  function handleStartSelect(start: string) {
    setSelectedStart(start);
    const h = parseInt(start.split(":")[0]);
    setSelectedEnd(`${String(h + 1).padStart(2, "0")}:00`);
  }

  async function handleSubmit() {
    if (!opponent) { toast.show("상대 선수를 선택해주세요.", "error"); return; }
    if (!selectedTableId || !selectedStart || !selectedEnd) {
      toast.show("날짜·탁구대·시간을 모두 선택해주세요.", "error"); return;
    }

    setSubmitting(true);
    try {
      // 1) 탁구대 예약 먼저 (ID를 챌린지에 연결하기 위해)
      const rRes = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: selectedTableId, date, startTime: selectedStart, endTime: selectedEnd }),
      });
      const rData = await rRes.json();
      if (!rRes.ok) { toast.show(rData.error || "예약 실패", "error"); return; }

      // 2) 경기 신청 (예약 ID 연결)
      const cRes = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengedId: opponent.id,
          reservationId: rData.id,
          message: message.trim() || `${date} ${selectedStart}~${selectedEnd} 경기 신청합니다!`,
        }),
      });
      const cData = await cRes.json();
      if (!cRes.ok) { toast.show(cData.error || "경기 신청 실패", "error"); return; }

      toast.show("경기 신청과 탁구대 예약이 완료됐습니다! 🏓", "success");
      setTimeout(() => router.push("/mypage"), 1200);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[18px]" style={{ color: "var(--text-3)" }}>←</button>
        <h1 className="font-extrabold text-[20px]" style={{ letterSpacing: "-0.03em" }}>경기 신청 + 예약</h1>
      </div>

      {/* ── STEP 1: 상대 선택 ── */}
      <div className="card p-5 space-y-3">
        <p className="font-bold text-[14px]" style={{ color: "var(--text-1)" }}>
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-extrabold mr-1.5 text-white" style={{ background: "var(--jade-700)" }}>1</span>
          상대 선수 선택
        </p>

        {opponent ? (
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--jade-50)", border: "1.5px solid var(--jade-300)" }}>
            <Avatar name={opponent.nickname ?? opponent.name} size="md" avatar={opponent.avatar ?? undefined} profileColor={opponent.profileColor ?? undefined} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[14px]" style={{ color: "var(--text-1)" }}>{opponent.nickname ?? opponent.name}</p>
              {opponent.nickname && <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{opponent.name}</p>}
              <p className="text-[12px]" style={{ color: "var(--jade-700)" }}>{opponent.eloRating}점</p>
            </div>
            <button
              onClick={() => { setOpponent(null); setSearchQ(""); }}
              className="text-[12px] px-2 py-1 rounded-lg"
              style={{ color: "var(--text-3)", background: "var(--border)" }}
            >
              변경
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="이름으로 선수 검색..."
              className="w-full rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none"
              style={{ border: "1.5px solid var(--border)", background: "white" }}
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: "var(--text-3)" }}>검색 중...</div>
            )}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-lg border z-10 overflow-hidden" style={{ background: "white", borderColor: "var(--border)" }}>
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setOpponent(p); setSearchQ(""); setSearchResults([]); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-jade-50 text-left transition-colors"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <Avatar name={p.nickname ?? p.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[13px] truncate" style={{ color: "var(--text-1)" }}>{p.nickname ?? p.name}</p>
                      <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{p.eloRating}점</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchQ.length > 0 && !searching && searchResults.length === 0 && (
              <p className="text-[12px] mt-1.5 px-1" style={{ color: "var(--text-3)" }}>검색 결과가 없습니다.</p>
            )}
          </div>
        )}
      </div>

      {/* ── STEP 2: 날짜 선택 ── */}
      <div className="card p-5 space-y-3">
        <p className="font-bold text-[14px]" style={{ color: "var(--text-1)" }}>
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-extrabold mr-1.5 text-white" style={{ background: "var(--jade-700)" }}>2</span>
          경기 날짜
        </p>
        <input
          type="date"
          value={date}
          min={today()}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none"
          style={{ border: "1.5px solid var(--border)", background: "white" }}
        />
      </div>

      {/* ── STEP 3: 탁구대 + 시간 선택 ── */}
      <div className="card p-5 space-y-4">
        <p className="font-bold text-[14px]" style={{ color: "var(--text-1)" }}>
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-extrabold mr-1.5 text-white" style={{ background: "var(--jade-700)" }}>3</span>
          탁구대 및 시간 선택
        </p>

        {loadingSlots ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "var(--border)" }} />)}
          </div>
        ) : tables.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--text-3)" }}>이용 가능한 탁구대가 없습니다.</p>
        ) : (
          <>
            {/* 탁구대 선택 */}
            <div className="grid grid-cols-2 gap-2">
              {tables.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setSelectedTableId(t.id); setSelectedStart(""); setSelectedEnd(""); }}
                  className="p-3 rounded-xl text-left transition-all"
                  style={selectedTableId === t.id
                    ? { background: "var(--jade-950)", color: "#fff", border: "2px solid var(--jade-700)" }
                    : { background: "var(--jade-50)", color: "var(--text-1)", border: "2px solid transparent" }}
                >
                  <p className="font-bold text-[13px]">🏓 {t.name}</p>
                  {t.description && <p className="text-[11px] mt-0.5 opacity-70">{t.description}</p>}
                </button>
              ))}
            </div>

            {/* 시간대 선택 */}
            {selectedTableId && selectedTable && (
              <div>
                <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--text-2)" }}>시작 시간 선택 (1시간 단위)</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {HOURS.slice(0, -1).map((h) => {
                    const end = `${String(parseInt(h) + 1).padStart(2, "0")}:00`;
                    const booked = isSlotBooked(h, end, selectedTable.bookedSlots);
                    const isPast = date < kstToday || (date === kstToday && parseInt(h) <= kstHour);
                    const disabled = booked || isPast;
                    const selected = selectedStart === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleStartSelect(h)}
                        className="py-2 rounded-lg text-[12px] font-semibold transition-all"
                        style={disabled
                          ? { background: "#f1f5f9", color: "#cbd5e1", cursor: "not-allowed", textDecoration: isPast ? "none" : "line-through" }
                          : selected
                            ? { background: "var(--jade-600)", color: "#fff" }
                            : { background: "var(--jade-50)", color: "var(--jade-800)", border: "1px solid var(--jade-200)" }}
                      >
                        {h}
                        {isPast && !booked && <div className="text-[10px]">지남</div>}
                      </button>
                    );
                  })}
                </div>
                {selectedStart && (
                  <p className="text-[12px] mt-2" style={{ color: "var(--jade-700)" }}>
                    ✓ {selectedStart} ~ {selectedEnd} 선택됨
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── STEP 4: 메시지 (선택) ── */}
      <div className="card p-5 space-y-2">
        <p className="font-bold text-[14px]" style={{ color: "var(--text-1)" }}>
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-extrabold mr-1.5 text-white" style={{ background: "var(--jade-700)" }}>4</span>
          메시지 <span className="font-normal text-[12px]" style={{ color: "var(--text-3)" }}>(선택)</span>
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="상대에게 전할 말을 입력하세요."
          className="w-full rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none resize-none"
          style={{ border: "1.5px solid var(--border)", background: "white" }}
        />
      </div>

      {/* 요약 + 제출 */}
      {opponent && selectedTableId && selectedStart && (
        <div className="card p-4" style={{ background: "var(--jade-50)", border: "1px solid var(--jade-200)" }}>
          <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--jade-800)" }}>신청 요약</p>
          <div className="space-y-1 text-[13px]" style={{ color: "var(--text-2)" }}>
            <p>⚔️ 상대: <span className="font-bold">{opponent.nickname ?? opponent.name}</span></p>
            <p>📅 날짜: <span className="font-bold">{date}</span></p>
            <p>🏓 탁구대: <span className="font-bold">{selectedTable?.name}</span></p>
            <p>⏰ 시간: <span className="font-bold">{selectedStart} ~ {selectedEnd}</span></p>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || !opponent || !selectedTableId || !selectedStart}
        className="w-full py-3.5 rounded-xl font-extrabold text-[15px] transition-all"
        style={{
          background: (!opponent || !selectedTableId || !selectedStart) ? "var(--border)" : "var(--jade-950)",
          color: (!opponent || !selectedTableId || !selectedStart) ? "var(--text-3)" : "#fff",
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? "처리 중..." : "⚔️ 경기 신청 + 예약하기"}
      </button>

      <p className="text-center text-[12px]" style={{ color: "var(--text-3)" }}>
        경기 신청은 상대방이 수락해야 확정됩니다. 탁구대 예약은 즉시 완료됩니다.
      </p>
    </div>
  );
}

export default function MatchNewPage() {
  return (
    <Suspense fallback={
      <div className="max-w-lg mx-auto space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: "var(--border)" }} />)}
      </div>
    }>
      <MatchNewInner />
    </Suspense>
  );
}
