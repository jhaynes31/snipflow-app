"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { availableTools, DOORS_EITHER, DOORS_HER, DOORS_JOHN, type Door, type ToolEntry } from "@/convex/toolIndex";
import { embeddedPersonFor } from "@/core/person";
import { useHub } from "@/core/shell/HubContext";

/**
 * The tools this person can open, with "{who}" filled in, plus their doors.
 * Room tools show only for the room's owner, the same rule the server uses
 * for the coach. Undefined while the room claims are still loading.
 */
export function useTools(): { tools: ToolEntry[]; doors: Door[]; href: (t: ToolEntry) => string } | null {
  const { profile } = useHub();
  const mm = useQuery(api.rooms.status, { moduleId: "metamorphosis" });
  const rc = useQuery(api.reCentered.room.status);
  const hh = useQuery(api.rooms.status, { moduleId: "hearth" });
  if (!mm || !rc || !hh) return null;
  const rooms = { metamorphosis: mm.state === "mine", reCentered: rc.state === "mine", hearth: hh.state === "mine" };
  const who = embeddedPersonFor(profile);
  const tools = availableTools(rooms);
  const doors = (rooms.metamorphosis ? DOORS_JOHN : rooms.reCentered ? DOORS_HER : who === "john" ? DOORS_JOHN : DOORS_EITHER).filter((d) => tools.some((t) => t.key === d.toolKey));
  return { tools, doors, href: (t) => t.href.replace("{who}", who) };
}
