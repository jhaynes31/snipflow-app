import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CARD_MAP, CARDS, cardTitles, editsFor, INTENSITIES, mergeDoFirst, NEED_TYPES, NONVERBAL_TAPS, ownsSeedSet, shown } from "../core/tend/needCards/cards.ts";
import { DOORS_HER, toolByKey } from "../convex/toolIndex.ts";

describe("What I Need Right Now cards", () => {
  it("loads the seed: ten cards, five need types, three intensities, all from the file", () => {
    assert.equal(CARDS.length, 10);
    assert.equal(NEED_TYPES.length, 5);
    assert.equal(INTENSITIES.length, 3);
    for (const c of CARDS) {
      assert.ok(c.do_first.length >= 2 && c.say_this.length >= 1 && c.avoid.length >= 1 && c.scripture.ref, c.id);
    }
    assert.ok(CARD_MAP.shutdown.nonverbal_mode);
    assert.ok(CARD_MAP.depression.safety?.action.includes("988"));
    assert.ok(CARD_MAP.ocd.personalize_prompt);
    assert.ok(ownsSeedSet("her") && !ownsSeedSet("john"));
    assert.equal(NONVERBAL_TAPS.length, 7);
    assert.equal(cardTitles(["audhd", "shutdown"]), "AuDHD, Shutdown");
  });
  it("edits start from the seed, keep new seed items, hide and star", () => {
    const fresh = editsFor(CARD_MAP.audhd, null);
    assert.deepEqual(shown(fresh, "do_first"), CARD_MAP.audhd.do_first);
    const saved = { cardId: "audhd", sections: [{ key: "do_first" as const, items: [
      { text: "Bring water and a safe snack", hidden: false, starred: true, custom: false },
      { text: "Lower lights and noise", hidden: true, starred: false, custom: false },
      { text: "Put the dog out", hidden: false, starred: false, custom: true },
    ] }] };
    const e = editsFor(CARD_MAP.audhd, saved);
    assert.deepEqual(shown(e, "do_first"), ["Bring water and a safe snack", "Put the dog out", "Make one decision for her"]);
    assert.deepEqual(shown(e, "say_this"), CARD_MAP.audhd.say_this);
  });
  it("merges Do first across cards: starred first, no duplicates, five at most", () => {
    const a = editsFor(CARD_MAP.audhd, null);
    const b = editsFor(CARD_MAP.shutdown, { cardId: "shutdown", sections: [{ key: "do_first", items: [{ text: "Lower lights and sound", hidden: false, starred: true, custom: false }, { text: "Stop all questions", hidden: false, starred: false, custom: false }] }] });
    const merged = mergeDoFirst([{ edits: a }, { edits: b }]);
    assert.equal(merged[0], "Lower lights and sound");
    assert.ok(merged.length <= 5);
    assert.equal(new Set(merged.map((m) => m.toLowerCase())).size, merged.length);
  });
  it("the front desk has the door", () => {
    assert.ok(toolByKey("tend.signal"));
    assert.equal(DOORS_HER[0].toolKey, "tend.signal");
  });
});
