"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Summary = {
  rewardPoints: number;
  totalMatches: number;
  dailyStreak: number;
  lastMatchDate: string | null;
  last7Total: number;
  last7ByType: Record<string, { sum: number; count: number }>;
};

type HistoryItem = {
  id: string;
  type: string;
  amount: number;
  matchId: string | null;
  metadata: string | null;
  createdAt: string;
  label: string;
};

type Milestone = { target: number; amount: number; remaining: number } | null;

const TYPE_COLOR: Record<string, string> = {
  match_played:  "bg-gray-100 text-gray-700",
  match_won:     "bg-blue-50 text-blue-700",
  first_of_day:  "bg-amber-50 text-amber-700",
  daily_streak:  "bg-orange-50 text-orange-700",
  milestone_10:  "bg-emerald-50 text-emerald-700",
  milestone_50:  "bg-emerald-50 text-emerald-700",
  milestone_100: "bg-emerald-50 text-emerald-700",
};

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function RewardsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [milestone, setMilestone] = useState<Milestone>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/rewards")
      .then((r) => {
        if (r.status === 401) { router.push("/login?next=/mypage/rewards"); return null; }
        return r.ok ? r.json() : null;
      })
      .then((data) => {
        if (!data) return;
        setSummary(data.summary);
        setMilestone(data.nextMilestone);
        setHistory(data.history);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse space-y-4">
        <div className="h-28 rounded-2xl" style={{ background: "var(--border)" }} />
        <div className="h-20 rounded-2xl" style={{ background: "var(--border)" }} />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="max-w-md mx-auto py-16 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
        <p>리워드 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const progress = milestone
    ? Math.round(((milestone.target - milestone.remaining) / milestone.target) * 100)
    : 100;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/mypage" className="text-gray-400 hover:text-gray-600 text-lg" aria-label="마이페이지로">←</Link>
        <h1 className="text-2xl font-bold text-gray-900">🎁 리워드</h1>
        <Link href="/rewards" className="ml-auto text-xs font-semibold text-green-700 hover:underline">
          전체 랭킹 →
        </Link>
      </div>

      {/* 메인 카드 */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{ background: "linear-gradient(135deg, #15803d 0%, #052e16 100%)" }}
      >
        <p className="text-[12px] opacity-80 mb-1">누적 리워드</p>
        <p className="text-[36px] font-extrabold leading-none">{summary.rewardPoints.toLocaleString()}<span className="text-[16px] font-bold ml-1">pt</span></p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[18px] font-bold">{summary.totalMatches}</p>
            <p className="text-[10.5px] opacity-80 mt-0.5">총 경기</p>
          </div>
          <div>
            <p className="text-[18px] font-bold">🔥 {summary.dailyStreak}</p>
            <p className="text-[10.5px] opacity-80 mt-0.5">연속 출석</p>
          </div>
          <div>
            <p className="text-[18px] font-bold">+{summary.last7Total}</p>
            <p className="text-[10.5px] opacity-80 mt-0.5">최근 7일</p>
          </div>
        </div>
      </div>

      {/* 다음 마일스톤 */}
      {milestone ? (
        <div className="card p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
              다음 마일스톤: {milestone.target}경기
            </p>
            <p className="text-[12px] font-bold" style={{ color: "var(--jade-700)" }}>
              +{milestone.amount}pt
            </p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full transition-all" style={{ width: `${progress}%`, background: "var(--jade-500)" }} />
          </div>
          <p className="text-[11px] mt-1.5 text-right" style={{ color: "var(--text-3)" }}>
            {milestone.remaining}경기 남음
          </p>
        </div>
      ) : (
        <div className="card p-4 text-center text-[13px]" style={{ color: "var(--text-2)" }}>
          🏆 모든 마일스톤 달성!
        </div>
      )}

      {/* 적립 규칙 */}
      <details className="card p-4">
        <summary className="text-[13px] font-semibold cursor-pointer" style={{ color: "var(--text-1)" }}>
          적립 규칙 보기
        </summary>
        <ul className="mt-3 space-y-1.5 text-[12px]" style={{ color: "var(--text-2)" }}>
          <li>• 경기 참여 <b>+10pt</b> (양 선수 모두)</li>
          <li>• 승리 보너스 <b>+15pt</b></li>
          <li>• 그날 첫 경기 <b>+20pt</b></li>
          <li>• 연속 출석 <b>+5pt × 연속 일수</b> (최대 +35pt)</li>
          <li>• 10/50/100경기 마일스톤 <b>+100/300/500pt</b></li>
          <li className="text-[11px] mt-2" style={{ color: "var(--text-3)" }}>※ 경기가 confirmed 상태로 확정되면 자동 적립됩니다.</li>
        </ul>
      </details>

      {/* 히스토리 */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <p className="font-semibold text-gray-700 text-sm">최근 적립 내역</p>
        </div>
        {history.length === 0 ? (
          <p className="p-6 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
            적립 내역이 없습니다. 경기를 기록해보세요.
          </p>
        ) : (
          <ul className="divide-y">
            {history.map((h) => {
              const meta = h.metadata ? JSON.parse(h.metadata) as { streak?: number } : null;
              const label = h.type === "daily_streak" && meta?.streak
                ? `${h.label} (${meta.streak}일)`
                : h.label;
              return (
                <li key={h.id} className="px-4 py-2.5 flex items-center gap-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${TYPE_COLOR[h.type] ?? "bg-gray-100 text-gray-600"}`}>
                    {label}
                  </span>
                  <span className="text-[11px] text-gray-400 flex-1">{timeAgo(h.createdAt)}</span>
                  <span className="text-[13px] font-bold text-green-700">
                    +{h.amount}pt
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
