/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as auth from "../auth.js";
import type * as blogs from "../blogs.js";
import type * as content from "../content.js";
import type * as everybox_categories from "../everybox/categories.js";
import type * as everybox_commitments from "../everybox/commitments.js";
import type * as everybox_freshness from "../everybox/freshness.js";
import type * as everybox_households from "../everybox/households.js";
import type * as everybox_lib from "../everybox/lib.js";
import type * as everybox_reviews from "../everybox/reviews.js";
import type * as everybox_themes from "../everybox/themes.js";
import type * as http from "../http.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  auth: typeof auth;
  blogs: typeof blogs;
  content: typeof content;
  "everybox/categories": typeof everybox_categories;
  "everybox/commitments": typeof everybox_commitments;
  "everybox/freshness": typeof everybox_freshness;
  "everybox/households": typeof everybox_households;
  "everybox/lib": typeof everybox_lib;
  "everybox/reviews": typeof everybox_reviews;
  "everybox/themes": typeof everybox_themes;
  http: typeof http;
  users: typeof users;
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
