/** Two skins for one tool: the Shire garden path, and the Metamorphosis vine. */
export type LoopTheme = "shire" | "chrysalis";

export interface ThemeTokens {
  key: LoopTheme;
  toolName: string;
  mount: string;
  marker: "lantern" | "butterfly";
  node: "stone" | "leaf";
  ring: string;
  nodeFill: string;
  nodeStroke: string;
  nodeText: string;
  ramp: string;
  marker1: string;
  marker2: string;
  paper: string;
  accent: string;
  lensNames: Record<"brain" | "mind" | "faith", string>;
  kids: { child: string; teen: string; adult: string };
  checkWord: string;
  faithDefault: boolean;
  backHref: string;
  backLabel: string;
}

export const THEMES: Record<LoopTheme, ThemeTokens> = {
  shire: {
    key: "shire",
    toolName: "The Loop Map",
    mount: "/love-and-release/loops",
    marker: "lantern",
    node: "stone",
    ring: "#8a9a6b",
    nodeFill: "#e9dfc8",
    nodeStroke: "#a08b6a",
    nodeText: "#2f2a24",
    ramp: "#6f8f5a",
    marker1: "#f2c14e",
    marker2: "#f7e3a1",
    paper: "#f6f1e7",
    accent: "#4F6B3A",
    lensNames: { brain: "The Roots", mind: "The Path", faith: "The Light" },
    kids: { child: "Little hobbit-folk with a lantern", teen: "A taller one at the edge of the woods", adult: "You, holding the lantern" },
    checkWord: "Lantern check",
    faithDefault: true,
    backHref: "/love-and-release",
    backLabel: "Back to Re-Centered",
  },
  chrysalis: {
    key: "chrysalis",
    toolName: "The Chrysalis Loop",
    mount: "/metamorphosis/loops",
    marker: "butterfly",
    node: "leaf",
    ring: "#6f8f7a",
    nodeFill: "#dfe7ee",
    nodeStroke: "#3D5A73",
    nodeText: "#1f2a33",
    ramp: "#5b8a6f",
    marker1: "#e8954a",
    marker2: "#b89ad6",
    paper: "#eef2f5",
    accent: "#3D5A73",
    lensNames: { brain: "The Wiring", mind: "The Pattern", faith: "The New Creation" },
    kids: { child: "The caterpillar", teen: "The chrysalis", adult: "The butterfly" },
    checkWord: "Butterfly check",
    faithDefault: false,
    backHref: "/metamorphosis",
    backLabel: "Back to Metamorphosis",
  },
};
