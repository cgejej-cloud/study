"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-5">
      <div className="text-5xl">⚠️</div>
      <h1 className="text-2xl font-bold text-gray-900">문제가 발생했어요</h1>
      <p className="text-sm text-gray-500">
        잠시 후 다시 시도해주세요. 문제가 계속되면 관리자에게 문의해주세요.
      </p>
      {error.digest && (
        <p className="text-xs text-gray-300 font-mono">오류 코드: {error.digest}</p>
      )}
      <div className="flex items-center justify-center gap-2 pt-2">
        <button
          onClick={() => reset()}
          className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
