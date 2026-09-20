import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeEntities, FEEDS, parseFeed, teaserOf } from "../convex/metamorphosis/rss.ts";

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Art of Manliness</title>
<item><title><![CDATA[How to Do Hard Things &#8212; Tired]]></title><link>https://www.artofmanliness.com/character/hard-things/</link>
<description><![CDATA[<p>Motivation is not the first step. <a href="x">Action</a> is. This piece walks through why, and what to do instead of waiting to feel ready, with a plan you can start tonight when the house is quiet and nobody is watching you.</p>]]></description>
<pubDate>Mon, 15 Sep 2026 12:00:00 +0000</pubDate></item>
<item><title>Second &amp; Shorter</title><link>https://example.com/two</link><description>Plain text.</description><pubDate>not a date</pubDate></item>
<item><title>No link</title><description>x</description></item>
<item><title>Bad link</title><link>javascript:alert(1)</link></item>
</channel></rss>`;

const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>An entry</title><link rel="alternate" href="https://example.com/entry"/><summary>Short.</summary><published>2026-09-10T08:00:00Z</published></entry></feed>`;

describe("field guide feeds", () => {
  it("lists the two sites Jen asked for", () => {
    assert.deepEqual(FEEDS.map((f) => f.key), ["aom", "additude"]);
    for (const f of FEEDS) assert.ok(f.url.startsWith("https://"));
  });
  it("parses RSS items with CDATA, entities, tags stripped, and dates", () => {
    const items = parseFeed(RSS);
    assert.equal(items.length, 2);
    assert.equal(items[0].title, "How to Do Hard Things — Tired");
    assert.equal(items[0].url, "https://www.artofmanliness.com/character/hard-things/");
    assert.ok(items[0].teaser.startsWith("Motivation is not the first step. Action is."));
    assert.ok(!items[0].teaser.includes("<"));
    assert.ok(items[0].teaser.length <= 181 && items[0].teaser.endsWith("…"));
    assert.equal(items[0].publishedAt, Date.parse("Mon, 15 Sep 2026 12:00:00 +0000"));
    assert.equal(items[1].title, "Second & Shorter");
    assert.equal(items[1].publishedAt, null);
  });
  it("skips items without a real http link", () => {
    assert.ok(!parseFeed(RSS).some((i) => i.title === "No link" || i.title === "Bad link"));
  });
  it("reads Atom too, and never throws on junk", () => {
    const [entry] = parseFeed(ATOM);
    assert.equal(entry.url, "https://example.com/entry");
    assert.equal(entry.teaser, "Short.");
    assert.deepEqual(parseFeed("<html>not a feed</html>"), []);
    assert.deepEqual(parseFeed(""), []);
  });
  it("respects the limit and decodes numeric entities", () => {
    const many = "<rss>" + Array.from({ length: 20 }, (_, i) => `<item><title>T${i}</title><link>https://e.com/${i}</link></item>`).join("") + "</rss>";
    assert.equal(parseFeed(many, 5).length, 5);
    assert.equal(decodeEntities("it&#8217;s &amp; &#x27;q&#x27;"), "it’s & 'q'");
    assert.equal(teaserOf("<b>hi</b>"), "hi");
  });
});
