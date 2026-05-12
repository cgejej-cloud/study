export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="text-6xl">🏓</div>
      <h1 className="font-extrabold text-[22px]" style={{ letterSpacing: "-0.03em", color: "var(--text-1)" }}>
        오프라인 상태입니다
      </h1>
      <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
        인터넷 연결을 확인해주세요. 연결되면 자동으로 복구됩니다.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="btn btn-jade"
      >
        다시 시도
      </button>
    </div>
  );
}
