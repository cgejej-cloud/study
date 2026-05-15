import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "이용 약관",
  description: "탁구존 서비스 이용 약관",
};

const SECTION_TITLE = "font-semibold text-base mb-1.5 text-gray-900";
const SECTION_BODY  = "text-sm text-gray-700 leading-relaxed";
const SUB_LIST      = "list-disc pl-5 space-y-1";

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto pb-12">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← 홈으로</Link>
      <h1 className="text-2xl font-bold mt-4 mb-6">서비스 이용 약관</h1>

      <section className="space-y-5">
        <div>
          <h2 className={SECTION_TITLE}>제1조 (목적)</h2>
          <p className={SECTION_BODY}>
            본 약관은 탁구존(이하 &quot;회사&quot;)이 제공하는 탁구존 예약·랭킹 등 일체의 서비스(이하 &quot;서비스&quot;)의 이용 조건과 절차, 회원과 회사의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
          </p>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>제2조 (용어의 정의)</h2>
          <ul className={`${SECTION_BODY} ${SUB_LIST}`}>
            <li><b>이용자</b>: 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원</li>
            <li><b>회원</b>: 회사에 개인정보를 제공하여 회원등록을 한 자로서, 본 서비스를 계속적으로 이용할 수 있는 자</li>
            <li><b>아이디(ID)</b>: 회원 식별을 위해 사용되는 이메일</li>
          </ul>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>제3조 (약관의 게시와 개정)</h2>
          <ul className={`${SECTION_BODY} ${SUB_LIST}`}>
            <li>회사는 본 약관을 서비스 초기 화면 또는 회원가입 화면에 게시합니다.</li>
            <li>약관 개정 시 시행일 최소 7일 전(회원에게 불리하거나 중대한 변경 시 30일 전)에 공지합니다.</li>
            <li>공지 후 시행일까지 회원이 거부 의사를 표시하지 않으면 변경된 약관에 동의한 것으로 봅니다.</li>
            <li>회원이 개정 약관에 동의하지 않을 경우 회원 탈퇴를 통해 이용을 종료할 수 있습니다.</li>
          </ul>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>제4조 (회원가입)</h2>
          <ul className={`${SECTION_BODY} ${SUB_LIST}`}>
            <li>회원가입은 만 14세 이상이 본 약관 및 개인정보 처리방침에 동의함으로써 성립합니다.</li>
            <li>회사는 다음 각 호에 해당하는 신청에 대해서는 가입을 승낙하지 않거나 사후 해지할 수 있습니다.
              <ul className="list-circle pl-5 mt-1 space-y-0.5">
                <li>실명이 아니거나 타인 명의를 이용한 경우</li>
                <li>허위 정보를 기재했거나 회사가 제시한 필수 항목을 누락한 경우</li>
                <li>과거 본 약관 위반 등으로 회원자격이 상실된 적이 있는 경우</li>
              </ul>
            </li>
          </ul>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>제5조 (회원의 의무)</h2>
          <ul className={`${SECTION_BODY} ${SUB_LIST}`}>
            <li>회원은 가입 신청 시 사실에 근거한 정보를 입력해야 하며, 변경 시 지체 없이 갱신해야 합니다.</li>
            <li>회원은 본인 계정 정보를 타인에게 양도·대여할 수 없으며, 비밀번호 관리 책임은 회원에게 있습니다.</li>
            <li>회원은 본 서비스를 통해 알게 된 타인의 정보를 무단 수집·이용·제공해서는 안 됩니다.</li>
          </ul>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>제6조 (예약 정책)</h2>
          <ul className={`${SECTION_BODY} ${SUB_LIST}`}>
            <li>예약은 1시간 단위로 가능하며, 시작 시점 전까지 무료로 취소할 수 있습니다.</li>
            <li>반복 예약은 매주 동일 요일·시간에 자동 생성되며, 개별 또는 일괄 취소가 가능합니다.</li>
            <li>관리자가 이용 불가로 지정한 시간대는 예약할 수 없습니다.</li>
            <li>예약 후 무단 미참여가 반복되면 사전 안내 후 일정 기간 예약을 제한할 수 있습니다.</li>
          </ul>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>제7조 (랭킹 시스템)</h2>
          <ul className={`${SECTION_BODY} ${SUB_LIST}`}>
            <li>ELO 알고리즘으로 포인트를 계산하며, 첫 5경기는 보정 K값(2배 변동)이 적용됩니다.</li>
            <li>경기 기록은 상대방 확인 시 반영되며, 24시간 미확인 시 자동 승인됩니다.</li>
            <li>이의제기는 관리자가 검토하여 승인 또는 무효 처리합니다.</li>
            <li>부정 이용 방지를 위해 하루 최대 5경기, 같은 상대와 1경기, 30분 쿨다운이 적용됩니다.</li>
          </ul>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>제8조 (금지 행위)</h2>
          <ul className={`${SECTION_BODY} ${SUB_LIST}`}>
            <li>허위 경기 기록 등 랭킹 시스템 악용</li>
            <li>타인 명의 도용 또는 다중 계정 운영</li>
            <li>서비스의 안정적 운영을 방해하는 행위(자동화 도구 사용, 비정상 트래픽 생성 등)</li>
            <li>다른 이용자에 대한 비방·차별·괴롭힘 행위</li>
            <li>관계 법령 또는 본 약관에 위배되는 일체의 행위</li>
          </ul>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>제9조 (서비스 제공 및 변경)</h2>
          <ul className={`${SECTION_BODY} ${SUB_LIST}`}>
            <li>서비스는 연중무휴 24시간 제공함을 원칙으로 하나, 시설 점검 등 운영상 필요한 경우 일시 중단될 수 있습니다.</li>
            <li>회사는 사전 공지 후 서비스의 일부 또는 전부를 변경·중단할 수 있습니다.</li>
            <li>천재지변, 회선 장애, 정부의 명령 등 불가항력으로 인한 서비스 중단에 대해서는 책임을 지지 않습니다.</li>
          </ul>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>제10조 (계정 해지 및 이용 제한)</h2>
          <ul className={`${SECTION_BODY} ${SUB_LIST}`}>
            <li>회원은 마이페이지 → 회원 탈퇴를 통해 언제든지 계정을 해지할 수 있습니다.</li>
            <li>회사는 회원이 제8조의 금지 행위를 한 경우 사전 안내 후 일시 정지 또는 영구 정지할 수 있습니다.</li>
            <li>탈퇴·정지 시 개인정보는 처리방침에 따라 처리됩니다.</li>
          </ul>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>제11조 (면책 및 책임 제한)</h2>
          <ul className={`${SECTION_BODY} ${SUB_LIST}`}>
            <li>회사는 회원의 귀책사유로 발생한 손해에 대해 책임을 지지 않습니다.</li>
            <li>회사는 회원이 서비스를 이용하여 기대하는 수익을 얻지 못하거나, 서비스를 통해 얻은 정보로 인한 손해에 대해 책임을 지지 않습니다.</li>
            <li>회사는 회원 간 또는 회원과 제3자 간에 발생한 분쟁에 개입할 의무가 없으며, 이에 대한 손해 배상 책임을 지지 않습니다.</li>
          </ul>
        </div>

        <div>
          <h2 className={SECTION_TITLE}>제12조 (분쟁 해결 및 관할)</h2>
          <ul className={`${SECTION_BODY} ${SUB_LIST}`}>
            <li>본 약관 및 서비스 이용에 관한 분쟁은 회사와 회원이 신의성실의 원칙에 따라 협의로 해결합니다.</li>
            <li>협의로 해결되지 않을 경우, 민사소송법상 관할 법원을 제1심 관할 법원으로 합니다.</li>
            <li>본 약관에 명시되지 않은 사항은 관계 법령 및 일반 상관례에 따릅니다.</li>
          </ul>
        </div>

        <div className="pt-4 border-t text-xs text-gray-500">
          공고일: 2025-05-11 · 시행일: 2025-05-18
        </div>
      </section>
    </div>
  );
}
