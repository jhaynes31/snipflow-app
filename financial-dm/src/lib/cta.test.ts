import { describe, expect, test } from "bun:test";
import { CTA_PLACEMENTS, effectiveCta, isCtaPlacement, reconcileCta, withCtaLine } from "./cta";
import { applyCtaSlides, buildEditableDeck, ctaSlideIndexes } from "./slideEditor";

describe("call to action helpers", () => {
  test("effective call to action honours the switch", () => {
    expect(effectiveCta(true, " Book a call. ")).toBe("Book a call.");
    expect(effectiveCta(false, "Book a call.")).toBe("");
    expect(effectiveCta(true, "")).toBe("");
  });
  test("caption gains the line once, on its own line", () => {
    expect(withCtaLine("Nice caption.", "Book a call.")).toBe("Nice caption.\n\nBook a call.");
    expect(withCtaLine("Nice caption. Book a call.", "Book a call.")).toBe("Nice caption. Book a call.");
    expect(withCtaLine("Nice caption.", "")).toBe("Nice caption.");
    expect(withCtaLine("", "Book a call.")).toBe("Book a call.");
  });
  test("reconcile keeps a chosen option and falls back to the first", () => {
    expect(reconcileCta(["a", "b"], "b")).toBe("b");
    expect(reconcileCta(["a", "b"], "zzz")).toBe("a");
    expect(reconcileCta([], "zzz")).toBe("");
    expect(CTA_PLACEMENTS.map((p) => p.id).every(isCtaPlacement)).toBe(true);
    expect(isCtaPlacement("top")).toBe(false);
  });
});

describe("carousel call to action slides", () => {
  const src = {
    title: "Coverage That Walks Out With You",
    fact: "Group life ends with the job.",
    slides: [
      { heading: "One", body: "first" },
      { heading: "Two", body: "second" },
      { heading: "Three", body: "third" },
      { heading: "Four", body: "fourth" },
    ],
    callToAction: "Book a free call with John.",
    ctaHeading: "Want a straight answer?",
  };
  const kinds = (deck: ReturnType<typeof buildEditableDeck>) => deck.map((s) => s.kind).join(",");
  const cta = { heading: "Want a straight answer?", body: "Book a free call with John." };

  test("the default deck ends with one call to action slide, as before", () => {
    const deck = buildEditableDeck(src);
    expect(kinds(deck)).toBe("cover,content,content,content,content,closing");
    expect(deck[5].elements.map((e) => e.text)).toContain("Book a free call with John.");
    expect(deck[5].elements.map((e) => e.text)).toContain("Want a straight answer?");
    expect(ctaSlideIndexes(deck)).toEqual([5]);
  });
  test("placement puts the slide in the middle, at the end, both, or nowhere, keeping the content", () => {
    const base = buildEditableDeck(src);
    base[1].background = "custom-x";
    const middle = applyCtaSlides(base, "middle", cta);
    expect(kinds(middle)).toBe("cover,content,content,closing,content,content");
    expect(middle[1].background).toBe("custom-x");
    const both = applyCtaSlides(middle, "both", cta);
    expect(kinds(both)).toBe("cover,content,content,closing,content,content,closing");
    const none = applyCtaSlides(both, "none", cta);
    expect(kinds(none)).toBe("cover,content,content,content,content");
    const end = applyCtaSlides(none, "end", { heading: "", body: "Send John a message." });
    expect(kinds(end)).toBe("cover,content,content,content,content,closing");
    expect(end[5].elements.map((e) => e.text)).toContain("Send John a message.");
    expect(end[5].elements.map((e) => e.text)).toContain("Ready to level up?");
  });
  test("the middle slide lands after the first half of the content and content numbering is untouched", () => {
    const deck = applyCtaSlides(buildEditableDeck({ ...src, slides: src.slides.slice(0, 3) }), "middle", cta);
    expect(kinds(deck)).toBe("cover,content,content,closing,content");
    expect(deck.filter((s) => s.kind === "content").map((s) => s.elements[0].text)).toEqual(["Slide 1", "Slide 2", "Slide 3"]);
    expect(applyCtaSlides(buildEditableDeck({ ...src, slides: [] }), "both", cta).map((s) => s.kind)).toEqual(["cover", "closing"]);
  });
  test("a new call to action slide borrows the look of the slide before it", () => {
    const base = buildEditableDeck(src).map((s) => ({ ...s, background: "night", themeBorder: "gold" }));
    const deck = applyCtaSlides(base, "both", cta);
    for (const i of ctaSlideIndexes(deck)) {
      expect(deck[i].background).toBe("night");
      expect(deck[i].themeBorder).toBe("gold");
    }
  });
});
