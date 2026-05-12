import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// QR 코드를 순수 SVG로 생성 (외부 라이브러리 없음)
// Reed-Solomon 없이 URL을 text/svg로 임베딩한 간단 QR 링크 SVG

function buildQrSvg(url: string, label: string): string {
  const encoded = url.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 280" width="240" height="280">
  <rect width="240" height="280" fill="white" rx="12"/>
  <!-- 탁구존 로고 영역 -->
  <rect x="20" y="16" width="200" height="36" fill="#0d3621" rx="8"/>
  <text x="120" y="39" font-family="sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle">🏓 탁구존</text>
  <!-- 탁구대 이름 -->
  <text x="120" y="72" font-family="sans-serif" font-size="12" fill="#3d4f41" text-anchor="middle" font-weight="600">${label}</text>
  <!-- QR 안내 텍스트 -->
  <text x="120" y="90" font-family="sans-serif" font-size="9" fill="#6b7f6e" text-anchor="middle">QR을 스캔하거나 아래 URL로 접속</text>
  <!-- QR 대체 박스 (실제 환경에서는 qrcode 라이브러리로 교체) -->
  <rect x="60" y="100" width="120" height="120" fill="#f0fdf4" rx="8" stroke="#dcfce7" stroke-width="2"/>
  <rect x="70" y="110" width="100" height="100" fill="white" rx="4" stroke="#bbf7d0" stroke-width="1"/>
  <!-- 파인더 패턴 (좌상) -->
  <rect x="76" y="116" width="28" height="28" fill="#0d3621" rx="2"/>
  <rect x="80" y="120" width="20" height="20" fill="white" rx="1"/>
  <rect x="84" y="124" width="12" height="12" fill="#0d3621" rx="1"/>
  <!-- 파인더 패턴 (우상) -->
  <rect x="116" y="116" width="28" height="28" fill="#0d3621" rx="2"/>
  <rect x="120" y="120" width="20" height="20" fill="white" rx="1"/>
  <rect x="124" y="124" width="12" height="12" fill="#0d3621" rx="1"/>
  <!-- 파인더 패턴 (좌하) -->
  <rect x="76" y="156" width="28" height="28" fill="#0d3621" rx="2"/>
  <rect x="80" y="160" width="20" height="20" fill="white" rx="1"/>
  <rect x="84" y="164" width="12" height="12" fill="#0d3621" rx="1"/>
  <!-- 중앙 데이터 영역 (장식) -->
  <rect x="116" y="156" width="6" height="6" fill="#0d3621" rx="1"/>
  <rect x="126" y="156" width="6" height="6" fill="#0d3621" rx="1"/>
  <rect x="136" y="156" width="6" height="6" fill="#0d3621" rx="1"/>
  <rect x="116" y="166" width="6" height="6" fill="#0d3621" rx="1"/>
  <rect x="136" y="166" width="6" height="6" fill="#0d3621" rx="1"/>
  <rect x="116" y="176" width="6" height="6" fill="#0d3621" rx="1"/>
  <rect x="126" y="176" width="6" height="6" fill="#0d3621" rx="1"/>
  <!-- URL 텍스트 -->
  <text x="120" y="238" font-family="monospace" font-size="7" fill="#6b7f6e" text-anchor="middle">${encoded.slice(0, 36)}${encoded.length > 36 ? "..." : ""}</text>
  <text x="120" y="260" font-family="sans-serif" font-size="8" fill="#6b7f6e" text-anchor="middle">예약 후 QR로 빠르게 경기 기록</text>
</svg>`;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const table = await prisma.table.findUnique({
    where: { id },
    select: { id: true, name: true, isActive: true },
  });
  if (!table) return NextResponse.json({ error: "탁구대를 찾을 수 없습니다." }, { status: 404 });
  if (!table.isActive) return NextResponse.json({ error: "비활성 탁구대입니다." }, { status: 400 });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/reserve/qr/${table.id}`;
  const svg = buildQrSvg(url, table.name);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
