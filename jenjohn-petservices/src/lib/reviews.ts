import {
  loadReviews,
  addReview,
  editReview,
  deleteReview,
} from "~/lib/apiClient";

/**
 * Reviews are fetched through the plain /api/action endpoint (see
 * apiClient.ts); these re-exports keep callers unchanged.
 */

/**
 * Reviews: server functions that talk to the Convex HTTP API.
 * Queries resolve to `queries:<name>` and mutations to `mutations:<name>`
 * because they are exported from convex/queries.ts and convex/mutations.ts.
 */

export interface Review {
  _id?: string;
  name: string;
  date: string;
  quote: string;
}

export type ReviewInput = {
  name: string;
  date: string;
  quote: string;
};

export {
  loadReviews,
  addReview,
  editReview,
  deleteReview,
};

