const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** KST 기준 오늘 자정 (UTC Date 반환) */
export function kstTodayStart(): Date {
  const now = Date.now();
  const kstMs = now + KST_OFFSET_MS;
  const kstMidnight = kstMs - (kstMs % (24 * 60 * 60 * 1000));
  return new Date(kstMidnight - KST_OFFSET_MS);
}

/** KST 기준 오늘 날짜 문자열 (YYYY-MM-DD) */
export function kstDateString(date?: Date): string {
  const d = date ?? new Date();
  return new Date(d.getTime() + KST_OFFSET_MS).toISOString().split("T")[0];
}
