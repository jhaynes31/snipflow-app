# Spec Update 1: Names and Theme for The Shire

Last updated: 2026-09-18

This update applies on top of `hub-contract.md` and `support-app-spec.md`. Where anything here conflicts with those documents, this update wins.

**First steps for Claude Code:**

1. Save this file as `/docs/spec-update-1.md`.
2. Update `/docs/hub-contract.md` and `/docs/support-app-spec.md` so they match this update.
3. Make the changes below. Before editing code, list which files you'll touch and explain any root-cause issues you notice.

## 1. The Hub is named "The Shire"

- The user-facing name of the Hub is **The Shire**. It appears in the top bar, the browser tab title, the installed app (PWA) name, and the home screen.
- Store the display name in one config constant (for example, `APP_DISPLAY_NAME`), so it can be changed in one place later.
- Internal code names like `hub` and `core` stay as they are. Only user-facing text changes.

## 2. The support app is named "Tend"

- Display name: **Tend**.
- Module id: `tend`. Route: `/tend`. These replace `support` and `/support`.
- If any code already uses `support`, rename it and add a redirect from `/support` to `/tend`.
- Any spec text saying "the Support app" now means Tend.
- Tend's theme replaces "warm clay, dusk blue, candlelight" with a warm hearth-corner look inside the village palette: sage green, warm wood, and candlelight gold.

## 3. The workout app is no longer "Rooted"

- The workout app's final name is still being decided. Do not use "Rooted" anywhere.
- For now, use module id `fitness`, route `/fitness`, and display name "Fitness" from the module's manifest. When the final name arrives, it should be a one-line change to the manifest.
- Replace every "Rooted" reference in code, copy, and docs with the manifest's display name. Hook examples that mention Rooted (such as `forecast.tenderWeek` suggesting lighter sessions) now refer to the fitness module.
- The fitness module keeps its sunflower and sunshine accents, now sitting inside the village palette below.

## 4. Theme: cozy hobbit village

This replaces the "Frame design" part of the Hub Contract's visual design section. The feel is green, mossy, woodsy, and welcoming, like coming home to a warm hearth at the end of a long day.

**Color tokens** (define them in one theme file; all module themes build on them):

| Token | Light mode | Dark mode ("lantern-lit evening") |
| --- | --- | --- |
| `background` | Parchment `#F5EFE0` | Evening forest `#1F261C` |
| `surface` (cards) | Cream `#FBF8F0` | Deep moss `#2A3226` |
| `text` | Warm charcoal `#2F2A24` | Soft cream `#EDE6D6` |
| `textMuted` | Bark gray `#6B6155` | Lichen `#B5AE9C` |
| `primary` | Moss green `#4F6B3A` | Fern `#8FB069` |
| `secondary` | Bark brown `#6B4F3A` | Warm oak `#B08A66` |
| `accent` | Candlelight gold `#C98A2E` | Lantern gold `#E8B866` |
| `border` | Soft twig `#D9CFBA` | Dark bark `#3C4535` |

Check every text and background pairing for WCAG AA contrast in both modes, and adjust shades if any pair fails.

**Typography:** a warm, rounded serif for headings (Fraunces or Lora from Google Fonts), and a friendly, highly readable sans-serif for body text (Nunito). Body text stays at least 16px.

**Shapes and icons:**

- Rounded corners everywhere, round-topped cards, and arched, doorway-style tab buttons.
- One consistent outline icon set (Lucide or Tabler), leaning on garden, hearth, lantern, cottage, leaf, and path icons.

**Welcome and place:**

- The home screen greets each person by name: "Welcome home, Jen."
- Module tiles look like little places in the village, each with its own icon and accent.

**Textures:** subtle wood grain, paper, and moss, kept soft and flat so screens stay calm. Textures and decorative touches turn off completely in the "quiet visuals" setting and in low-demand mode.

**Original artwork only:** no characters, maps, logos, fonts, or imagery from the Tolkien books or films. The look is inspired by cozy village life, and every visual is made fresh.

Everything else in the visual design section stays the same, including accessibility, low-demand mode, and the shame-free rules.

## 5. Done when

- [x] "The Shire," "Tend," and the fitness module's display name come from config or manifests, not hard-coded strings.
- [x] No user-facing text says "Rooted," "Support app," or "the Hub."
- [x] `/support` redirects to `/tend`.
- [x] All colors come from the theme tokens file, and every text pairing passes WCAG AA in light and dark mode.
- [x] Quiet visuals and low-demand mode remove all textures and decorative touches.
- [x] Both original spec docs in `/docs` are updated to match.

## Implementation notes (added by the build)

- 2026-09-18: the workout app is named **Heartwood Fitness**. Changed in `modules/fitness/manifest.tsx` only; id and route remain `fitness`.

- `APP_DISPLAY_NAME` lives in `core/config.ts`. Module display names live only in each `modules/<id>/manifest.tsx`.
- Theme tokens live in `core/theme/tokens.ts` and are written to CSS variables by the root layout. Two shades were adjusted after the contrast check: candlelight gold fails AA as text on parchment (2.56:1), so an `accentText` token (`#8A5A14`, 5.15:1) exists for gold words in light mode, and dark-mode `secondary` was lightened from `#B08A66` to `#C4A07C` because the original was 4.22:1 on deep moss. `tests/theme.test.ts` checks every text pairing the app uses.
- The redirect from `/support` to `/tend` is in `next.config.ts`.
