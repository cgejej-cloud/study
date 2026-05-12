import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "이용 약관",
  description: "탁구존 서비스 이용 약관",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← 홈으로</Link>
      <h1 className="text-2xl font-bold mt-4 mb-6">이용 약관</h1>

      <section className="space-y-4 text-sm text-gray-700">
        <div>
          <h2 className="font-semibold text-base mb-1">제1조 (목적)</h2>
          <p>본 약관은 탁구존이 제공하는 예약·랭킹 서비스 이용에 관한 권리와 의무를 규정합니다.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">제2조 (예약 정책)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>예약은 1시간 단위로 가능하며, 시작 시점 전까지 무료로 취소할 수 있습니다.</li>
            <li>반복 예약은 매주 동일 요일·시간에 자동 생성되며, 일괄 취소가 가능합니다.</li>
            <li>관리자가 이용 불가로 지정한 시간대는 예약할 수 없습니다.</li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">제3조 (랭킹 시스템)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>ELO 알고리즘으로 포인트를 계산하며, 첫 5경기는 보정 K값 적용 (2배 변동)</li>
            <li>경기 기록 후 상대방 확인 시 포인트 반영. 24시간 미확인 시 자동 승인</li>
            <li>이의제기 시 관리자가 검토하여 승인 또는 무효 처리합니다.</li>
            <li>하루 최대 5경기, 같은 상대와 1경기, 30분 쿨다운 제한이 적용됩니다.</li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">제4조 (금지 행위)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>허위 경기 기록 등 랭킹 시스템 악용</li>
            <li>타인 명의 도용 또는 다중 계정 운영</li>
            <li>예약 후 무단 미참여 (반복 시 이용 제한 가능)</li>
          </ul>
        </div>
        <div className="pt-4 border-t text-xs text-gray-400">
          최종 개정일: 2025-05-11
        </div>
      </section>
    </div>
  );
}
