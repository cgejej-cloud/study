import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "랭킹",
  description: "ELO 기반 실시간 랭킹과 시즌 순위, 선수별 통계를 확인하세요.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
