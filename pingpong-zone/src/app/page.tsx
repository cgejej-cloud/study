import Link from "next/link";
import TodayStatus from "@/components/TodayStatus";

export default function HomePage() {
  return (
    <div>
      <section className="text-center py-16">
        <h1 className="text-5xl font-extrabold text-green-700 mb-4">탁구존</h1>
        <p className="text-xl text-gray-600 mb-8">
          언제든지 편하게, 탁구를 즐겨보세요
        </p>
        <Link
          href="/reserve"
          className="bg-green-700 text-white text-lg font-semibold px-8 py-3 rounded-full hover:bg-green-600 transition"
        >
          지금 예약하기
        </Link>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="text-4xl mb-3">🏓</div>
          <h3 className="font-bold text-lg mb-2">탁구대 4대 운영</h3>
          <p className="text-gray-500 text-sm">일반 2대 · 스마트 2대</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="text-4xl mb-3">📅</div>
          <h3 className="font-bold text-lg mb-2">간편 온라인 예약</h3>
          <p className="text-gray-500 text-sm">원하는 시간에 바로 예약</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="text-4xl mb-3">🕐</div>
          <h3 className="font-bold text-lg mb-2">운영시간</h3>
          <p className="text-gray-500 text-sm">매일 09:00 ~ 22:00</p>
        </div>
      </section>

      <TodayStatus />

      <section className="mt-8 bg-white rounded-xl shadow p-8">
        <h2 className="text-2xl font-bold mb-4">오시는 길</h2>
        <div className="text-gray-600 space-y-1">
          <p>📍 서울특별시 강남구 테헤란로 123, 탁구존 빌딩 2층</p>
          <p>🚇 지하철 2호선 강남역 3번 출구 도보 5분</p>
          <p>📞 02-1234-5678</p>
        </div>
      </section>
    </div>
  );
}
