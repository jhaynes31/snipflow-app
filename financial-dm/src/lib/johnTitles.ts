/**
 * John's public titles, in the order they are shown. One place to change.
 * "Pre-Certified Financial Advisor" was added at Jen's request on
 * 12 Sep 2026. Every generator is told to use these exactly and no others.
 */
export const JOHN_TITLES = ["Licensed Term Life Agent", "Pre-Certified Financial Advisor"] as const;
export const JOHN_TITLE_LINE = JOHN_TITLES.join(" · ");
