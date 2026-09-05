import { BaseStore, FleetStats, now } from "./kit.ts";
import { dayIndex, FREE_RETENTION_DAYS, hourOfDay, PRO_RETENTION_DAYS, retentionCutoffDay } from "./logic.ts";
import type { HourCount, Kind, MemberCount, QuietCandidate } from "./logic.ts";

const QA_CHAT = -1001234567890;
const ADMIN_TTL = 300; // seconds

export interface GroupRow { chat_id: number; title: string; pro: number; created: number; }
export interface MemberRow { chat_id: number; user_id: number; name: string; last_seen: number; }

const SCHEMA = `
CREATE TABLE IF NOT EXISTS groups (chat_id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '', pro INTEGER NOT NULL DEFAULT 0, paid_charge TEXT, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS members (chat_id INTEGER NOT NULL, user_id INTEGER NOT NULL, name TEXT NOT NULL DEFAULT '', last_seen INTEGER NOT NULL, PRIMARY KEY (chat_id, user_id));
CREATE TABLE IF NOT EXISTS counts (chat_id INTEGER NOT NULL, user_id INTEGER NOT NULL, day INTEGER NOT NULL,
  text INTEGER NOT NULL DEFAULT 0, media INTEGER NOT NULL DEFAULT 0, other INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (chat_id, user_id, day));
CREATE INDEX IF NOT EXISTS counts_chat_day ON counts(chat_id, day);
CREATE TABLE IF NOT EXISTS hours (chat_id INTEGER NOT NULL, day INTEGER NOT NULL, hour INTEGER NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (chat_id, day, hour));
CREATE TABLE IF NOT EXISTS admin_cache (chat_id INTEGER NOT NULL, user_id INTEGER NOT NULL, is_admin INTEGER NOT NULL, checked_at INTEGER NOT NULL, PRIMARY KEY (chat_id, user_id));
CREATE TABLE IF NOT EXISTS reports (chat_id INTEGER NOT NULL, week INTEGER NOT NULL, sent_at INTEGER NOT NULL, PRIMARY KEY (chat_id, week));
CREATE TABLE IF NOT EXISTS sources (user_id INTEGER PRIMARY KEY, src TEXT NOT NULL, ts INTEGER NOT NULL);`;

export class Store extends BaseStore {
  constructor(ctx: DurableObjectState, env: Record<string, unknown>) { super(ctx, env, SCHEMA); }

  async touchGroup(chatId: number, title: string): Promise<GroupRow> {
    this.run("INSERT INTO groups (chat_id, title, created) VALUES (?1, ?2, ?3) ON CONFLICT(chat_id) DO UPDATE SET title = ?2", chatId, title, now());
    return this.one<GroupRow>("SELECT chat_id, title, pro, created FROM groups WHERE chat_id = ?1", chatId)!;
  }
  async group(chatId: number): Promise<GroupRow | null> {
    return this.one<GroupRow>("SELECT chat_id, title, pro, created FROM groups WHERE chat_id = ?1", chatId);
  }
  async setGroupPro(chatId: number, charge: string): Promise<void> {
    this.run("INSERT INTO groups (chat_id, pro, paid_charge, created) VALUES (?1, 1, ?2, ?3) ON CONFLICT(chat_id) DO UPDATE SET pro = 1, paid_charge = ?2", chatId, charge, now());
  }

  async recordMessage(chatId: number, userId: number, name: string, kind: Kind, tsSec: number): Promise<void> {
    this.run("INSERT INTO members (chat_id, user_id, name, last_seen) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(chat_id, user_id) DO UPDATE SET name = ?3, last_seen = ?4", chatId, userId, name, tsSec);
    const day = dayIndex(tsSec);
    const col = kind === "text" ? "text" : kind === "media" ? "media" : "other";
    this.run(`INSERT INTO counts (chat_id, user_id, day, ${col}) VALUES (?1, ?2, ?3, 1)
              ON CONFLICT(chat_id, user_id, day) DO UPDATE SET ${col} = ${col} + 1`, chatId, userId, day);
    const hour = hourOfDay(tsSec);
    this.run("INSERT INTO hours (chat_id, day, hour, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(chat_id, day, hour) DO UPDATE SET n = n + 1", chatId, day, hour);
  }

  async countsInRange(chatId: number, fromDay: number, toDay: number): Promise<MemberCount[]> {
    const rows = this.all<{ user_id: number; name: string; total: number }>(
      `SELECT c.user_id AS user_id, m.name AS name, SUM(c.text + c.media + c.other) AS total
       FROM counts c JOIN members m ON m.chat_id = c.chat_id AND m.user_id = c.user_id
       WHERE c.chat_id = ?1 AND c.day BETWEEN ?2 AND ?3 GROUP BY c.user_id ORDER BY total DESC LIMIT 1000`,
      chatId, fromDay, toDay);
    return rows.map((r) => ({ userId: r.user_id, name: r.name, total: r.total }));
  }
  async totalInRange(chatId: number, fromDay: number, toDay: number): Promise<number> {
    const r = this.one<{ n: number | null }>("SELECT SUM(text + media + other) AS n FROM counts WHERE chat_id = ?1 AND day BETWEEN ?2 AND ?3", chatId, fromDay, toDay);
    return r?.n ?? 0;
  }
  async activeMembersInRange(chatId: number, fromDay: number, toDay: number): Promise<number> {
    const r = this.one<{ n: number }>("SELECT COUNT(DISTINCT user_id) AS n FROM counts WHERE chat_id = ?1 AND day BETWEEN ?2 AND ?3", chatId, fromDay, toDay);
    return r?.n ?? 0;
  }
  async hoursInRange(chatId: number, fromDay: number, toDay: number): Promise<HourCount[]> {
    const rows = this.all<{ hour: number; n: number }>(
      "SELECT hour, SUM(n) AS n FROM hours WHERE chat_id = ?1 AND day BETWEEN ?2 AND ?3 GROUP BY hour", chatId, fromDay, toDay);
    return rows;
  }

  async memberStats(chatId: number, userId: number, fromDay: number, toDay: number): Promise<{ total: number }> {
    const r = this.one<{ total: number | null }>(
      "SELECT SUM(text + media + other) AS total FROM counts WHERE chat_id = ?1 AND user_id = ?2 AND day BETWEEN ?3 AND ?4", chatId, userId, fromDay, toDay);
    return { total: r?.total ?? 0 };
  }

  async quietCandidates(chatId: number, nowTs: number): Promise<QuietCandidate[]> {
    const members = this.all<MemberRow>("SELECT chat_id, user_id, name, last_seen FROM members WHERE chat_id = ?1 LIMIT 2000", chatId);
    const totals = this.all<{ user_id: number; total: number | null }>(
      "SELECT user_id, SUM(text + media + other) AS total FROM counts WHERE chat_id = ?1 GROUP BY user_id", chatId);
    const byUser = new Map(totals.map((t) => [t.user_id, t.total ?? 0]));
    return members.map((m) => ({ userId: m.user_id, name: m.name, lastSeen: m.last_seen, priorTotal: byUser.get(m.user_id) ?? 0 }));
  }

  async isAdminCached(chatId: number, userId: number, nowTs: number): Promise<boolean | null> {
    const r = this.one<{ is_admin: number; checked_at: number }>("SELECT is_admin, checked_at FROM admin_cache WHERE chat_id = ?1 AND user_id = ?2", chatId, userId);
    if (!r || nowTs - r.checked_at > ADMIN_TTL) return null;
    return r.is_admin === 1;
  }
  async setAdminCache(chatId: number, userId: number, isAdmin: boolean, nowTs: number): Promise<void> {
    this.run("INSERT INTO admin_cache (chat_id, user_id, is_admin, checked_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(chat_id, user_id) DO UPDATE SET is_admin = ?3, checked_at = ?4",
      chatId, userId, isAdmin ? 1 : 0, nowTs);
  }

  async resetGroup(chatId: number): Promise<void> {
    this.run("DELETE FROM counts WHERE chat_id = ?1", chatId);
    this.run("DELETE FROM hours WHERE chat_id = ?1", chatId);
    this.run("DELETE FROM members WHERE chat_id = ?1", chatId);
  }

  async proGroups(): Promise<GroupRow[]> {
    return this.all<GroupRow>("SELECT chat_id, title, pro, created FROM groups WHERE pro = 1 LIMIT 5000");
  }
  async allGroups(): Promise<GroupRow[]> {
    return this.all<GroupRow>("SELECT chat_id, title, pro, created FROM groups LIMIT 5000");
  }
  async cleanupRetention(nowTs: number): Promise<number> {
    let deleted = 0;
    for (const g of await this.allGroups()) {
      const cutoff = retentionCutoffDay(dayIndex(nowTs), g.pro ? PRO_RETENTION_DAYS : FREE_RETENTION_DAYS);
      deleted += this.run("DELETE FROM counts WHERE chat_id = ?1 AND day < ?2", g.chat_id, cutoff);
      this.run("DELETE FROM hours WHERE chat_id = ?1 AND day < ?2", g.chat_id, cutoff);
    }
    return deleted;
  }

  async reportAlreadySent(chatId: number, week: number): Promise<boolean> {
    return this.one("SELECT 1 FROM reports WHERE chat_id = ?1 AND week = ?2", chatId, week) !== null;
  }
  async markReportSent(chatId: number, week: number, nowTs: number): Promise<void> {
    this.run("INSERT OR IGNORE INTO reports (chat_id, week, sent_at) VALUES (?1, ?2, ?3)", chatId, week, nowTs);
  }

  async groupsOf(userId: number): Promise<GroupRow[]> {
    return this.all<GroupRow>(
      "SELECT g.chat_id, g.title, g.pro, g.created FROM groups g JOIN members m ON m.chat_id = g.chat_id WHERE m.user_id = ?1 LIMIT 50", userId);
  }

  /** First-touch attribution for /start payloads like "site"/"share"/"list"/"x" (see logic.ts isSourcePayload). */
  async recordSource(userId: number, src: string): Promise<void> {
    this.run("INSERT OR IGNORE INTO sources (user_id, src, ts) VALUES (?1, ?2, ?3)", userId, src, now());
  }
  private sourceStats(): Record<string, number> {
    const rows = this.all<{ src: string; n: number }>(
      `SELECT src, COUNT(*) AS n FROM sources WHERE ${this.notTestUser("user_id")} GROUP BY src`);
    const out: Record<string, number> = {};
    for (const r of rows) out["src_" + r.src] = r.n;
    return out;
  }

  /** Fleet stats. `pro` folds group-level Pro (per-group upgrades) into user-level Pro; every count excludes the QA chat and QA user ids. */
  async stats(): Promise<FleetStats & { events: number; groups: number; reports_sent: number }> {
    const u = this.userStats();
    const g = this.one<{ n: number; p: number | null }>("SELECT COUNT(*) AS n, SUM(pro) AS p FROM groups WHERE chat_id != ?1", QA_CHAT);
    const e = this.one<{ n: number | null }>(
      `SELECT SUM(c.text + c.media + c.other) AS n FROM counts c JOIN groups gr ON gr.chat_id = c.chat_id
       WHERE gr.chat_id != ?1 AND ${this.notTestUser("c.user_id")}`, QA_CHAT);
    const r = this.one<{ n: number }>("SELECT COUNT(*) AS n FROM reports WHERE chat_id != ?1", QA_CHAT);
    return { ...u, pro: u.pro + (g?.p ?? 0), events: e?.n ?? 0, groups: g?.n ?? 0, reports_sent: r?.n ?? 0, ...this.sourceStats() };
  }
}
