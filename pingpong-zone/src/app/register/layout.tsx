import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원가입",
  description: "탁구존에 가입하여 예약하고 랭킹을 즐기세요.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
