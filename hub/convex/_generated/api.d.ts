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
import type * as lib from "../lib.js";
import type * as manual from "../manual.js";
import type * as moduleHooks from "../moduleHooks.js";
import type * as privacy from "../privacy.js";
import type * as profiles from "../profiles.js";
import type * as tend_checkIns from "../tend/checkIns.js";
import type * as tend_guidance from "../tend/guidance.js";
import type * as tend_loveMenu from "../tend/loveMenu.js";
import type * as tend_pure from "../tend/pure.js";
import type * as tend_starter from "../tend/starter.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  calendar: typeof calendar;
  checkIns: typeof checkIns;
  events: typeof events;
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
  lib: typeof lib;
  manual: typeof manual;
  moduleHooks: typeof moduleHooks;
  privacy: typeof privacy;
  profiles: typeof profiles;
  "tend/checkIns": typeof tend_checkIns;
  "tend/guidance": typeof tend_guidance;
  "tend/loveMenu": typeof tend_loveMenu;
  "tend/pure": typeof tend_pure;
  "tend/starter": typeof tend_starter;
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
