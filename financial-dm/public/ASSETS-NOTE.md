# Missing image assets

The following were removed from this bundle to keep the file size down. They are
static image assets only — no code depends on their contents, only on their paths.

- `public/themes/` (22 MB) — carousel background and border PNGs
- `public/dragons/` (2.5 MB) — dragon artwork
- `public/logo.png` (1.4 MB)

Restore them from the original export (`source.zip` inside
`fm-export-f34113db77c1.zip`) by copying the `themes/` and `dragons/` folders and
`logo.png` back into `public/`. Do this before testing the carousel PNG export,
since those exports render theme backgrounds.
