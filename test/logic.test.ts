import { test } from "node:test";
import assert from "node:assert/strict";
import {
  busiestHour, classifyMessage, dayIndex, decodeChatId, encodeChatId, escapeMd, hourOfDay,
  isAttributableMember, isRecentEnough, isSourcePayload, leaderboard, quietMembers, rangeDays, retentionCutoffDay, weeklyDelta,
} from "../src/logic.ts";

const DAY = 86_400;

test("day-bucket computation with tz offset 0", () => {
  const t0 = 0; // epoch
  assert.equal(dayIndex(t0), 0);
  assert.equal(dayIndex(t0 + DAY - 1), 0);
  assert.equal(dayIndex(t0 + DAY), 1);
  assert.equal(dayIndex(t0 + 10 * DAY + 5), 10);
  // non-zero offset still resolves sanely (e.g. +120min shifts the boundary)
  assert.equal(dayIndex(DAY - 1, 120), 0 + Math.floor(((DAY - 1) + 120 * 60) / DAY));
  assert.equal(hourOfDay(3600 * 5), 5);
  assert.equal(hourOfDay(0), 0);
  assert.equal(hourOfDay(DAY - 1), 23);
});

test("leaderboard ordering and % share rounding (shares sum to 100 +/- 1)", () => {
  const rows = [
    { userId: 1, name: "Ann", total: 50 },
    { userId: 2, name: "Ben", total: 30 },
    { userId: 3, name: "Cy", total: 20 },
  ];
  const lb = leaderboard(rows, 10);
  assert.equal(lb.length, 3);
  assert.deepEqual(lb.map((r) => r.userId), [1, 2, 3]); // ordered desc
  const sum = lb.reduce((s, r) => s + r.pct, 0);
  assert.ok(Math.abs(sum - 100) <= 1, `sum was ${sum}`);
  assert.equal(lb[0].pct, 50);

  // uneven totals still land close to 100
  const uneven = leaderboard([{ userId: 1, name: "A", total: 1 }, { userId: 2, name: "B", total: 1 }, { userId: 3, name: "C", total: 1 }], 10);
  const s2 = uneven.reduce((s, r) => s + r.pct, 0);
  assert.ok(Math.abs(s2 - 100) <= 1, `sum was ${s2}`);

  // limit truncates but denominator stays the grand total
  const top1 = leaderboard(rows, 1);
  assert.equal(top1.length, 1);
  assert.equal(top1[0].pct, 50);
});

test("busiest hour", () => {
  assert.equal(busiestHour([{ hour: 9, n: 3 }, { hour: 14, n: 8 }, { hour: 20, n: 8 }]), 14); // tie -> lowest hour
  assert.equal(busiestHour([]), null);
  assert.equal(busiestHour([{ hour: 5, n: 1 }]), 5);
});

test("quiet-member selection", () => {
  const now = 1_000_000;
  const members = [
    { userId: 1, name: "Active", lastSeen: now - DAY, priorTotal: 40 },
    { userId: 2, name: "Quiet1", lastSeen: now - 10 * DAY, priorTotal: 25 },
    { userId: 3, name: "Quiet2", lastSeen: now - 20 * DAY, priorTotal: 60 },
    { userId: 4, name: "NeverPosted", lastSeen: now - 30 * DAY, priorTotal: 0 },
  ];
  const q = quietMembers(members, now);
  assert.deepEqual(q.map((m) => m.userId), [3, 2]); // sorted by priorTotal desc, excludes active + never-posted
});

test("retention cutoff", () => {
  assert.equal(retentionCutoffDay(100, 14), 87); // days [87..100] kept, day 86 deleted
  assert.equal(retentionCutoffDay(100, 90), 11);
});

test("weekly delta computation", () => {
  assert.deepEqual(weeklyDelta(120, 100), { current: 120, previous: 100, delta: 20, pctChange: 20 });
  assert.deepEqual(weeklyDelta(0, 0), { current: 0, previous: 0, delta: 0, pctChange: null });
  const d = weeklyDelta(50, 200);
  assert.equal(d.delta, -150);
  assert.equal(d.pctChange, -75);
});

test("deep-link chat id encode/decode", () => {
  assert.equal(encodeChatId(-1001234567890), "m1001234567890");
  assert.equal(decodeChatId("m1001234567890"), -1001234567890);
  assert.equal(encodeChatId(42), "42");
  assert.equal(decodeChatId("42"), 42);
  assert.equal(decodeChatId("not-a-number"), null);
});

test("bounded message age + message classification", () => {
  const now = 2_000_000;
  assert.equal(isRecentEnough(now, now), true);
  assert.equal(isRecentEnough(now - 2 * DAY, now), true);
  assert.equal(isRecentEnough(now - 3 * DAY, now), false);

  assert.equal(classifyMessage({ text: "hi" }), "text");
  assert.equal(classifyMessage({ photo: [{}] }), "media");
  assert.equal(classifyMessage({ sticker: {} }), "media");
  assert.equal(classifyMessage({}), "other");
});

test("range days for today/week/month", () => {
  assert.deepEqual(rangeDays(100, "today"), [100, 100]);
  assert.deepEqual(rangeDays(100, "week"), [94, 100]);
  assert.deepEqual(rangeDays(100, "month"), [71, 100]);
});

test("escapeMd escapes Markdown special chars including a trailing backslash", () => {
  assert.equal(escapeMd("my_handle"), "my\\_handle");
  assert.equal(escapeMd("a*b`c[d"), "a\\*b\\`c\\[d");
  assert.equal(escapeMd("Launch\\"), "Launch\\\\");
  assert.equal(escapeMd("plain name"), "plain name");
});

test("isAttributableMember skips anonymous admins, channel forwards, bots and via_bot", () => {
  assert.equal(isAttributableMember({ from: { id: 42 } }), true);
  assert.equal(isAttributableMember({ from: { id: 1087968824 } }), false); // GroupAnonymousBot
  assert.equal(isAttributableMember({ from: { id: 42 }, sender_chat: { id: -100 } }), false); // linked-channel forward
  assert.equal(isAttributableMember({ from: { id: 42, is_bot: true } }), false);
  assert.equal(isAttributableMember({ from: { id: 42 }, via_bot: { id: 7 } }), false);
  assert.equal(isAttributableMember({}), false); // no sender at all (channel post shape)
});

test("source-payload regex", () => {
  assert.equal(isSourcePayload("site"), true);
  assert.equal(isSourcePayload("share"), true);
  assert.equal(isSourcePayload("list"), true);
  assert.equal(isSourcePayload("x"), false); // too short (min 2)
  assert.equal(isSourcePayload("pro"), false); // reserved
  assert.equal(isSourcePayload("pro_m1001234567890"), false); // per-group pro payload
  assert.equal(isSourcePayload("thisistoolongasrc"), false); // over 12 chars
  assert.equal(isSourcePayload("Site1"), false); // must be lowercase letters only
});
