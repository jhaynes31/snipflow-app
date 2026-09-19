/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as calendar from "../calendar.js";
import type * as checkIns from "../checkIns.js";
import type * as coach_chat from "../coach/chat.js";
import type * as coach_conversations from "../coach/conversations.js";
import type * as coach_prompt from "../coach/prompt.js";
import type * as coach_safety from "../coach/safety.js";
import type * as coach_titles from "../coach/titles.js";
import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as everyBox_areas from "../everyBox/areas.js";
import type * as everyBox_categories from "../everyBox/categories.js";
import type * as everyBox_commitments from "../everyBox/commitments.js";
import type * as everyBox_freshness from "../everyBox/freshness.js";
import type * as everyBox_households from "../everyBox/households.js";
import type * as everyBox_importLegacy from "../everyBox/importLegacy.js";
import type * as everyBox_lib from "../everyBox/lib.js";
import type * as everyBox_reviews from "../everyBox/reviews.js";
import type * as everyBox_tenders from "../everyBox/tenders.js";
import type * as everyBox_themes from "../everyBox/themes.js";
import type * as gentleMode from "../gentleMode.js";
import type * as headsUps from "../headsUps.js";
import type * as http from "../http.js";
import type * as keptWord_asks from "../keptWord/asks.js";
import type * as keptWord_pure from "../keptWord/pure.js";
import type * as keptWord_ways from "../keptWord/ways.js";
import type * as keptWord_words from "../keptWord/words.js";
import type * as lib from "../lib.js";
import type * as manual from "../manual.js";
import type * as metamorphosis_entries from "../metamorphosis/entries.js";
import type * as metamorphosis_letter from "../metamorphosis/letter.js";
import type * as metamorphosis_more from "../metamorphosis/more.js";
import type * as metamorphosis_tools from "../metamorphosis/tools.js";
import type * as moduleHooks from "../moduleHooks.js";
import type * as privacy from "../privacy.js";
import type * as profiles from "../profiles.js";
import type * as reCentered_entries from "../reCentered/entries.js";
import type * as reCentered_pure from "../reCentered/pure.js";
import type * as reCentered_room from "../reCentered/room.js";
import type * as rooms from "../rooms.js";
import type * as safetyPlan from "../safetyPlan.js";
import type * as seasons_collect from "../seasons/collect.js";
import type * as seasons_generate from "../seasons/generate.js";
import type * as seasons_pure from "../seasons/pure.js";
import type * as seasons_reports from "../seasons/reports.js";
import type * as storehouse_money from "../storehouse/money.js";
import type * as storehouse_pure from "../storehouse/pure.js";
import type * as tend_checkIns from "../tend/checkIns.js";
import type * as tend_evidence from "../tend/evidence.js";
import type * as tend_focus from "../tend/focus.js";
import type * as tend_guidance from "../tend/guidance.js";
import type * as tend_log from "../tend/log.js";
import type * as tend_loops from "../tend/loops.js";
import type * as tend_loveMenu from "../tend/loveMenu.js";
import type * as tend_notes from "../tend/notes.js";
import type * as tend_patterns from "../tend/patterns.js";
import type * as tend_projects from "../tend/projects.js";
import type * as tend_pure from "../tend/pure.js";
import type * as tend_repair from "../tend/repair.js";
import type * as tend_starter from "../tend/starter.js";
import type * as tend_together from "../tend/together.js";
import type * as tend_tools from "../tend/tools.js";
import type * as well_entries from "../well/entries.js";
import type * as well_together from "../well/together.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  calendar: typeof calendar;
  checkIns: typeof checkIns;
  crons: typeof crons;
  events: typeof events;
  "coach/chat": typeof coach_chat;
  "coach/conversations": typeof coach_conversations;
  "coach/prompt": typeof coach_prompt;
  "coach/safety": typeof coach_safety;
  "coach/titles": typeof coach_titles;
  "everyBox/areas": typeof everyBox_areas;
  "everyBox/categories": typeof everyBox_categories;
  "everyBox/commitments": typeof everyBox_commitments;
  "everyBox/freshness": typeof everyBox_freshness;
  "everyBox/households": typeof everyBox_households;
  "everyBox/importLegacy": typeof everyBox_importLegacy;
  "everyBox/lib": typeof everyBox_lib;
  "everyBox/reviews": typeof everyBox_reviews;
  "everyBox/tenders": typeof everyBox_tenders;
  "everyBox/themes": typeof everyBox_themes;
  gentleMode: typeof gentleMode;
  headsUps: typeof headsUps;
  http: typeof http;
  "keptWord/asks": typeof keptWord_asks;
  "keptWord/pure": typeof keptWord_pure;
  "keptWord/ways": typeof keptWord_ways;
  "keptWord/words": typeof keptWord_words;
  lib: typeof lib;
  manual: typeof manual;
  "metamorphosis/entries": typeof metamorphosis_entries;
  "metamorphosis/letter": typeof metamorphosis_letter;
  "metamorphosis/more": typeof metamorphosis_more;
  "metamorphosis/tools": typeof metamorphosis_tools;
  moduleHooks: typeof moduleHooks;
  privacy: typeof privacy;
  profiles: typeof profiles;
  "reCentered/entries": typeof reCentered_entries;
  "reCentered/pure": typeof reCentered_pure;
  "reCentered/room": typeof reCentered_room;
  rooms: typeof rooms;
  safetyPlan: typeof safetyPlan;
  "seasons/collect": typeof seasons_collect;
  "seasons/generate": typeof seasons_generate;
  "seasons/pure": typeof seasons_pure;
  "seasons/reports": typeof seasons_reports;
  "storehouse/money": typeof storehouse_money;
  "storehouse/pure": typeof storehouse_pure;
  "tend/checkIns": typeof tend_checkIns;
  "tend/evidence": typeof tend_evidence;
  "tend/focus": typeof tend_focus;
  "tend/guidance": typeof tend_guidance;
  "tend/log": typeof tend_log;
  "tend/loops": typeof tend_loops;
  "tend/loveMenu": typeof tend_loveMenu;
  "tend/notes": typeof tend_notes;
  "tend/patterns": typeof tend_patterns;
  "tend/projects": typeof tend_projects;
  "tend/pure": typeof tend_pure;
  "tend/repair": typeof tend_repair;
  "tend/starter": typeof tend_starter;
  "tend/together": typeof tend_together;
  "tend/tools": typeof tend_tools;
  "well/entries": typeof well_entries;
  "well/together": typeof well_together;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
