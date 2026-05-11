import Link from "next/link";
import TodayStatus from "@/components/TodayStatus";
import NoticeBanner from "@/components/NoticeBanner";
import ActivityFeed from "@/components/ActivityFeed";
import MyStatusCard from "@/components/MyStatusCard";

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* ── 공지 배너 ────────────────────────────────────────── */}
      <NoticeBanner />

      {/* ── 내 상태 카드 (로그인 시) ───────────────────────── */}
      <MyStatusCard />

      {/* ── 히어로 ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-700 to-green-900 rounded-2xl px-8 py-14 text-center text-white shadow-lg">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{backgroundImage:"radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "60px 60px"}} />
        <div className="relative">
          <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-wide">
            스마트 탁구장
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 tracking-tight">
            탁구존에 오신 것을<br className="hidden sm:block" /> 환영합니다
          </h1>
          <p className="text-green-100 text-lg mb-8 max-w-md mx-auto">
            언제든지 편하게, 간편하게 예약하고<br className="hidden sm:block" />
            랭킹으로 실력을 확인하세요
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/reserve"
              className="bg-white text-green-700 font-bold px-7 py-3 rounded-xl hover:bg-green-50 transition-colors shadow-sm text-sm"
            >
              지금 예약하기
            </Link>
            <Link
              href="/ranking"
              className="bg-white/10 border border-white/30 text-white font-semibold px-7 py-3 rounded-xl hover:bg-white/20 transition-colors text-sm"
            >
              랭킹 보기
            </Link>
          </div>
        </div>
      </section>

      {/* ── 오늘 현황 ────────────────────────────────────────── */}
      <TodayStatus />

      {/* ── 최근 경기 활동 ─────────────────────────────────── */}
      <ActivityFeed />

      {/* ── 특징 카드 ────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: "🏓", title: "탁구대 4대", desc: "일반 2대 · 스마트 2대" },
          { icon: "📅", title: "간편 온라인 예약", desc: "원하는 시간에 바로 예약" },
          { icon: "🕐", title: "운영시간", desc: "매일 09:00 ~ 22:00" },
        ].map((f) => (
          <div key={f.title} className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 text-center hover:shadow-md transition-shadow">
            <div className="text-4xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
            <p className="text-gray-500 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* ── 오시는 길 ────────────────────────────────────────── */}
      <section className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">오시는 길</h2>
        <div className="text-gray-600 space-y-2 text-sm">
          <p className="flex items-center gap-2"><span>📍</span> 서울특별시 강남구 테헤란로 123, 탁구존 빌딩 2층</p>
          <p className="flex items-center gap-2"><span>🚇</span> 지하철 2호선 강남역 3번 출구 도보 5분</p>
          <p className="flex items-center gap-2"><span>📞</span> 02-1234-5678</p>
        </div>
      </section>
    </div>
  );
}
