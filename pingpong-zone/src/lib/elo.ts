// ELO 등급 계산 - 순수 함수 (DB·세션 의존 없음)

export const PLACEMENT_GAMES = 5;
export const K_PLACEMENT = 48;
export const K_NORMAL = 24;
export const ELO_FLOOR = 100;

export function getK(totalGames: number): number {
  return totalGames < PLACEMENT_GAMES ? K_PLACEMENT : K_NORMAL;
}

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function calcEloChange(rating: number, k: number, expected: number, actual: number): number {
  return Math.round(k * (actual - expected));
}

// 한 경기의 양측 변동 계산 - iWon 은 player1(기록자) 기준
export function computeMatchEloChanges(opts: {
  myElo: number;
  oppElo: number;
  myGames: number;
  oppGames: number;
  iWon: boolean;
}): { p1Change: number; p2Change: number } {
  const winnerRating = opts.iWon ? opts.myElo : opts.oppElo;
  const loserRating  = opts.iWon ? opts.oppElo : opts.myElo;
  const winnerGames  = opts.iWon ? opts.myGames : opts.oppGames;
  const loserGames   = opts.iWon ? opts.oppGames : opts.myGames;
  const winnerK      = getK(winnerGames);
  const loserK       = getK(loserGames);
  const expWin       = expectedScore(winnerRating, loserRating);
  const winnerChange = calcEloChange(winnerRating, winnerK, expWin, 1);
  const loserChange  = calcEloChange(loserRating,  loserK,  1 - expWin, 0);
  return {
    p1Change: opts.iWon ? winnerChange : loserChange,
    p2Change: opts.iWon ? loserChange  : winnerChange,
  };
}
