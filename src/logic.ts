/** Pure helpers for GroupPulse: day/hour bucketing, leaderboard math, quiet detection, retention, deltas. */
const DAY_SEC = 86_400;

/** Day index since epoch, shifted by a timezone offset in minutes (0 = UTC). */
export function dayIndex(tsSec: number, tzMin = 0): number {
  return Math.floor((tsSec + tzMin * 60) / DAY_SEC);
}

/** Hour of day (0-23) in the given timezone offset. */
export function hourOfDay(tsSec: number, tzMin = 0): number {
  const secInDay = (tsSec + tzMin * 60) % DAY_SEC;
  return Math.floor((secInDay >= 0 ? secInDay : secInDay + DAY_SEC) / 3600);
}

export type Range = "today" | "week" | "month";

/** [fromDay, toDay] inclusive window for a view, anchored at `today`. */
export function rangeDays(today: number, range: Range): [number, number] {
  if (range === "today") return [today, today];
  if (range === "week") return [today - 6, today];
  return [today - 29, today];
}

export interface MemberCount { userId: number; name: string; total: number; }
export interface LeaderRow { userId: number; name: string; total: number; pct: number; }

/**
 * Top-N leaderboard with percentage shares that sum to ~100 (largest-remainder rounding).
 * The percentage denominator is the sum of ALL rows passed in, not just the returned slice.
 */
export function leaderboard(rows: MemberCount[], limit = 10): LeaderRow[] {
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  const grand = sorted.reduce((s, r) => s + r.total, 0);
  const top = sorted.slice(0, Math.max(0, limit));
  if (grand <= 0) return top.map((r) => ({ ...r, pct: 0 }));
  const raw = top.map((r) => (r.total / grand) * 100);
  const target = Math.round(raw.reduce((s, v) => s + v, 0)); // 100 only when the slice covers every row
  const floors = raw.map(Math.floor);
  let used = floors.reduce((s, v) => s + v, 0);
  const remainders = raw.map((v, i) => ({ i, rem: v - floors[i] })).sort((a, b) => b.rem - a.rem);
  const pct = [...floors];
  let k = 0;
  while (used < target && k < remainders.length) { pct[remainders[k].i] += 1; used += 1; k += 1; }
  return top.map((r, i) => ({ ...r, pct: pct[i] }));
}

export interface HourCount { hour: number; n: number; }

/** Hour (0-23) with the most messages; ties broken by lowest hour. Returns null when empty. */
export function busiestHour(counts: HourCount[]): number | null {
  let best: HourCount | null = null;
  for (const c of counts) {
    if (!best || c.n > best.n || (c.n === best.n && c.hour < best.hour)) best = c;
  }
  return best ? best.hour : null;
}

export interface QuietCandidate { userId: number; name: string; lastSeen: number; priorTotal: number; }

/** Members who posted before but not within `windowSec` of `nowTs`, top-N by prior activity. */
export function quietMembers(members: QuietCandidate[], nowTs: number, windowSec = 7 * DAY_SEC, limit = 10): QuietCandidate[] {
  const cutoff = nowTs - windowSec;
  return members
    .filter((m) => m.priorTotal > 0 && m.lastSeen < cutoff)
    .sort((a, b) => b.priorTotal - a.priorTotal)
    .slice(0, limit);
}

/** Oldest day still kept: rows with day < this cutoff are deleted. */
export function retentionCutoffDay(today: number, retentionDays: number): number {
  return today - retentionDays + 1;
}

export interface WeeklyDelta { current: number; previous: number; delta: number; pctChange: number | null; }

export function weeklyDelta(current: number, previous: number): WeeklyDelta {
  const delta = current - previous;
  const pctChange = previous > 0 ? Math.round((delta / previous) * 100) : null;
  return { current, previous, delta, pctChange };
}

/** t.me/<bot>?start=pro_<id> deep-link payload: chat ids are negative, '-' is not URL-safe there. */
export function encodeChatId(chatId: number): string {
  return String(chatId).replace("-", "m");
}
export function decodeChatId(encoded: string): number | null {
  if (!/^m?\d+$/.test(encoded)) return null;
  const n = Number(encoded.startsWith("m") ? "-" + encoded.slice(1) : encoded);
  return Number.isSafeInteger(n) ? n : null;
}

export function isRecentEnough(msgTsSec: number, nowTs: number, maxAgeDays = 2): boolean {
  return nowTs - msgTsSec <= maxAgeDays * DAY_SEC;
}

/** True for a first-touch attribution payload on /start (e.g. "site", "share", "list", "x"),
 *  never the reserved "pro" tag or a "pro_<id>" per-group payload. */
export const SOURCE_PAYLOAD_RE = /^[a-z]{2,12}$/;
export function isSourcePayload(s: string): boolean { return s !== "pro" && SOURCE_PAYLOAD_RE.test(s); }

/** Escape legacy Telegram Markdown special chars in free-form user content (names, titles). */
export function escapeMd(s: string): string {
  return s.replace(/([\\_*`[])/g, "\\$1");
}

/** id Telegram assigns the "sender" field for messages posted by an anonymous group admin. */
export const ANONYMOUS_ADMIN_ID = 1087968824;

export interface AttributableMessage {
  from?: { id: number; is_bot?: boolean };
  sender_chat?: unknown;
  via_bot?: unknown;
}

/**
 * True when a group message can be credited to a real member: not an anonymous-admin post,
 * not a linked-channel auto-forward (both carry `sender_chat`), not sent via another bot,
 * and not posted by a bot account.
 */
export function isAttributableMember(msg: AttributableMessage): boolean {
  if (msg.sender_chat) return false;
  if (msg.via_bot) return false;
  if (!msg.from || msg.from.is_bot) return false;
  return msg.from.id !== ANONYMOUS_ADMIN_ID;
}

export const FREE_RETENTION_DAYS = 14;
export const PRO_RETENTION_DAYS = 90;

export type Kind = "text" | "media" | "other";
export interface ClassifiableMessage {
  text?: string; photo?: unknown; video?: unknown; document?: unknown; audio?: unknown;
  voice?: unknown; video_note?: unknown; sticker?: unknown; animation?: unknown;
}

/** Which count bucket a group message falls into. Never inspects text content. */
export function classifyMessage(msg: ClassifiableMessage): Kind {
  if (msg.text !== undefined) return "text";
  if (msg.photo || msg.video || msg.document || msg.audio || msg.voice || msg.video_note || msg.sticker || msg.animation) return "media";
  return "other";
}
