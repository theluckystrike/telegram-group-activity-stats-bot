import { test } from "node:test";
import assert from "node:assert/strict";
import { LANGS, resolveLang, t, type Key } from "../src/i18n.ts";

const KEYS: Key[] = ["help", "monthProOnly", "proGroupInfo", "proRunInGroup", "thankYou", "adminOnly", "resetDone"];
const BTN_KEYS: Key[] = ["btn_addToGroup", "btn_shareBot", "btn_unlockProStars"];

test("every locale has every btn_ key, and no label exceeds 32 chars", () => {
  for (const lang of LANGS) {
    for (const key of BTN_KEYS) {
      const s = t(lang, key, { stars: 150 });
      assert.ok(s.length > 0, `${lang}/${key} is empty`);
      assert.ok(s.length <= 32, `${lang}/${key} exceeds 32 chars: "${s}" (${s.length})`);
    }
  }
});

test("resolveLang falls back to en for unknown/missing codes", () => {
  assert.equal(resolveLang(undefined), "en");
  assert.equal(resolveLang(""), "en");
  assert.equal(resolveLang("xx"), "en");
  assert.equal(resolveLang("zz-ZZ"), "en");
});

test("resolveLang matches on the first two letters, case-insensitively", () => {
  assert.equal(resolveLang("de"), "de");
  assert.equal(resolveLang("DE-DE"), "de");
  assert.equal(resolveLang("id-ID"), "id");
});

test("t() falls back to English for an unknown language", () => {
  assert.equal(t("xx", "proRunInGroup"), t("en", "proRunInGroup"));
  assert.equal(t("zz", "proGroupInfo", { proDays: 90, stars: 150 }), t("en", "proGroupInfo", { proDays: 90, stars: 150 }));
});

test("we have at least 6 keys, and every language covers every key", () => {
  assert.ok(KEYS.length >= 6);
  for (const lang of LANGS) {
    for (const key of KEYS) {
      const s = t(lang, key);
      assert.equal(typeof s, "string");
      assert.ok(s.length > 0, `${lang}/${key} is empty`);
    }
  }
});

test("t() substitutes placeholders and leaves no token behind", () => {
  const s = t("en", "help", { freeDays: 3, proDays: 90, stars: 150 });
  assert.ok(s.includes("3") && s.includes("90") && s.includes("150"));
  assert.ok(!s.includes("{freeDays}") && !s.includes("{proDays}") && !s.includes("{stars}"));
});

test("no translation leaks a raw JS template expression", () => {
  for (const key of KEYS) for (const lang of LANGS) assert.ok(!t(lang, key).includes("${"), `${lang}/${key} has a leaked \${...}`);
});

test("every placeholder used in the English template is present in every other language", () => {
  const tokens = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of KEYS) {
    const enTokens = tokens(t("en", key));
    for (const lang of LANGS) assert.deepEqual(tokens(t(lang, key)), enTokens, `${lang}/${key} placeholder mismatch`);
  }
});

test("commands and the Pro/Stars brand words survive translation", () => {
  for (const lang of LANGS) {
    const help = t(lang, "help", { freeDays: 3, proDays: 90, stars: 150 });
    assert.ok(help.includes("/pulse"));
    assert.ok(help.includes("/pro"));
    assert.ok(t(lang, "proGroupInfo", { proDays: 90, stars: 150 }).includes("Pro"));
    assert.ok(t(lang, "proGroupInfo", { proDays: 90, stars: 150 }).includes("150"));
  }
});
