import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description: "탁구존 개인정보 처리방침",
};

const SECTION_TITLE = "font-semibold text-base mb-1.5 text-gray-900";
const SECTION_BODY  = "text-sm text-gray-700 leading-relaxed";
const SUB_LIST      = "list-disc pl-5 space-y-1";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto pb-12">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← 홈으로</Link>
      <h1 className="text-2xl font-bold mt-4 mb-2">개인정보 처리방침</h1>
      <p className="text-xs text-gray-500 mb-6">
        탁구존(이하 &quot;서비스&quot;)은 개인정보보호법, 정보통신망 이용촉진 및 정보보호 등에 관한 법률(이하 &quot;정보통신망법&quot;)을 준수합니다.
      </p>

      <section className="space-y-5">
        <div>
          <h2 className={SECTION_TITLE}>1. 수집하는 개인정보 항목 및 수집 방법</h2>
          <div className={SECTION_BODY}>
            <p className="mb-2"><b>가. 회원가입 시 (필수)</b></p>
            <ul className={SUB_LIST}>
              <li>이름, 이메일, 비밀번호(단방향 해시 저장)</li>
              <li>만 14세 이상 확인 표시</li>
              <li>이용약관 · 개인정보 수집·이용 동의 기록 (동의 일시, 접속 IP, 브라우저 정보)</li>
            </ul>
            <p className="mt-2 mb-2"><b>나. 회원가입 시 (선택)</b></p>
            <ul className={SUB_LIST}>
              <li>전화번호 (예약 알림 발송용)</li>
              <li>마케팅 · 이벤트 알림 수신 동의</li>
            </ul>
            <p className="mt-2 mb-2"><b>다. 서비스 이용 과정에서 자동 생성</b></p>
            <ul className={SUB_LIST}>
              <li>예약 내역, 경기 기록, ELO 포인트, 시즌 순위</li>
              <li>접속 로그, 쿠키(세션 유지용), 푸시 알림 구독 토큰</li>
            </ul>
            <p className="mt-2 mb-2"><b>라. 수정 시 추가 입력 (선택)</b></p>
            <ul className={SUB_LIST}>
              <li>닉네임, 자기소개, 프로필 사진, 라켓 그립/플레이 스타일</li>
            </ul>
          </div>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>2. 개인정보의 이용 목적</h2>
          <ul className={`${SECTION_BODY} ${SUB_LIST}`}>
            <li>회원 식별, 본인 확인, 로그인 유지</li>
            <li>예약 확정·취소·리마인더, 경기 결과·확인 요청 안내</li>
            <li>이의제기·분쟁 처리 및 부정 이용 차단</li>
            <li>랭킹·시즌·이벤트 등 서비스 기능 제공</li>
            <li>(별도 동의 시) 신규 이벤트 · 마케팅 정보 제공</li>
            <li>통계 분석을 통한 서비스 개선 (개인 식별 불가 형태로 가공)</li>
          </ul>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>3. 보유 및 이용 기간</h2>
          <ul className={`${SECTION_BODY} ${SUB_LIST}`}>
            <li>회원 탈퇴 시 개인정보(이름·이메일·전화번호 등)는 즉시 익명화 처리합니다.</li>
            <li>매치·예약·랭킹 기록은 랭킹 시스템 무결성을 위해 익명화된 상태로 보존합니다.</li>
            <li>관계 법령에 따른 별도 보존이 필요한 경우(통신비밀보호법: 로그 3개월, 전자상거래법: 거래 기록 5년 등) 해당 기간 동안 분리 보관합니다.</li>
          </ul>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>4. 제3자 제공 및 처리 위탁</h2>
          <p className={SECTION_BODY}>
            서비스는 원칙적으로 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다. 다만 아래와 같이 서비스 운영을 위해 일부 업무를 위탁하고 있습니다.
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="text-xs w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1.5 text-left">수탁자</th>
                  <th className="border px-2 py-1.5 text-left">위탁 업무</th>
                  <th className="border px-2 py-1.5 text-left">위치</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-2 py-1.5">Vercel Inc.</td>
                  <td className="border px-2 py-1.5">웹 서비스 호스팅, 파일 저장(Blob)</td>
                  <td className="border px-2 py-1.5">미국</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1.5">Neon Inc.</td>
                  <td className="border px-2 py-1.5">데이터베이스(PostgreSQL) 호스팅</td>
                  <td className="border px-2 py-1.5">미국</td>
                </tr>
                <tr>
                  <td className="border px-2 py-1.5">Resend Inc.</td>
                  <td className="border px-2 py-1.5">이메일 발송</td>
                  <td className="border px-2 py-1.5">미국</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={`${SECTION_BODY} mt-2 text-xs`}>
            위 수탁사들은 모두 GDPR/SOC2 등 국제 표준 보안 수준을 갖춘 사업자이며, 위탁 업무 외 목적으로 개인정보를 사용할 수 없습니다.
          </p>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>5. 정보주체의 권리와 행사 방법</h2>
          <ul className={`${SECTION_BODY} ${SUB_LIST}`}>
            <li><b>열람·정정</b>: 마이페이지 → 내 정보 수정에서 직접 가능</li>
            <li><b>처리 정지·삭제</b>: 마이페이지 → 회원 탈퇴 또는 아래 연락처로 요청</li>
            <li><b>데이터 다운로드</b>: <code className="text-xs bg-gray-100 px-1 rounded">/api/me/export</code> 엔드포인트로 JSON 형식 제공</li>
            <li><b>동의 철회</b>: 마케팅 수신 동의는 마이페이지에서, 약관 전체 철회는 회원 탈퇴를 통해 가능</li>
          </ul>
        </div>

        <div id="marketing">
          <h2 className={SECTION_TITLE}>6. 마케팅·이벤트 정보 수신 동의 (선택)</h2>
          <p className={SECTION_BODY}>
            동의 시 신규 이벤트·시즌 시작·관내 행사 안내를 이메일로 발송합니다. 동의하지 않아도 회원가입 및 예약·경기 서비스 이용에는 제한이 없으며, 동의 후에도 마이페이지에서 언제든 철회할 수 있습니다.
          </p>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>7. 만 14세 미만 아동 보호</h2>
          <p className={SECTION_BODY}>
            서비스는 만 14세 이상의 회원만 가입할 수 있도록 운영합니다. 14세 미만 아동의 개인정보는 수집하지 않으며, 발견 즉시 해당 계정과 데이터를 삭제합니다.
          </p>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>8. 쿠키 사용</h2>
          <ul className={`${SECTION_BODY} ${SUB_LIST}`}>
            <li><b>session</b>: 로그인 유지를 위한 HttpOnly · SameSite=Lax 쿠키</li>
            <li><b>cookieConsent</b>: 쿠키 배너 노출 여부를 기억하기 위한 로컬 저장</li>
          </ul>
          <p className={`${SECTION_BODY} mt-1`}>
            광고·행동 추적용 제3자 쿠키는 사용하지 않습니다. 브라우저 설정에서 쿠키를 차단할 수 있으나 로그인 기능이 제한될 수 있습니다.
          </p>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>9. 안전성 확보 조치</h2>
          <ul className={`${SECTION_BODY} ${SUB_LIST}`}>
            <li>비밀번호 bcrypt 단방향 해시 저장 (원문 미보관)</li>
            <li>세션 토큰 jose JWT 서명, HttpOnly + Secure(프로덕션) 쿠키</li>
            <li>로그인·회원가입에 IP·이메일 기반 레이트 리밋 적용</li>
            <li>상태 변경 API에 Origin 검증(CSRF 방지)</li>
            <li>HTTPS 강제 (배포 환경)</li>
          </ul>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>10. 개인정보 보호 책임자</h2>
          <div className={SECTION_BODY}>
            <p>서비스 운영 및 개인정보 처리에 관한 책임자는 다음과 같습니다.</p>
            <ul className="list-none pl-0 mt-2 space-y-0.5">
              <li>책임자: 탁구존 운영팀</li>
              <li>연락처: <a href="mailto:privacy@pingpongzone.kr" className="text-green-700 underline">privacy@pingpongzone.kr</a></li>
            </ul>
            <p className="mt-2 text-xs">
              개인정보 침해 신고는 한국인터넷진흥원(KISA) 개인정보침해신고센터(국번없이 118, <a href="https://privacy.kisa.or.kr" className="underline" target="_blank" rel="noopener noreferrer">privacy.kisa.or.kr</a>)로도 신고할 수 있습니다.
            </p>
          </div>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>11. 처리방침 변경</h2>
          <p className={SECTION_BODY}>
            본 방침의 중대한 변경 사항은 시행일 최소 7일 전(이용자에게 불리한 변경 시 30일 전)에 서비스 공지사항을 통해 안내합니다.
          </p>
        </div>

        <div className="pt-4 border-t text-xs text-gray-500">
          공고일: 2025-05-11 · 시행일: 2025-05-18
        </div>
      </section>
    </div>
  );
}
