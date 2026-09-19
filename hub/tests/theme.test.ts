import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AA_NORMAL_TEXT, contrastRatio } from "../core/theme/contrast.ts";
import { BACKGROUNDS, backgroundCss, readBackground } from "../core/theme/backgrounds.ts";
import { cssVariables, DARK, LIGHT, TEXT_PAIRS } from "../core/theme/tokens.ts";

describe("village theme contrast", () => {
  for (const [name, theme] of [
    ["light", LIGHT],
    ["dark", DARK],
  ] as const) {
    for (const [fg, bg] of TEXT_PAIRS) {
      it(`${name}: ${fg} on ${bg} passes WCAG AA for normal text`, () => {
        const ratio = contrastRatio(theme[fg], theme[bg]);
        assert.ok(ratio >= AA_NORMAL_TEXT, `${theme[fg]} on ${theme[bg]} is ${ratio.toFixed(2)}:1`);
      });
    }
  }
  it("raw accent gold is not used as text on parchment (it fails AA)", () => {
    assert.ok(contrastRatio(LIGHT.accent, LIGHT.background) < AA_NORMAL_TEXT);
    assert.ok(!TEXT_PAIRS.some(([fg, bg]) => fg === "accent" && (bg === "background" || bg === "surface")));
  });
  for (const b of BACKGROUNDS) {
    it(`background "${b.name}" keeps text and muted text readable in both modes`, () => {
      for (const fg of [LIGHT.text, LIGHT.textMuted]) assert.ok(contrastRatio(fg, b.light) >= AA_NORMAL_TEXT, `${fg} on ${b.light}`);
      for (const fg of [DARK.text, DARK.textMuted]) assert.ok(contrastRatio(fg, b.dark) >= AA_NORMAL_TEXT, `${fg} on ${b.dark}`);
    });
  }
  it("background css covers every option in both modes and the choice falls back safely", () => {
    const css = backgroundCss();
    for (const b of BACKGROUNDS.slice(1)) {
      assert.ok(css.includes(`[data-bg="${b.key}"]`), b.key);
      assert.ok(css.includes(b.light) && css.includes(b.dark), b.key);
    }
    assert.equal(readBackground(undefined), "parchment");
    assert.equal(readBackground({ hub: { background: "nonsense" } }), "parchment");
    assert.equal(readBackground({ hub: { background: "sky" } }), "sky");
    assert.equal(BACKGROUNDS[0].light, LIGHT.background);
    assert.equal(BACKGROUNDS[0].dark, DARK.background);
  });
  it("css variables cover both modes and every token", () => {
    const css = cssVariables();
    for (const key of Object.keys(LIGHT)) {
      const varName = "--" + key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
      assert.ok(css.includes(varName + ":"), `missing ${varName}`);
    }
    assert.ok(css.includes('[data-theme="dark"]'));
    assert.ok(css.includes("prefers-color-scheme: dark"));
    assert.ok(css.includes(DARK.background));
  });
});
