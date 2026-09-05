import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGuestResult } from "../src/guest.ts";
import { buildGuestReply } from "../src/guestReply.ts";

const BOT = "GroupPulseBot";
const PITCH = "See who's active in your group.";

test("guest reply is the pitch: has text, an article title, and no parse_mode", () => {
  const r = buildGuestReply(BOT, PITCH);
  assert.equal(r.text, PITCH);
  assert.ok(r.title.length > 0);
  const res = buildGuestResult(r, BOT, "supergroup");
  assert.equal("parse_mode" in res.input_message_content, false);
});

test("default Open + Add-to-group buttons are present in a group", () => {
  const r = buildGuestReply(BOT, PITCH);
  const res = buildGuestResult(r, BOT, "supergroup");
  assert.equal(res.reply_markup?.inline_keyboard.length, 2);
});

test("only Open in a private chat (no group to add to)", () => {
  const r = buildGuestReply(BOT, PITCH);
  const res = buildGuestResult(r, BOT, "private");
  assert.equal(res.reply_markup?.inline_keyboard.length, 1);
});
