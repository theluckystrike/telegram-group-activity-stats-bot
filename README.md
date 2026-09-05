# GroupPulseProBot — group activity stats for Telegram

**Try it:** [@GroupPulseProBot](https://t.me/GroupPulseProBot) · [tg.zovo.one/bots/pulse/](https://tg.zovo.one/bots/pulse/)

## What it does

GroupPulseProBot tracks how active a Telegram group is, without ever storing message content. Added with privacy mode off, it counts every message per member per day (split into text/media/other) and keeps an hour-of-day histogram for a "busiest hour" stat. `/pulse today|week|month` shows a top-10 leaderboard with message share, total messages, active members, and busiest hour; `/quiet` surfaces members who used to post but have gone quiet in the last 7 days; `/me` shows your own counts and rank; `/reset` (admins only) wipes the group's tracked data. Free tier: today/week views, 14-day retention. Pro (one-time 150 ⭐ per group) adds the month view, 90-day retention, and a weekly report posted to the group every Monday.

## Use it without adding the bot

Type `@GroupPulseProBot` in **any** Telegram chat, even one the bot has never been added to. It answers with a pitch card — activity stats need message history the bot doesn't have as a guest, so this is a pitch rather than a live leaderboard.

Both **Inline Mode** and **Guest Chat Mode** need to be turned on for the bot in [@BotFather](https://t.me/BotFather) (Bot Settings → Mode Settings) — turn Inline Mode on first, then Guest Chat Mode. Without both, only the classic `@Bot query` inline surface works.

## Self-host

```bash
pnpm i
wrangler secret put BOT_TOKEN
wrangler secret put WEBHOOK_SECRET
wrangler secret put OWNER_ID # optional
wrangler deploy
curl -G "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  --data-urlencode "url=https://<your-worker>.workers.dev/webhook" \
  --data-urlencode "secret_token=$WEBHOOK_SECRET" \
  --data-urlencode 'allowed_updates=["message","callback_query","guest_message","inline_query","chosen_inline_result"]'
```

## Stack

[grammY](https://grammy.dev/) on Cloudflare Workers, state in a Durable Object backed by SQLite, a weekly Cron Trigger for the Pro report, Pro upgrades billed with Telegram Stars.

---
Part of Tiny Telegram Tools — https://tg.zovo.one/
