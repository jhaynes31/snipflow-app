import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { stripeWebhook } from "./stripeWebhook";

const http = httpRouter();

// Convex Auth's routes (JWKS and sign-in callbacks).
auth.addHttpRoutes(http);

// Stripe tells us here when a payment or subscription changes.
http.route({ path: "/stripe/webhook", method: "POST", handler: stripeWebhook });

export default http;
