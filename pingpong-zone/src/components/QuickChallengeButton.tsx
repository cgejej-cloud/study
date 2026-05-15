"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";

type Props = {
  opponentId: string;
  opponentName: string;
};

const MAX_MESSAGE = 200;

export default function QuickChallengeButton({ opponentId, opponentName }: Props) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengedId: opponentId,
          message: message.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.show(data.error || "도전장 발송에 실패했습니다.", "error");
        return;
      }

      setSent(true);
      toast.show("도전장을 보냈습니다. 48시간 후 자동 만료됩니다.", "success");
      setTimeout(() => {
        setOpen(false);
        setMessage("");
        setSent(false);
      }, 1200);
    } catch {
      toast.show("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (submitting) return;
    setOpen(false);
    setMessage("");
    setSent(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn"
        style={{ fontSize: "12px" }}
        aria-label={`${opponentName}에게 도전장 보내기`}
      >
        💬 도전장 보내기
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="qc-title"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <form
            onSubmit={handleSubmit}
            className="card w-full max-w-sm p-5 space-y-4"
            style={{ background: "white" }}
          >
            <div>
              <h2 id="qc-title" className="font-extrabold text-[16px]" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
                💬 도전장 보내기
              </h2>
              <p className="text-[12px] mt-1" style={{ color: "var(--text-3)" }}>
                <b style={{ color: "var(--text-2)" }}>{opponentName}</b> 님에게 자유 도전장을 보냅니다. 예약은 따로 진행하세요.
              </p>
            </div>

            <div>
              <label htmlFor="qc-msg" className="block text-[12px] font-bold mb-1.5" style={{ color: "var(--text-2)" }}>
                메시지 <span style={{ color: "var(--text-3)" }}>(선택)</span>
              </label>
              <textarea
                id="qc-msg"
                rows={3}
                maxLength={MAX_MESSAGE}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="이번 주 금요일 저녁 한 판 어떠세요?"
                className="w-full rounded-xl px-3 py-2 text-[13px] focus:outline-none resize-none"
                style={{ border: "1.5px solid var(--border)" }}
                disabled={submitting || sent}
              />
              <p className="text-[10px] mt-1 text-right" style={{ color: "var(--text-3)" }}>
                {message.length} / {MAX_MESSAGE}
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="btn"
                style={{ fontSize: "13px" }}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting || sent}
                className="btn btn-jade"
                style={{ fontSize: "13px", opacity: submitting ? 0.6 : 1 }}
              >
                {sent ? "✓ 발송 완료" : submitting ? "발송 중..." : "도전장 보내기"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
