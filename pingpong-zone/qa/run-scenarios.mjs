import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT = path.resolve("qa/shots");
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

await mkdir(OUT, { recursive: true });

const scenarios = [];

function step(name, description, expected) {
  return { name, description, expected, shots: [] };
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

async function newPage(viewport = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ viewport, locale: "ko-KR" });
  const page = await ctx.newPage();
  return { ctx, page };
}

async function shot(s, page, label) {
  // 외부 폰트 로딩 대기
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(300);
  const filename = `${s.name.replace(/[^a-z0-9]/gi, "_")}_${s.shots.length + 1}_${label.replace(/[^a-z0-9]/gi, "_")}.png`;
  const fullPath = path.join(OUT, filename);
  await page.screenshot({ path: fullPath, fullPage: true });
  s.shots.push({ label, file: filename });
  console.log(`📸 ${s.name} - ${label}`);
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL((u) => !u.toString().includes("/login"), { timeout: 10_000 }),
    page.click('button[type="submit"]'),
  ]).catch(() => {});
  await page.waitForLoadState("networkidle");
}

// ───────────────────────────────────────────────────────────────────────────
// 시나리오 1: 비로그인 방문자 - 홈 / 랭킹 / 회원가입
// ───────────────────────────────────────────────────────────────────────────
{
  const s = step(
    "01_방문자_홈_탐색",
    "비로그인 방문자가 홈 > 랭킹 > 시즌 아카이브 > 회원가입 페이지를 둘러본다",
    "공지 배너 · 활동 피드 · 랭킹 표 · 회원가입 폼이 정상 표시되고, 마이페이지/관리 접근 시 로그인으로 리다이렉트"
  );
  scenarios.push(s);

  const { page } = await newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot(s, page, "홈_데스크탑");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot(s, page, "홈_모바일");

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE}/ranking`, { waitUntil: "networkidle" });
  await shot(s, page, "랭킹_전체");

  await page.goto(`${BASE}/seasons`, { waitUntil: "networkidle" });
  await shot(s, page, "시즌_아카이브");

  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "admin@pingpongzone.kr");
  await page.waitForTimeout(900); // 디바운스 + API
  await shot(s, page, "회원가입_이메일중복_경고");

  await page.goto(`${BASE}/mypage`, { waitUntil: "networkidle" });
  await shot(s, page, "마이페이지_미인증_리다이렉트");
}

// ───────────────────────────────────────────────────────────────────────────
// 시나리오 2: 신규 회원가입 + 약한 비밀번호 거부
// ───────────────────────────────────────────────────────────────────────────
{
  const s = step(
    "02_회원가입_검증",
    "신규 사용자가 약한 비밀번호로 가입 시 거부되고, 강한 비밀번호로 성공",
    "8자 미만이면 서버가 거부, 8자+ 이면 가입 성공 후 로그인 페이지로 이동"
  );
  scenarios.push(s);

  const { page } = await newPage();
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await page.fill('input[name="name"]', "테스트유저");
  await page.fill('input[name="email"]', "newbie+qa@example.com");
  await page.waitForTimeout(900);
  await shot(s, page, "이메일_가용_확인");

  // 약한 비밀번호 시도 (서버 검증)
  await page.fill('input[name="password"]', "1234567");
  await page.evaluate(() => {
    const f = document.querySelector("form");
    f?.setAttribute("novalidate", "");
    const inp = document.querySelector('input[name="password"]');
    inp?.removeAttribute("minlength");
  });
  await page.click('button[type="submit"]');
  await page.waitForTimeout(800);
  await shot(s, page, "약한_비밀번호_거부");
}

// ───────────────────────────────────────────────────────────────────────────
// 시나리오 3: 사용자 로그인 + 마이페이지 + 매치 확인 대기
// ───────────────────────────────────────────────────────────────────────────
{
  const s = step(
    "03_로그인_마이페이지",
    "데모 사용자가 로그인하여 마이페이지에서 본인 카드 · pending 매치 확인",
    "내 상태 카드, 종 아이콘, 경기 확인 요청 섹션이 표시됨"
  );
  scenarios.push(s);

  const { page } = await newPage();
  await page.goto(`${BASE}/login`);
  await shot(s, page, "로그인_폼");

  await login(page, "seoyeon@demo.local", "password1234");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot(s, page, "홈_로그인후_내상태카드");

  await page.click('a[href="/mypage"]').catch(() => {});
  await page.waitForLoadState("networkidle");
  await shot(s, page, "마이페이지_pending_매치");
}

// ───────────────────────────────────────────────────────────────────────────
// 시나리오 4: 예약 플로우
// ───────────────────────────────────────────────────────────────────────────
{
  const s = step(
    "04_예약_플로우",
    "탁구대 선택 → 날짜 → 시간 → 반복 옵션 → 확정",
    "단계 인디케이터가 진행되며, 확정 후 예약 상세 페이지로 이동"
  );
  scenarios.push(s);

  const { page } = await newPage();
  await login(page, "jiho@demo.local", "password1234");
  await page.goto(`${BASE}/reserve`, { waitUntil: "networkidle" });
  await shot(s, page, "예약_탁구대_선택전");

  await page.click("text=1번 탁구대");
  await page.waitForTimeout(300);
  await shot(s, page, "탁구대_선택후");

  // 캘린더에서 7일 뒤 클릭
  const next = new Date();
  next.setDate(next.getDate() + 7);
  const day = next.getDate();
  await page.locator(`button:has-text("${day}")`).first().click();
  await page.waitForLoadState("networkidle");
  await shot(s, page, "날짜_선택후_시간슬롯");

  // 빈 시간 클릭
  const slots = await page.locator('button:has-text(":00")').all();
  for (const slot of slots) {
    const disabled = await slot.isDisabled();
    if (!disabled) { await slot.click(); break; }
  }
  await page.waitForTimeout(300);
  await shot(s, page, "시간_선택_정기반복_옵션");

  // 정기 반복 체크
  await page.click("text=매주 같은 요일·시간 반복 예약").catch(() => {});
  await page.waitForTimeout(200);
  await shot(s, page, "반복_예약_체크");

  // 예약 확정 클릭
  await page.click('button:has-text("예약 확정")');
  await page.waitForURL(/\/reserve\/confirm\//, { timeout: 10_000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
  await shot(s, page, "예약_확정_상세");
}

// ───────────────────────────────────────────────────────────────────────────
// 시나리오 5: 경기 기록 + 빠른 점수
// ───────────────────────────────────────────────────────────────────────────
{
  const s = step(
    "05_경기_기록",
    "랭킹 페이지에서 경기 기록 진입 → 상대 선택 → 결과 → 세트 점수 → 저장",
    "예상 포인트 변동이 표시되고, 저장 후 pending 안내가 나타남"
  );
  scenarios.push(s);

  const { page } = await newPage();
  await login(page, "hayun@demo.local", "password1234");
  await page.goto(`${BASE}/ranking`, { waitUntil: "networkidle" });
  await shot(s, page, "랭킹_정렬_검색");

  await page.click('a:has-text("경기 결과 기록")');
  await page.waitForLoadState("networkidle");
  await shot(s, page, "기록_초기_상대선택");

  // 첫 상대 클릭 - 상대 목록 안의 button 첫 번째
  await page.waitForSelector('.space-y-2.max-h-48 button', { timeout: 5000 });
  const opponentBtn = page.locator('.space-y-2.max-h-48 button').first();
  await opponentBtn.click();
  await page.waitForTimeout(200);

  // 승리 클릭
  await page.click('button:has-text("승리")');
  await page.waitForTimeout(200);
  await shot(s, page, "승리_선택_세트입력");

  // 빠른 점수 3-1
  await page.click('button:has-text("3-1")').catch(() => {});
  await page.waitForTimeout(200);
  await shot(s, page, "빠른점수_3_1");

  await page.click('button:has-text("결과 저장")');
  await page.waitForTimeout(1500);
  await shot(s, page, "기록_완료_pending");
}

// ───────────────────────────────────────────────────────────────────────────
// 시나리오 6: 선수 프로필 + 업적 + H2H
// ───────────────────────────────────────────────────────────────────────────
{
  const s = step(
    "06_선수_프로필",
    "다른 선수 프로필 페이지에서 업적 / 헤드투헤드 / 최근 폼 확인",
    "16개 업적 그리드, H2H 카드(있을 때), 최근 5경기 폼 W/L 박스"
  );
  scenarios.push(s);

  const { page } = await newPage();
  await login(page, "minjun@demo.local", "password1234");
  await page.goto(`${BASE}/ranking`, { waitUntil: "networkidle" });

  // 다른 선수 클릭
  const playerLink = page.locator('a[href^="/players/"]').nth(1);
  await playerLink.click();
  await page.waitForLoadState("networkidle");
  await shot(s, page, "프로필_상단");

  // 페이지 하단까지 스크롤
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await shot(s, page, "프로필_업적_최근경기");
}

// ───────────────────────────────────────────────────────────────────────────
// 시나리오 7: 글로벌 검색 (Ctrl+K)
// ───────────────────────────────────────────────────────────────────────────
{
  const s = step(
    "07_글로벌_검색",
    "헤더에서 Ctrl+K 단축키로 검색 다이얼로그 열고 선수 검색",
    "이름 일부 입력 시 결과가 나오고, 클릭 시 프로필로 이동"
  );
  scenarios.push(s);

  const { page } = await newPage();
  await login(page, "doyun@demo.local", "password1234");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  await page.keyboard.press("Control+K");
  await page.waitForTimeout(400);
  await shot(s, page, "검색_다이얼로그");

  await page.fill('input[type="search"][placeholder*="검색"]', "민");
  await page.waitForTimeout(500);
  await shot(s, page, "검색_결과");
}

// ───────────────────────────────────────────────────────────────────────────
// 시나리오 8: 어드민 대시보드
// ───────────────────────────────────────────────────────────────────────────
{
  const s = step(
    "08_어드민_대시보드",
    "관리자 로그인 후 회원/통계/공지/시즌/분쟁 페이지 순회",
    "대시보드 카드 8개, 통계 차트, 시즌 활성화/종료 가능"
  );
  scenarios.push(s);

  const { page } = await newPage();
  await login(page, "admin@pingpongzone.kr", "admin1234");

  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await shot(s, page, "대시보드_카드");

  await page.goto(`${BASE}/admin/stats`, { waitUntil: "networkidle" });
  await shot(s, page, "이용통계_차트");

  await page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle" });
  await shot(s, page, "회원관리_목록");

  await page.goto(`${BASE}/admin/seasons`, { waitUntil: "networkidle" });
  await shot(s, page, "시즌관리");

  await page.goto(`${BASE}/admin/notices`, { waitUntil: "networkidle" });
  await shot(s, page, "공지사항");

  await page.goto(`${BASE}/admin/tables`, { waitUntil: "networkidle" });
  await shot(s, page, "탁구대_차단슬롯");
}

// ───────────────────────────────────────────────────────────────────────────
// 시나리오 9: 시즌 스탠딩 페이지
// ───────────────────────────────────────────────────────────────────────────
{
  const s = step(
    "09_시즌_스탠딩",
    "공개 시즌 페이지에서 현재 시즌 라이브 순위 확인",
    "시즌 포인트 변동(delta) 순으로 정렬된 표 + 메달 표시"
  );
  scenarios.push(s);

  const { page } = await newPage();
  await page.goto(`${BASE}/seasons`, { waitUntil: "networkidle" });
  const seasonLink = page.locator('a[href^="/seasons/"]').first();
  await seasonLink.click();
  await page.waitForLoadState("networkidle");
  await shot(s, page, "시즌_스탠딩");
}

// ───────────────────────────────────────────────────────────────────────────
// 시나리오 10: 모바일 반응형
// ───────────────────────────────────────────────────────────────────────────
{
  const s = step(
    "10_모바일_반응형",
    "주요 페이지의 모바일 (390px) 레이아웃 검증",
    "헤더 자동 줄임, 모든 콘텐츠 가로 스크롤 가능"
  );
  scenarios.push(s);

  const { page } = await newPage({ width: 390, height: 844 });
  await login(page, "hayun@demo.local", "password1234");

  await page.goto(`${BASE}/ranking`, { waitUntil: "networkidle" });
  await shot(s, page, "랭킹_모바일");

  await page.goto(`${BASE}/reserve`, { waitUntil: "networkidle" });
  await shot(s, page, "예약_모바일");

  await page.goto(`${BASE}/mypage`, { waitUntil: "networkidle" });
  await shot(s, page, "마이페이지_모바일");
}

await browser.close();

await writeFile(path.join(OUT, "..", "scenarios.json"), JSON.stringify(scenarios, null, 2));
console.log(`\n✅ ${scenarios.length} 시나리오, ${scenarios.reduce((a, s) => a + s.shots.length, 0)} 스크린샷`);
