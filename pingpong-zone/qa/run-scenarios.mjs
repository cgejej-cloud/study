import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT = path.resolve("qa/shots");

await mkdir(OUT, { recursive: true });

const scenarios = [];
const failures = [];

function step(name, description, expected) {
  return { name, description, expected, shots: [] };
}

const browser = await chromium.launch({ headless: true });

async function newPage(viewport = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ viewport, locale: "ko-KR" });
  const page = await ctx.newPage();
  return { ctx, page };
}

async function shot(s, page, label) {
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(300);
  const filename = `${s.name.replace(/[^a-z0-9]/gi, "_")}_${s.shots.length + 1}_${label.replace(/[^a-z0-9]/gi, "_")}.png`;
  const fullPath = path.join(OUT, filename);
  await page.screenshot({ path: fullPath, fullPage: true });
  s.shots.push({ label, file: filename });
  console.log(`📸 ${s.name} - ${label}`);
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  // hydration 대기 — submit 버튼이 enabled 상태가 되어야 함
  await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 10_000 });
  await page.waitForTimeout(300); // 클라이언트 핸들러 부착 대기
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  // Server Action 응답 + window.location.href 반영 + redirect 대기
  await page.waitForURL((u) => !u.toString().includes("/login"), { timeout: 30_000 }).catch(() => {});
  await page.waitForLoadState("load").catch(() => {});
  // 세션 검증 — /api/me 로 확인
  for (let i = 0; i < 20; i++) {
    const me = await page.evaluate(async () => {
      try {
        const r = await fetch("/api/me");
        if (!r.ok) return null;
        const d = await r.json();
        return d?.id ?? null;
      } catch { return null; }
    });
    if (me) return;
    await page.waitForTimeout(500);
  }
  throw new Error(`login failed: ${email} (세션 확인 안 됨)`);
}

async function run(name, description, expected, body) {
  const s = step(name, description, expected);
  scenarios.push(s);
  try {
    await body(s);
  } catch (e) {
    const msg = e?.message?.split("\n")[0] ?? String(e);
    console.error(`❌ ${name} failed: ${msg}`);
    failures.push({ name, error: msg });
  }
}

// ─── 시나리오 1: 비로그인 방문자 ─────────────────────────────────────────
await run(
  "01_방문자_홈_탐색",
  "비로그인 방문자가 홈 > 랭킹 > 시즌 아카이브 > 회원가입 페이지를 둘러본다",
  "공지 배너 · 활동 피드 · 랭킹 표 · 회원가입 폼이 정상 표시되고, 마이페이지/관리 접근 시 로그인으로 리다이렉트",
  async (s) => {
    const { page } = await newPage();
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await shot(s, page, "홈_데스크탑");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await shot(s, page, "홈_모바일");

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/ranking`, { waitUntil: "domcontentloaded" });
    await shot(s, page, "랭킹_전체");

    await page.goto(`${BASE}/seasons`, { waitUntil: "domcontentloaded" });
    await shot(s, page, "시즌_아카이브");

    await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
    await page.fill('input[name="email"]', "admin@pingpongzone.kr");
    await page.waitForTimeout(900);
    await shot(s, page, "회원가입_이메일중복_경고");

    await page.goto(`${BASE}/mypage`, { waitUntil: "domcontentloaded" });
    await shot(s, page, "마이페이지_미인증_리다이렉트");
  }
);

// ─── 시나리오 2: 신규 회원가입 + 약한 비밀번호 ───────────────────────────
await run(
  "02_회원가입_검증",
  "신규 사용자가 약한 비밀번호로 가입 시 거부되고, 강한 비밀번호로 성공",
  "8자 미만이면 서버가 거부, 8자+ 이면 가입 성공 후 로그인 페이지로 이동",
  async (s) => {
    const { page } = await newPage();
    await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
    await page.fill('input[name="name"]', "테스트유저");
    await page.fill('input[name="email"]', "newbie+qa@example.com");
    await page.waitForTimeout(900);
    await shot(s, page, "이메일_가용_확인");

    await page.fill('input[name="password"]', "1234567");
    // 필수 약관 체크 (전체 동의 → 모든 자식)
    await page.locator('input[aria-label="만 14세 이상입니다"]').check();
    await page.locator('input[aria-label="이용약관에 동의합니다"]').check();
    await page.locator('input[aria-label="개인정보 수집·이용에 동의합니다"]').check();
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
);

// ─── 시나리오 3: 로그인 + 마이페이지 ────────────────────────────────────
await run(
  "03_로그인_마이페이지",
  "데모 사용자가 로그인하여 마이페이지에서 본인 카드 · pending 매치 확인",
  "내 상태 카드, 종 아이콘, 경기 확인 요청 섹션이 표시됨",
  async (s) => {
    const { page } = await newPage();
    await page.goto(`${BASE}/login`);
    await shot(s, page, "로그인_폼");

    await login(page, "seoyeon@demo.local", "password1234");
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await shot(s, page, "홈_로그인후_내상태카드");

    await page.click('a[href="/mypage"]').catch(() => {});
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(600);
    await shot(s, page, "마이페이지_pending_매치");
  }
);

// ─── 시나리오 4: 예약 플로우 ────────────────────────────────────────────
await run(
  "04_예약_플로우",
  "탁구대 선택 → 날짜 → 시간 → 반복 옵션 → 확정",
  "단계 인디케이터가 진행되며, 확정 후 예약 상세 페이지로 이동",
  async (s) => {
    const { page } = await newPage();
    await login(page, "jiho@demo.local", "password1234");
    await page.goto(`${BASE}/reserve`, { waitUntil: "domcontentloaded" });
    await shot(s, page, "예약_탁구대_선택전");

    await page.click("text=1번 탁구대");
    await page.waitForTimeout(300);
    await shot(s, page, "탁구대_선택후");

    const next = new Date();
    next.setDate(next.getDate() + 7);
    const day = next.getDate();
    await page.locator(`button:has-text("${day}")`).first().click();
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(600);
    await shot(s, page, "날짜_선택후_시간슬롯");

    const slots = await page.locator('button:has-text(":00")').all();
    for (const slot of slots) {
      const disabled = await slot.isDisabled();
      if (!disabled) { await slot.click(); break; }
    }
    await page.waitForTimeout(300);
    await shot(s, page, "시간_선택_정기반복_옵션");

    await page.click("text=매주 같은 요일·시간 반복 예약").catch(() => {});
    await page.waitForTimeout(200);
    await shot(s, page, "반복_예약_체크");

    await page.click('button:has-text("예약 확정")');
    await page.waitForURL(/\/reserve\/confirm\//, { timeout: 10_000 }).catch(() => {});
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(600);
    await shot(s, page, "예약_확정_상세");
  }
);

// ─── 시나리오 5: 경기 기록 ──────────────────────────────────────────────
await run(
  "05_경기_기록",
  "랭킹 페이지에서 경기 기록 진입 → 상대 선택 → 결과 → 세트 점수 → 저장",
  "예상 포인트 변동이 표시되고, 저장 후 pending 안내가 나타남",
  async (s) => {
    const { page } = await newPage();
    await login(page, "hayun@demo.local", "password1234");
    await page.goto(`${BASE}/ranking`, { waitUntil: "domcontentloaded" });
    await shot(s, page, "랭킹_정렬_검색");

    await page.click('a:has-text("경기 기록")');
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(600);
    await shot(s, page, "기록_초기_상대선택");

    await page.waitForSelector('.space-y-2.max-h-48 button', { timeout: 5000 });
    const opponentBtn = page.locator('.space-y-2.max-h-48 button').first();
    await opponentBtn.click();
    await page.waitForTimeout(200);

    await page.click('button:has-text("승리")');
    await page.waitForTimeout(200);
    await shot(s, page, "승리_선택_세트입력");

    await page.click('button:has-text("3-1")').catch(() => {});
    await page.waitForTimeout(200);
    await shot(s, page, "빠른점수_3_1");

    await page.click('button:has-text("결과 저장")');
    await page.waitForTimeout(1500);
    await shot(s, page, "기록_완료_pending");
  }
);

// ─── 시나리오 6: 선수 프로필 ────────────────────────────────────────────
await run(
  "06_선수_프로필",
  "다른 선수 프로필 페이지에서 업적 / 헤드투헤드 / 최근 폼 확인",
  "16개 업적 그리드, H2H 카드(있을 때), 최근 5경기 폼 W/L 박스",
  async (s) => {
    const { page } = await newPage();
    await login(page, "minjun@demo.local", "password1234");
    await page.goto(`${BASE}/ranking`, { waitUntil: "domcontentloaded" });

    const playerLink = page.locator('a[href^="/players/"]').nth(1);
    await playerLink.click();
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(600);
    await shot(s, page, "프로필_상단");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await shot(s, page, "프로필_업적_최근경기");
  }
);

// ─── 시나리오 7: 글로벌 검색 (헤더 🔍 버튼) ──────────────────────────────
await run(
  "07_글로벌_검색",
  "헤더의 검색 버튼으로 다이얼로그를 열고 선수 검색",
  "이름 일부 입력 시 결과가 나오고, 클릭 시 프로필로 이동",
  async (s) => {
    const { page } = await newPage();
    await login(page, "doyun@demo.local", "password1234");
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    // session 로드 + GlobalSearch 마운트 대기 (button[aria-label*="검색"])
    const searchBtn = page.locator('button[aria-label*="검색"]').first();
    await searchBtn.waitFor({ timeout: 10_000 });
    await searchBtn.click();
    await page.waitForTimeout(400);
    await shot(s, page, "검색_다이얼로그");

    const input = page.locator('input[aria-label="선수 검색"]').first();
    await input.waitFor({ timeout: 5000 });
    await input.fill("민");
    await page.waitForTimeout(700);
    await shot(s, page, "검색_결과");
  }
);

// ─── 시나리오 8: 어드민 대시보드 ────────────────────────────────────────
await run(
  "08_어드민_대시보드",
  "관리자 로그인 후 회원/통계/공지/시즌/분쟁 페이지 순회",
  "대시보드 카드 8개, 통계 차트, 시즌 활성화/종료 가능",
  async (s) => {
    const { page } = await newPage();
    await login(page, "admin@pingpongzone.kr", "admin1234");

    for (const [url, label] of [
      ["/admin", "대시보드_카드"],
      ["/admin/stats", "이용통계_차트"],
      ["/admin/users", "회원관리_목록"],
      ["/admin/seasons", "시즌관리"],
      ["/admin/notices", "공지사항"],
      ["/admin/tables", "탁구대_차단슬롯"],
    ]) {
      try {
        await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
        await shot(s, page, label);
      } catch (e) {
        console.error(`  ⚠ ${url} 스킵: ${e.message.split("\n")[0]}`);
      }
    }
  }
);

// ─── 시나리오 9: 시즌 스탠딩 ────────────────────────────────────────────
await run(
  "09_시즌_스탠딩",
  "공개 시즌 페이지에서 현재 시즌 라이브 순위 확인",
  "시즌 포인트 변동(delta) 순으로 정렬된 표 + 메달 표시",
  async (s) => {
    const { page } = await newPage();
    await page.goto(`${BASE}/seasons`, { waitUntil: "domcontentloaded" });
    const seasonLink = page.locator('a[href^="/seasons/"]').first();
    await seasonLink.click();
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(600);
    await shot(s, page, "시즌_스탠딩");
  }
);

// ─── 시나리오 10: 모바일 반응형 ─────────────────────────────────────────
await run(
  "10_모바일_반응형",
  "주요 페이지의 모바일 (390px) 레이아웃 검증",
  "헤더 자동 줄임, 모든 콘텐츠 가로 스크롤 가능",
  async (s) => {
    const { page } = await newPage({ width: 390, height: 844 });
    await login(page, "hayun@demo.local", "password1234");

    for (const [url, label] of [
      ["/ranking", "랭킹_모바일"],
      ["/reserve", "예약_모바일"],
      ["/mypage", "마이페이지_모바일"],
    ]) {
      try {
        await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
        await shot(s, page, label);
      } catch (e) {
        console.error(`  ⚠ ${url} 스킵: ${e.message.split("\n")[0]}`);
      }
    }
  }
);

// ─── 시나리오 11: 자유 도전장 발송 (신규 기능) ──────────────────────────
await run(
  "11_도전장_발송",
  "선수 프로필에서 자유 도전장(예약 없음)을 발송",
  "모달이 열리고, 메시지를 적어 발송하면 토스트가 뜨고 받는 쪽 마이페이지에 도착",
  async (s) => {
    const { page } = await newPage();
    await login(page, "seoyeon@demo.local", "password1234");
    // 랭킹에서 다른 선수 프로필로 이동
    await page.goto(`${BASE}/ranking`, { waitUntil: "domcontentloaded" });
    const playerLink = page.locator('a[href^="/players/"]').nth(1);
    await playerLink.click();
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(800);
    await shot(s, page, "프로필_도전장_버튼");

    await page.click('button:has-text("도전장 보내기")');
    await page.waitForTimeout(300);
    await shot(s, page, "도전장_모달");

    await page.fill('textarea#qc-msg', "QA 자동 도전장 — 한 판 부탁드립니다!");
    await page.waitForTimeout(150);
    await shot(s, page, "도전장_메시지_입력");

    await page.click('button[type="submit"]:has-text("도전장 보내기")');
    await page.waitForTimeout(1500);
    await shot(s, page, "도전장_발송_완료");
  }
);

// ─── 시나리오 12: 매치 히스토리 필터 (신규 기능) ────────────────────────
await run(
  "12_매치_히스토리_필터",
  "/mypage/matches 에서 결과/기간/상대 필터로 좁히기",
  "각 필터 적용 시 목록이 좁혀지고 '필터 결과 N건' 카운트 표시",
  async (s) => {
    const { page } = await newPage();
    await login(page, "hayun@demo.local", "password1234");
    await page.goto(`${BASE}/mypage/matches`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await shot(s, page, "히스토리_초기");

    // 결과 필터: 승리만
    await page.click('button:has-text("승리")').catch(() => {});
    await page.waitForTimeout(300);
    await shot(s, page, "필터_승리만");

    // 기간 필터: 1개월
    await page.click('button:has-text("1개월")').catch(() => {});
    await page.waitForTimeout(300);
    await shot(s, page, "필터_1개월");

    // 상대 검색
    await page.fill('input#opp-search', "민");
    await page.waitForTimeout(300);
    await shot(s, page, "필터_상대_검색");

    // 초기화
    await page.click('button:has-text("초기화")').catch(() => {});
    await page.waitForTimeout(300);
    await shot(s, page, "필터_초기화");
  }
);

// ─── 시나리오 13: 약관 동의 회원가입 (신규 기능) ─────────────────────────
await run(
  "13_약관_동의_회원가입",
  "회원가입 페이지에서 필수 약관 미동의 시 차단, 동의 후 정상 가입",
  "필수 3종(만14세/이용약관/개인정보)이 체크되지 않으면 버튼이 비활성, 체크 시 가입 진행",
  async (s) => {
    const { page } = await newPage();
    await page.goto(`${BASE}/register`, { waitUntil: "load" });
    await page.waitForTimeout(400);
    await shot(s, page, "초기_약관_미동의");

    // 정보 입력
    const unique = Date.now();
    await page.fill('input[name="name"]', "동의테스트");
    await page.fill('input[name="email"]', `qa-consent+${unique}@example.com`);
    await page.fill('input[name="password"]', "password1234");
    await page.waitForTimeout(900); // 이메일 중복 체크
    await shot(s, page, "정보_입력_버튼_비활성");

    // 전체 동의 토글 — .check() 가 React onChange 를 더 안정적으로 트리거
    await page.locator('input[aria-label="전체 동의"]').check();
    await page.waitForTimeout(300);
    await shot(s, page, "전체_동의_활성");

    // 제출 — 버튼 텍스트가 "회원가입"으로 바뀐 후 클릭
    await page.waitForSelector('button[type="submit"]:has-text("회원가입"):not([disabled])', { timeout: 5000 });
    await page.click('button[type="submit"]:has-text("회원가입")');
    await page.waitForURL((u) => u.toString().includes("/login"), { timeout: 10_000 }).catch(() => {});
    await page.waitForLoadState("load").catch(() => {});
    await page.waitForTimeout(800);
    await shot(s, page, "가입_성공_로그인_리다이렉트");
  }
);

// ─── 시나리오 14: 쿠키 배너 + 데이터 다운로드 ────────────────────────────
await run(
  "14_쿠키배너_데이터다운로드",
  "신규 방문자에게 쿠키 배너 노출, 로그인 후 마이페이지에서 데이터 JSON 다운로드 링크 노출",
  "localStorage 클리어된 새 컨텍스트에서 쿠키 배너 표시 + /mypage/edit 에 JSON 다운로드 버튼 존재",
  async (s) => {
    const { page, ctx } = await newPage();
    await ctx.clearCookies();
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    await page.waitForTimeout(600);
    await shot(s, page, "쿠키_배너_노출");

    // 배너 확인 클릭
    await page.click('button[aria-label="쿠키 사용 안내 확인"]').catch(() => {});
    await page.waitForTimeout(300);
    await shot(s, page, "쿠키_배너_닫음");

    // 로그인 후 데이터 다운로드 UI 확인
    await login(page, "seoyeon@demo.local", "password1234");
    await page.goto(`${BASE}/mypage/edit`, { waitUntil: "load" });
    await page.waitForTimeout(800);
    // 계정 정보 탭으로 이동 (버튼이 있다면)
    await page.click('button:has-text("계정")').catch(() => {});
    await page.waitForTimeout(300);
    await shot(s, page, "마이페이지_데이터_다운로드_링크");
  }
);

// ─── 시나리오 15: 리워드 시스템 (신규 기능) ──────────────────────────────
await run(
  "15_리워드_시스템",
  "매치 확정 시 리워드 자동 적립 — 마이페이지 리워드 + 공개 리워드 랭킹 확인",
  "/mypage/rewards 에 누적 포인트·연속 출석·다음 마일스톤·이력 표시, /rewards 에 리워드 랭킹 표 표시",
  async (s) => {
    const { page } = await newPage();
    await login(page, "minjun@demo.local", "password1234");

    // 마이페이지 리워드
    await page.goto(`${BASE}/mypage/rewards`, { waitUntil: "load" });
    await page.waitForTimeout(900);
    await shot(s, page, "마이페이지_리워드_요약");

    // 적립 규칙 펼치기
    await page.click('summary:has-text("적립 규칙")').catch(() => {});
    await page.waitForTimeout(300);
    await shot(s, page, "적립_규칙_펼침");

    // 공개 리워드 랭킹
    await page.goto(`${BASE}/rewards`, { waitUntil: "load" });
    await page.waitForTimeout(900);
    await shot(s, page, "리워드_랭킹_공개");

    // 1위 프로필로 이동 → 리워드 포인트 표시 확인
    const firstPlayer = page.locator('a[href^="/players/"]').first();
    await firstPlayer.click();
    await page.waitForLoadState("load").catch(() => {});
    await page.waitForTimeout(800);
    await shot(s, page, "프로필_리워드_포인트_표시");
  }
);

// ─── 시나리오 16: 매칭 추천 + 알림 환경설정 (신규 기능) ────────────────
await run(
  "16_매칭추천_알림설정",
  "홈 SuggestionsTeaser + /match/find + 마이페이지 알림 카테고리 토글",
  "로그인 시 추천 상대 카드 노출, /match/find 4섹션, /mypage/edit 에 카테고리 토글",
  async (s) => {
    const { page } = await newPage();
    await login(page, "seoyeon@demo.local", "password1234");

    // 홈에서 추천 티저 확인
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    await shot(s, page, "홈_추천_티저");

    // 상대 찾기 페이지
    await page.goto(`${BASE}/match/find`, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    await shot(s, page, "상대찾기_전체");

    // 알림 환경설정 — 마이페이지 수정 페이지의 계정 탭으로
    await page.goto(`${BASE}/mypage/edit`, { waitUntil: "load" });
    await page.waitForTimeout(800);
    await page.click('button:has-text("계정")').catch(() => {});
    await page.waitForTimeout(400);
    await shot(s, page, "알림_카테고리_토글");
  }
);

await browser.close();

await writeFile(path.join(OUT, "..", "scenarios.json"), JSON.stringify(scenarios, null, 2));
const totalShots = scenarios.reduce((a, s) => a + s.shots.length, 0);
console.log(`\n✅ ${scenarios.length} 시나리오, ${totalShots} 스크린샷`);
if (failures.length) {
  console.log(`⚠ ${failures.length} 시나리오 실패:`);
  for (const f of failures) console.log(`  - ${f.name}: ${f.error}`);
}
