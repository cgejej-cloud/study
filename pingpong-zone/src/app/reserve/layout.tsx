import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "예약하기",
  description: "탁구대를 1시간 단위로 빠르게 예약하세요. 반복 예약과 실시간 가용성 확인 지원.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
