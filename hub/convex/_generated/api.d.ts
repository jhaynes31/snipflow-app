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
import type * as gentleMode from "../gentleMode.js";
import type * as headsUps from "../headsUps.js";
import type * as http from "../http.js";
import type * as lib from "../lib.js";
import type * as manual from "../manual.js";
import type * as moduleHooks from "../moduleHooks.js";
import type * as privacy from "../privacy.js";
import type * as profiles from "../profiles.js";

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
  gentleMode: typeof gentleMode;
  headsUps: typeof headsUps;
  http: typeof http;
  lib: typeof lib;
  manual: typeof manual;
  moduleHooks: typeof moduleHooks;
  privacy: typeof privacy;
  profiles: typeof profiles;
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
