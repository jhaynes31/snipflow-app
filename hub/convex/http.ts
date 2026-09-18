import { httpRouter } from "convex/server";
import { auth } from "./auth";

/**
 * Convex Auth's HTTP routes: the JWKS endpoint the backend uses to verify
 * session tokens, plus the sign-in callbacks. Required for `auth.ts` to work.
 */
const http = httpRouter();

auth.addHttpRoutes(http);

export default http;
