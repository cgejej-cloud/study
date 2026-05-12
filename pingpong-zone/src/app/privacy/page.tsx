import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description: "탁구존 개인정보 처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto prose prose-sm">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← 홈으로</Link>
      <h1 className="text-2xl font-bold mt-4 mb-6">개인정보 처리방침</h1>

      <section className="space-y-4 text-sm text-gray-700">
        <div>
          <h2 className="font-semibold text-base mb-1">1. 수집하는 개인정보 항목</h2>
          <p>회원가입 시 이름, 이메일, 비밀번호(해시), 연락처(선택) 를 수집합니다.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">2. 개인정보 이용 목적</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 식별 및 본인 확인</li>
            <li>예약 확정·취소·리마인더 안내</li>
            <li>경기 결과 알림 및 이의제기 처리</li>
            <li>서비스 개선을 위한 통계 분석 (개인 식별 정보는 익명화)</li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">3. 보유 기간</h2>
          <p>회원 탈퇴 시 즉시 개인정보를 익명화하며, 매치 기록은 랭킹 무결성을 위해 익명으로 보존됩니다.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">4. 이메일 알림</h2>
          <p>마이페이지 → 내 정보 수정에서 언제든지 알림 수신 동의를 철회할 수 있습니다.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">5. 보안 조치</h2>
          <p>비밀번호는 bcrypt 로 해시 저장하며, 세션은 HttpOnly · SameSite=Lax 쿠키로 관리됩니다. 비밀번호 무차별 대입을 차단하기 위해 IP 기반 레이트 리밋을 적용합니다.</p>
        </div>
        <div className="pt-4 border-t text-xs text-gray-400">
          최종 개정일: 2025-05-11
        </div>
      </section>
    </div>
  );
}
