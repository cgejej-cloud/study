"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookieConsent";
const STORAGE_VALUE = "v1";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v !== STORAGE_VALUE) setVisible(true);
    } catch {
      // SSR or storage disabled
    }
  }, []);

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, STORAGE_VALUE); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="쿠키 사용 안내"
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-[55] rounded-xl shadow-lg p-4 text-[12px]"
      style={{ background: "white", border: "1.5px solid var(--border)" }}
    >
      <p style={{ color: "var(--text-2)" }} className="mb-2 leading-relaxed">
        본 사이트는 로그인 유지를 위한 필수 쿠키와, 본 배너 표시 여부를 기억하는 로컬 저장소만 사용합니다. 광고·추적 쿠키는 사용하지 않습니다.{" "}
        <Link href="/privacy#cookie" className="underline" style={{ color: "var(--jade-700)" }}>
          자세히
        </Link>
      </p>
      <div className="flex justify-end">
        <button
          onClick={accept}
          className="font-bold px-4 py-1.5 rounded-lg"
          style={{ background: "var(--jade-950)", color: "white" }}
          aria-label="쿠키 사용 안내 확인"
        >
          확인
        </button>
      </div>
    </div>
  );
}
