import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-5">
      <div className="text-6xl">🏓</div>
      <h1 className="text-2xl font-bold text-gray-900">페이지를 찾을 수 없어요</h1>
      <p className="text-sm text-gray-500">
        주소가 잘못되었거나 페이지가 삭제되었습니다.
      </p>
      <Link
        href="/"
        className="inline-block bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-green-600 transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
