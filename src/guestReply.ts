/** Pure Guest Mode reply builder for GroupPulse. No I/O, no cross-dir imports beyond
 * guest.ts (dependency-free), so this runs under plain `node --test`. */
import type { GuestReply } from "./guest.ts";

/**
 * Stats need message history we do not have as a guest, so this is always the localized
 * pitch: the caller passes in the plain-text (Markdown stripped) /start copy.
 */
export function buildGuestReply(botUsername: string, startTextPlain: string): GuestReply {
  return {
    title: "📊 GroupPulse — who actually talks in your group",
    description: "Try: @" + botUsername + " to get started",
    text: startTextPlain,
  };
}
