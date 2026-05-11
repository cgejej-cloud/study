import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

const scenarios = JSON.parse(await readFile("qa/scenarios.json", "utf-8"));
const SHOTS = "qa/shots";

// 스크린샷을 base64 임베드 (단일 HTML 파일로 공유 가능)
async function embed(file) {
  const buf = await readFile(path.join(SHOTS, file));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

for (const s of scenarios) {
  for (const sh of s.shots) {
    sh.dataUri = await embed(sh.file);
  }
}

const totalShots = scenarios.reduce((a, s) => a + s.shots.length, 0);
const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>탁구존 QA 리포트</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", system-ui, sans-serif;
    background: #f8fafc; color: #0f172a; line-height: 1.5; padding: 32px 16px 80px; }
  .container { max-width: 1100px; margin: 0 auto; }
  header { background: linear-gradient(135deg, #15803d, #052e16); color: white;
    border-radius: 20px; padding: 36px 32px; margin-bottom: 32px; box-shadow: 0 8px 24px rgba(21,128,61,0.18); }
  header h1 { font-size: 28px; font-weight: 800; margin-bottom: 4px; letter-spacing: -0.02em; }
  header p { color: #bbf7d0; font-size: 14px; }
  header .stats { display: flex; gap: 24px; margin-top: 20px; flex-wrap: wrap; }
  header .stat { background: rgba(255,255,255,0.12); padding: 12px 18px; border-radius: 12px; min-width: 100px; }
  header .stat b { font-size: 22px; font-weight: 800; display: block; }
  header .stat span { color: #bbf7d0; font-size: 11px; }
  .toc { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px 24px; margin-bottom: 32px; }
  .toc h2 { font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 10px; }
  .toc ol { padding-left: 22px; columns: 2; column-gap: 24px; }
  .toc li { padding: 3px 0; font-size: 13px; }
  .toc a { color: #15803d; text-decoration: none; }
  .toc a:hover { text-decoration: underline; }
  .scenario { background: white; border-radius: 16px; padding: 28px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .scenario h2 { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 8px; letter-spacing: -0.01em; }
  .scenario .badge { display: inline-block; background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 6px;
    font-size: 11px; font-weight: 700; margin-right: 8px; vertical-align: 1px; }
  .scenario .meta { color: #64748b; font-size: 13px; margin: 10px 0; line-height: 1.6; }
  .scenario .meta b { color: #334155; font-weight: 600; }
  .scenario .expected { background: #eff6ff; border-left: 3px solid #3b82f6; padding: 10px 14px; border-radius: 6px;
    font-size: 13px; color: #1e40af; margin-bottom: 18px; }
  .shots { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-top: 16px; }
  .shot { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #f8fafc; }
  .shot .label { padding: 8px 12px; font-size: 12px; font-weight: 600; color: #475569; background: white; border-bottom: 1px solid #e2e8f0;
    display: flex; align-items: center; gap: 8px; }
  .shot .num { background: #15803d; color: white; width: 18px; height: 18px; border-radius: 50%; display: inline-flex;
    align-items: center; justify-content: center; font-size: 10px; font-weight: 800; }
  .shot img { display: block; width: 100%; height: auto; cursor: zoom-in; transition: opacity 0.15s; }
  .shot img:hover { opacity: 0.85; }
  footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
  /* lightbox */
  dialog { border: none; padding: 0; max-width: 95vw; max-height: 95vh; background: transparent; }
  dialog::backdrop { background: rgba(0,0,0,0.85); }
  dialog img { max-width: 95vw; max-height: 95vh; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
  dialog .close { position: fixed; top: 16px; right: 20px; color: white; font-size: 32px; cursor: pointer;
    background: rgba(0,0,0,0.5); width: 44px; height: 44px; border-radius: 50%; display: flex;
    align-items: center; justify-content: center; border: none; }
</style>
</head>
<body>
<div class="container">

  <header>
    <h1>🏓 탁구존 QA 리포트</h1>
    <p>10개 사용자 시나리오 · Playwright 자동화 · 데스크탑/모바일 검증</p>
    <div class="stats">
      <div class="stat"><b>${scenarios.length}</b><span>시나리오</span></div>
      <div class="stat"><b>${totalShots}</b><span>스크린샷</span></div>
      <div class="stat"><b>39</b><span>유닛 테스트</span></div>
      <div class="stat"><b>48</b><span>빌드 페이지</span></div>
      <div class="stat"><b>${now}</b><span>생성 시각 (KST)</span></div>
    </div>
  </header>

  <nav class="toc">
    <h2>📋 시나리오 목차</h2>
    <ol>
      ${scenarios.map((s) => `<li><a href="#${s.name}">${s.name.replace(/_/g, " ").replace(/^\d+\s/, "")}</a></li>`).join("")}
    </ol>
  </nav>

  ${scenarios.map((s, i) => `
  <section id="${s.name}" class="scenario">
    <h2><span class="badge">시나리오 ${String(i + 1).padStart(2, "0")}</span>${s.name.replace(/^\d+_/, "").replace(/_/g, " ")}</h2>
    <p class="meta"><b>설명:</b> ${s.description}</p>
    <p class="expected"><b>✅ 기대 결과:</b> ${s.expected}</p>
    <div class="shots">
      ${s.shots.map((sh, j) => `
        <figure class="shot">
          <figcaption class="label">
            <span class="num">${j + 1}</span>
            <span>${sh.label.replace(/_/g, " ")}</span>
          </figcaption>
          <img src="${sh.dataUri}" alt="${sh.label}" loading="lazy" onclick="openShot(this)" />
        </figure>
      `).join("")}
    </div>
  </section>
  `).join("")}

  <footer>
    <p>탁구존 · QA 자동화 리포트 · Playwright + Chromium</p>
  </footer>

</div>

<dialog id="lightbox" onclick="this.close()">
  <button class="close" onclick="document.getElementById('lightbox').close(); event.stopPropagation();">×</button>
  <img id="lightbox-img" alt="" />
</dialog>

<script>
function openShot(img) {
  const dlg = document.getElementById('lightbox');
  document.getElementById('lightbox-img').src = img.src;
  dlg.showModal();
}
</script>
</body>
</html>`;

await writeFile("qa/report.html", html);
console.log(`✅ qa/report.html 생성 (${(html.length / 1024).toFixed(0)} KB)`);
