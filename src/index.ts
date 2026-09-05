import { Bot, Context, InlineKeyboard } from "grammy";
import { Env as KitEnv, PRO_STARS, ProSpec, displayName, isPrivate, makeFetch, now, preparedShare, sendInvoice, wirePro } from "./kit.ts";
import { Store } from "./db.ts";
import {
  FREE_RETENTION_DAYS, PRO_RETENTION_DAYS, Range, busiestHour, classifyMessage, dayIndex, decodeChatId, encodeChatId,
  escapeMd, isAttributableMember, isRecentEnough, isSourcePayload, leaderboard, quietMembers, rangeDays, weeklyDelta,
} from "./logic.ts";
import { APP_HTML, buildShareText, handleProLink, initDataFailure, validateInitData } from "./webapp.ts";
import type { ProLinkBody } from "./webapp.ts";
import { isQaId } from "./webapp-i18n.ts";
import type { ProPlan } from "./webapp-i18n.ts";
import { BOT, publicLink } from "./botname.ts";
import { resolveLang, t } from "./i18n.ts";
import { GuestReply, wireGuest, wireInline } from "./guest.ts";
import { buildGuestReply } from "./guestReply.ts";
export { Store };

interface Env extends KitEnv { STORE: DurableObjectNamespace<Store>; }
const store = (env: Env) => env.STORE.get(env.STORE.idFromName("main"));

const PRO: ProSpec = {
  title: "GroupPulse Pro (this group)",
  description: "Month view, 90-day retention, and a weekly report posted to the group. One-time payment.",
  payload: "pulse-pro",
  thanks: "✅ Pro unlocked for the group. Month view, 90-day history, and weekly reports are on.\n\n/more — more free tools",
};
const MORE_TEXT = "More free tools by the same maker:\n🔒 @WhisperLockBot — locked messages only one person can open\n⏰ @NudgeRemindBot — reminders that arrive on time\n📮 @AnonInboxProBot — anonymous inbox via your link\n🧾 @SplitTabsBot — split group expenses\n🔥 @HabitStreakProBot — habit streaks with daily check-ins";
const SHARE_PITCH = "See who's active in your group — free activity leaderboard.";
const shareUrl = (bot: string, pitch: string): string =>
  `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${bot}?start=share`)}&text=${encodeURIComponent(pitch)}`;
const helpText = (lang: string): string =>
  t(lang, "help", { freeDays: FREE_RETENTION_DAYS, proDays: PRO_RETENTION_DAYS, stars: PRO_STARS });
const startText = (lang: string): string => t(lang, "start", { freeDays: FREE_RETENTION_DAYS });

const proKb = (chatId: number, lang: string): InlineKeyboard =>
  new InlineKeyboard().url(t(lang, "btn_unlockProStars", { stars: PRO_STARS }), `https://t.me/${BOT}?start=pro_${encodeChatId(chatId)}`);

const medal = (i: number): string => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;

async function isAdmin(ctx: Context, env: Env, chatId: number, userId: number): Promise<boolean> {
  const cached = await store(env).isAdminCached(chatId, userId, now());
  if (cached !== null) return cached;
  let ok = false;
  try {
    const m = await ctx.api.getChatMember(chatId, userId);
    ok = m.status === "administrator" || m.status === "creator";
  } catch { ok = false; }
  await store(env).setAdminCache(chatId, userId, ok, now());
  return ok;
}

async function onPulse(ctx: Context, env: Env): Promise<void> {
  if (isPrivate(ctx)) { await ctx.reply(helpText(resolveLang(ctx.from?.language_code)), { parse_mode: "Markdown" }); return; }
  if (!ctx.from) return;
  const chat = ctx.chat!;
  const g = await store(env).touchGroup(chat.id, "title" in chat ? chat.title ?? "" : "");
  const arg = String(ctx.match ?? "").trim().toLowerCase();
  const range: Range = arg === "week" ? "week" : arg === "month" ? "month" : "today";
  if (range === "month" && !g.pro) {
    await store(env).track(ctx.from.id, "pro_prompt");
    await ctx.reply(t(resolveLang(ctx.from.language_code), "monthProOnly"), { reply_markup: proKb(chat.id, resolveLang(ctx.from.language_code)) });
    return;
  }
  await store(env).track(ctx.from.id, "action");
  const today = dayIndex(now());
  const [from, to] = rangeDays(today, range);
  const rows = await store(env).countsInRange(chat.id, from, to);
  const total = await store(env).totalInRange(chat.id, from, to);
  const active = await store(env).activeMembersInRange(chat.id, from, to);
  const busy = busiestHour(await store(env).hoursInRange(chat.id, from, to));
  const lb = leaderboard(rows, 10);
  const lines = lb.map((r, i) => `${medal(i)} ${escapeMd(r.name)} — ${r.total} (${r.pct}%)`);
  const text = `📊 *Pulse — ${range}*\n\n${lines.length ? lines.join("\n") : "No messages yet."}\n\n` +
    `Total: ${total} · Active: ${active}${busy !== null ? ` · Busiest hour: ${String(busy).padStart(2, "0")}:00 UTC` : ""}`;
  await ctx.reply(text, { parse_mode: "Markdown" });
}

async function onQuiet(ctx: Context, env: Env): Promise<void> {
  if (isPrivate(ctx)) { await ctx.reply(helpText(resolveLang(ctx.from?.language_code)), { parse_mode: "Markdown" }); return; }
  const chat = ctx.chat!;
  const candidates = await store(env).quietCandidates(chat.id, now());
  const q = quietMembers(candidates, now());
  const text = q.length
    ? "🤫 *Gone quiet* (posted before, not in the last 7 days)\n\n" +
      q.map((m, i) => `${i + 1}. ${escapeMd(m.name)} — ${m.priorTotal} msgs before`).join("\n")
    : "Nobody has gone quiet. Everyone active recently has posted in the last 7 days.";
  await ctx.reply(text, { parse_mode: "Markdown" });
}

async function onMe(ctx: Context, env: Env): Promise<void> {
  if (isPrivate(ctx)) { await ctx.reply(helpText(resolveLang(ctx.from?.language_code)), { parse_mode: "Markdown" }); return; }
  if (!ctx.from) return;
  const chat = ctx.chat!;
  const userId = ctx.from.id;
  const today = dayIndex(now());
  const [wf, wt] = rangeDays(today, "week");
  const todayStats = await store(env).memberStats(chat.id, userId, today, today);
  const weekStats = await store(env).memberStats(chat.id, userId, wf, wt);
  const weekRows = await store(env).countsInRange(chat.id, wf, wt);
  const lb = leaderboard(weekRows, weekRows.length || 1);
  const rank = lb.findIndex((r) => r.userId === userId);
  const rankText = rank >= 0 ? `rank #${rank + 1} of ${lb.length}` : "no messages this week";
  await ctx.reply(`👤 *Your stats*\n\nToday: ${todayStats.total}\nThis week: ${weekStats.total} (${rankText})`, { parse_mode: "Markdown" });
}

async function onReset(ctx: Context, env: Env): Promise<void> {
  const lang = resolveLang(ctx.from?.language_code);
  if (isPrivate(ctx)) { await ctx.reply(helpText(lang), { parse_mode: "Markdown" }); return; }
  if (!ctx.from) return;
  const chat = ctx.chat!;
  if (!(await isAdmin(ctx, env, chat.id, ctx.from.id))) { await ctx.reply(t(lang, "adminOnly")); return; }
  await store(env).resetGroup(chat.id);
  await ctx.reply(t(lang, "resetDone"));
}

/** Static copy for a guest chat, with the Markdown the i18n table carries stripped: guest
 * results are posted as plain text (the query is user-supplied and may contain _ or *). */
const plain = (s: string): string => s.replaceAll("*", "").replaceAll("`", "");

/** Guest Mode: someone @-mentioned us in a chat we were never added to. Stats need message
 * history we don't have as a guest, so this is always the pitch (see guestReply.ts, pure). */
async function onGuest(ctx: Context): Promise<GuestReply> {
  const lang = resolveLang(ctx.from?.language_code);
  return buildGuestReply(BOT, plain(startText(lang)));
}

function buildBot(env: Env): Bot {
  const bot = new Bot(env.BOT_TOKEN);
  // Register commands on the "message" sub-composer only: grammY otherwise also dispatches
  // commands on channel posts, where ctx.from is undefined and ctx.message is undefined.
  const m = bot.on("message");
  m.command("start", async (ctx) => {
    if (!ctx.from) return;
    await store(env).touchUser(ctx.from.id, ctx.from.username, displayName(ctx.from));
    await store(env).track(ctx.from.id, "start");
    const payload = String(ctx.match ?? "");
    const match = payload.match(/^pro_(m?\d+)$/);
    if (match && isPrivate(ctx)) {
      const chatId = decodeChatId(match[1]);
      const uid = ctx.from.id;
      if (chatId !== null) { await sendInvoice(ctx, PRO, "pulse-pro:" + chatId, (s) => store(env).track(uid, s)); return; }
    }
    if (isSourcePayload(payload)) await store(env).recordSource(ctx.from.id, payload);
    const lang = resolveLang(ctx.from.language_code);
    const kb = new InlineKeyboard().url(t(lang, "btn_addToGroup"), `https://t.me/${BOT}?startgroup=true`);
    if (isPrivate(ctx)) kb.row().url(t(lang, "btn_shareBot"), shareUrl(BOT, SHARE_PITCH));
    await ctx.reply(startText(lang), { parse_mode: "Markdown", reply_markup: kb });
  });
  m.command("help", (ctx) => ctx.reply(helpText(resolveLang(ctx.from.language_code)), { parse_mode: "Markdown" }));
  m.command("more", (ctx) => ctx.reply(MORE_TEXT));
  m.command("pulse", (ctx) => onPulse(ctx, env));
  m.command("quiet", (ctx) => onQuiet(ctx, env));
  m.command("me", (ctx) => onMe(ctx, env));
  m.command("reset", (ctx) => onReset(ctx, env));
  m.command("pro", async (ctx) => {
    const lang = resolveLang(ctx.from.language_code);
    if (isPrivate(ctx)) { await ctx.reply(t(lang, "proRunInGroup")); return; }
    await ctx.reply(t(lang, "proGroupInfo", { proDays: PRO_RETENTION_DAYS, stars: PRO_STARS }), { reply_markup: proKb(ctx.chat!.id, lang) });
  });
  // kit.ts always sends its own (English) spec.thanks after onPaid resolves; for a non-English
  // payer we send a localized thank-you first so they get at least one message in their language.
  wirePro(bot, PRO, async (ctx, payload, charge) => {
    const match = payload.match(/^pulse-pro:(-?\d+)$/);
    if (match) { await store(env).setGroupPro(Number(match[1]), charge); } else if (ctx.from) { await store(env).setPro(ctx.from.id, charge); }
    const lang = resolveLang(ctx.from?.language_code);
    if (lang !== "en") await ctx.reply(t(lang, "thankYou", { proDays: PRO_RETENTION_DAYS }));
  }, (uid, s) => store(env).track(uid, s), true);
  // Plain bot.on("message", ...): registered after wirePro so a successful_payment update is
  // handled by wirePro's dedicated listener first and never falls through to here.
  bot.on("message", async (ctx) => {
    const msg = ctx.message;
    if (isPrivate(ctx)) { if (!msg.via_bot) await ctx.reply(helpText(resolveLang(ctx.from?.language_code)), { parse_mode: "Markdown" }); return; }
    if (!isRecentEnough(msg.date, now())) return;
    if (!isAttributableMember(msg) || !ctx.from) return; // anonymous admin, linked-channel forward, or bot
    const chat = ctx.chat;
    await store(env).touchGroup(chat.id, "title" in chat ? chat.title ?? "" : "");
    const kind = classifyMessage(msg);
    await store(env).recordMessage(chat.id, ctx.from.id, displayName(ctx.from), kind, msg.date);
  });
  wireGuest(bot, {
    botUsername: BOT,
    reply: (ctx) => onGuest(ctx),
    // `guest` is NOT written to `sources` here (REVIEW-GUEST F3): a summoner is not an
    // installer. src_guest is earned later, through the ?start=guest deep link in the
    // buttons below. recordGuest self-limits; `flood` downgrades us to the cheap pitch.
    record: async (uid, chatType, chatId) => {
      const r = await store(env).recordGuest(uid, chatType, chatId);
      if (r.recorded) await store(env).track(uid, "guest");
      return !r.flood;
    },
  });
  // Classic inline mode: the SAME reply builder, answered as an inline result. A user types
  // "@Bot query" in any chat on any client and posts the card with `via @Bot` attribution —
  // no admin, no membership, no Guest Chat Mode toggle. The destination chat is unknown, so
  // the card carries private-style buttons only. Counted under `inline_queries`; `sources` is
  // never written here (an inline user is not an installer, same rule as the guest path).
  wireInline(bot, {
    botUsername: BOT,
    reply: (ctx) => onGuest(ctx),
    record: async (uid) => !(await store(env).recordInline(uid)).flood,
    chosen: (uid) => store(env).recordInlineChosen(uid),
  });
  return bot;
}

async function api(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { initData?: string };
  const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((t): t is string => !!t));
  if (!user) return Response.json(initDataFailure(body.initData ?? "", publicLink()), { status: 401 });
  const today = dayIndex(now());
  const [from, to] = rangeDays(today, "week");
  const groups = [];
  for (const g of (await store(env).groupsOf(user.id)).slice(0, 20)) {
    const rows = await store(env).countsInRange(g.chat_id, from, to);
    const lb = leaderboard(rows, rows.length || 1);
    const rank = lb.findIndex((r) => r.userId === user.id);
    const mine = await store(env).memberStats(g.chat_id, user.id, from, to);
    groups.push({
      chat_id: g.chat_id, title: g.title, pro: g.pro,
      total7d: lb.reduce((s, r) => s + r.total, 0), myTotal: mine.total,
      rank: rank >= 0 ? rank + 1 : null, members: lb.length,
    });
  }
  return Response.json({ groups, proStars: PRO_STARS });
}

async function weeklyReport(env: Env): Promise<number> {
  const bot = new Bot(env.BOT_TOKEN);
  const today = dayIndex(now());
  const week = Math.floor(today / 7);
  let sent = 0;
  for (const g of (await store(env).proGroups()).slice(0, 500)) {
    if (await store(env).reportAlreadySent(g.chat_id, week)) continue;
    const [cf, ct] = [today - 7, today - 1];
    const [pf, pt] = [today - 14, today - 8];
    const curRows = await store(env).countsInRange(g.chat_id, cf, ct);
    const curTotal = await store(env).totalInRange(g.chat_id, cf, ct);
    const prevTotal = await store(env).totalInRange(g.chat_id, pf, pt);
    const d = weeklyDelta(curTotal, prevTotal);
    const top = leaderboard(curRows, 5);
    const lines = top.map((r, i) => `${medal(i)} ${escapeMd(r.name)} — ${r.total} (${r.pct}%)`);
    const arrow = d.delta > 0 ? "📈" : d.delta < 0 ? "📉" : "➡️";
    const text = `📅 *Weekly report*\n\n${lines.length ? lines.join("\n") : "No activity this week."}\n\n` +
      `Total: ${curTotal} ${arrow} (${d.delta >= 0 ? "+" : ""}${d.delta} vs last week${d.pctChange !== null ? `, ${d.pctChange >= 0 ? "+" : ""}${d.pctChange}%` : ""})`;
    try {
      await bot.api.sendMessage(g.chat_id, text, { parse_mode: "Markdown" });
      sent += 1;
      await store(env).markReportSent(g.chat_id, week, now()); // only mark sent once delivery succeeded
    } catch (e) { console.log("report failed", g.chat_id, String(e).slice(0, 100)); }
  }
  return sent;
}

/** POST /api/share: registers a Bot API "prepared" inline message (savePreparedInlineMessage)
 * so the Mini App can hand its id to tg.shareMessage(id) for a native chat/group/channel share. */
async function apiShare(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { initData?: string };
  const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((t): t is string => !!t));
  if (!user) return Response.json(initDataFailure(body.initData ?? "", publicLink()), { status: 401 });
  try {
    const share = await preparedShare(env, user.id, buildShareText(SHARE_PITCH, BOT, "shared"), `https://t.me/${BOT}`);
    await store(env).recordShare(user.id, "chat");
    return Response.json(share);
  } catch { return Response.json({ error: "Share unavailable." }, { status: 502 }); }
}

/** POST /api/share-story: records a "share to story" click. Telegram gives no server
 * callback for tg.shareToStory, so the client fires this right before calling it. */
async function apiShareStory(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { initData?: string };
  const user = await validateInitData(body.initData ?? "", [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((t): t is string => !!t));
  if (!user) return Response.json(initDataFailure(body.initData ?? "", publicLink()), { status: 401 });
  await store(env).recordShare(user.id, "story");
  return Response.json({ ok: true });
}

/** Mints the identical one-time invoice the chat flow's /pro button sends (`sendInvoice`
 * with payload "pulse-pro:"+chatId — see wirePro's onPaid, which matches on that same
 * prefix), scoped to one group. Group Pro has no bot-wide equivalent: `plan` is accepted
 * only to match ProLinkOpts.mint's signature (pulse never sells a monthly plan). */
function mintForChat(api: Bot["api"], _plan: ProPlan, chatId: number): Promise<string> {
  return api.createInvoiceLink(PRO.title, PRO.description, "pulse-pro:" + chatId, "", "XTR",
    [{ label: PRO.title, amount: PRO_STARS }]);
}

/** POST /api/pro-link: the Mini App's own Stars checkout (tg.openInvoice), per group. The
 * shared handleProLink (copied verbatim from habit/src/webapp.ts) only ever passes `plan`
 * to `mint`, so `chatId` is validated and closed over here, outside it. A real user (not a
 * QA fixture id, not an unauthenticated caller) with no valid chatId gets 400 rather than
 * a bot-wide invoice; handleProLink itself still owns every 401/200-qa/502 outcome. */
async function apiProLink(req: Request, env: Env): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as ProLinkBody;
  const tokens = [env.BOT_TOKEN, env.HUB_BOT_TOKEN].filter((t): t is string => !!t);
  const chatId = body.chatId;
  if (typeof chatId !== "number" || !Number.isFinite(chatId)) {
    const user = await validateInitData(body.initData ?? "", tokens);
    if (user && !isQaId(user.id)) return Response.json({ error: "chat required" }, { status: 400 });
  }
  return handleProLink(body, {
    tokens,
    botLink: publicLink(),
    allowMonthly: false,
    mint: (plan) => mintForChat(new Bot(env.BOT_TOKEN).api, plan, chatId as number),
    track: (userId) => store(env).track(userId, "invoice"),
  });
}

const botFetch = makeFetch<Env>(buildBot, (env) => store(env).stats());

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const path = new URL(req.url).pathname;
    if (path === "/app") return new Response(APP_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
    if (path === "/api/share" && req.method === "POST") return apiShare(req, env);
    if (path === "/api/share-story" && req.method === "POST") return apiShareStory(req, env);
    if (path === "/api/pro-link" && req.method === "POST") return apiProLink(req, env);
    if (path === "/api/groups" && req.method === "POST") return api(req, env);
    return botFetch(req, env);
  },
  async scheduled(_ev: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil((async () => { await weeklyReport(env); await store(env).cleanupRetention(now()); })());
  },
};
