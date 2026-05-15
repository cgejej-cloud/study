import Link from "next/link";

export const dynamic = "force-dynamic";
import TodayStatus from "@/components/TodayStatus";
import NoticeBanner from "@/components/NoticeBanner";
import EventBanner from "@/components/EventBanner";
import ActivityFeed from "@/components/ActivityFeed";
import MyStatusCard from "@/components/MyStatusCard";
import SuggestionsTeaser from "@/components/SuggestionsTeaser";

export default function HomePage() {
  return (
    <div className="space-y-5">
      <NoticeBanner />
      <EventBanner />
      <MyStatusCard />
      <SuggestionsTeaser />

      {/* ── 히어로 ─────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-3xl px-7 py-11 text-white"
        style={{ background: "linear-gradient(135deg, var(--jade-950) 0%, #1a4730 60%, var(--jade-800) 100%)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }}
        />
        <div className="absolute top-6 right-8 w-16 h-16 rounded-full opacity-10" style={{ background: "var(--jade-400)" }} />
        <div className="absolute bottom-4 right-24 w-8 h-8 rounded-full opacity-10" style={{ background: "var(--sun-400)" }} />
        <div className="absolute top-14 right-32 w-5 h-5 rounded-full opacity-[0.08]" style={{ background: "white" }} />
        <div className="relative max-w-xl">
          <div
            className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase"
            style={{ background: "rgba(255,255,255,0.12)", color: "var(--jade-200)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            스마트 탁구장
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2.5 leading-tight" style={{ letterSpacing: "-0.03em" }}>
            탁구존에 오신 것을<br />환영합니다 🏓
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--jade-200)", lineHeight: "1.7" }}>
            간편하게 예약하고, 랭킹으로 실력을 확인하세요.
          </p>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link href="/reserve" className="btn btn-jade" style={{ fontSize: "13px", padding: "9px 20px" }}>
              지금 예약하기
            </Link>
            <Link
              href="/ranking"
              className="btn"
              style={{ background: "rgba(255,255,255,0.12)", color: "white", border: "1.5px solid rgba(255,255,255,0.2)", fontSize: "13px", padding: "9px 20px" }}
            >
              랭킹 보기
            </Link>
          </div>
        </div>
      </section>

      {/* ── 오늘 현황 ─────────────────────────── */}
      <TodayStatus />

      {/* ── 하단 2-column ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <div className="md:col-span-3"><ActivityFeed /></div>
        <div className="md:col-span-2 space-y-4">
          <div className="card p-4">
            <p className="section-title mb-3">시설 안내</p>
            <div className="space-y-2.5">
              {[
                { icon: "🏓", label: "탁구대 4대", sub: "일반 2대 · 스마트 2대" },
                { icon: "📅", label: "간편 온라인 예약", sub: "원하는 시간에 바로 예약" },
                { icon: "🕐", label: "운영시간", sub: "매일 09:00 ~ 22:00" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: "var(--jade-50)" }}>
                    {f.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-[13px]" style={{ color: "var(--text-1)" }}>{f.label}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{f.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-4">
            <p className="section-title mb-3">오시는 길</p>
            <div className="space-y-1.5 text-[12px]" style={{ color: "var(--text-2)" }}>
              <p className="flex items-start gap-2"><span className="shrink-0 mt-0.5">📍</span><span>서울특별시 강남구 테헤란로 123, 탁구존 빌딩 2층</span></p>
              <p className="flex items-center gap-2"><span>🚇</span><span>강남역 3번 출구 도보 5분</span></p>
              <p className="flex items-center gap-2"><span>📞</span><span>02-1234-5678</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
