import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const winner = searchParams.get("winner") ?? "승자";
  const loser = searchParams.get("loser") ?? "패자";
  const change = searchParams.get("change") ?? "+0";
  const elo = searchParams.get("elo") ?? "1000";
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const changeNum = parseInt(change.replace("+", ""), 10);
  const changeDisplay = changeNum >= 0 ? `+${changeNum}` : `${changeNum}`;
  const changeColor = changeNum >= 0 ? "#4ade80" : "#f87171";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#052e16"/>
      <stop offset="100%" stop-color="#1a4730"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.1)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.04)"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- decorative circles -->
  <circle cx="1100" cy="80" r="180" fill="rgba(74,222,128,0.06)"/>
  <circle cx="100" cy="550" r="150" fill="rgba(74,222,128,0.05)"/>

  <!-- logo area -->
  <text x="80" y="80" font-family="system-ui, sans-serif" font-size="28" font-weight="700" fill="#4ade80">🏓 탁구존</text>

  <!-- match result card -->
  <rect x="80" y="120" width="1040" height="380" rx="24" fill="url(#card)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>

  <!-- VS layout -->
  <text x="600" y="260" font-family="system-ui, sans-serif" font-size="56" font-weight="900" fill="rgba(255,255,255,0.2)" text-anchor="middle">VS</text>

  <!-- winner -->
  <text x="310" y="210" font-family="system-ui, sans-serif" font-size="22" font-weight="600" fill="#4ade80" text-anchor="middle">승리</text>
  <text x="310" y="285" font-family="system-ui, sans-serif" font-size="52" font-weight="800" fill="#ffffff" text-anchor="middle">${escapeXml(winner)}</text>

  <!-- loser -->
  <text x="890" y="210" font-family="system-ui, sans-serif" font-size="22" font-weight="600" fill="rgba(255,255,255,0.5)" text-anchor="middle">패배</text>
  <text x="890" y="285" font-family="system-ui, sans-serif" font-size="52" font-weight="800" fill="rgba(255,255,255,0.6)" text-anchor="middle">${escapeXml(loser)}</text>

  <!-- divider -->
  <line x1="80" y1="360" x2="1120" y2="360" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>

  <!-- elo info -->
  <text x="310" y="420" font-family="system-ui, sans-serif" font-size="20" fill="rgba(255,255,255,0.6)" text-anchor="middle">ELO 변동</text>
  <text x="310" y="460" font-family="system-ui, sans-serif" font-size="36" font-weight="700" fill="${changeColor}" text-anchor="middle">${escapeXml(changeDisplay)}</text>

  <text x="600" y="420" font-family="system-ui, sans-serif" font-size="20" fill="rgba(255,255,255,0.6)" text-anchor="middle">현재 ELO</text>
  <text x="600" y="460" font-family="system-ui, sans-serif" font-size="36" font-weight="700" fill="#ffffff" text-anchor="middle">${escapeXml(elo)}</text>

  <text x="890" y="420" font-family="system-ui, sans-serif" font-size="20" fill="rgba(255,255,255,0.6)" text-anchor="middle">날짜</text>
  <text x="890" y="460" font-family="system-ui, sans-serif" font-size="30" font-weight="600" fill="rgba(255,255,255,0.8)" text-anchor="middle">${escapeXml(date)}</text>

  <!-- footer -->
  <text x="600" y="590" font-family="system-ui, sans-serif" font-size="18" fill="rgba(255,255,255,0.35)" text-anchor="middle">pingpong-zone.com</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
