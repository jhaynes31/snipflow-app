"use client";

import { Builder } from "./screens/Builder";
import { Deck } from "./screens/Deck";
import { Learn } from "./screens/Learn";
import { LoopPage } from "./screens/LoopPage";
import { Loops } from "./screens/Loops";
import { Review } from "./screens/Review";
import { Shell } from "./Shell";
import type { LoopTheme } from "./theme";

/** One tool, mounted twice: Re-Centered (shire) and Metamorphosis (chrysalis). */
export function LoopsScreen({ path, theme }: { path: string[]; theme: LoopTheme }) {
  const [first, second] = path;
  let screen: React.ReactNode;
  if (!first) screen = <Loops theme={theme} />;
  else if (first === "new") screen = <Builder theme={theme} />;
  else if (first === "learn") screen = <Learn theme={theme} lens={second ?? null} />;
  else if (first === "deck") screen = <Deck theme={theme} />;
  else if (first === "review") screen = <Review theme={theme} />;
  else screen = <LoopPage theme={theme} id={first} tab={second ?? null} />;
  return <Shell theme={theme}>{screen}</Shell>;
}
