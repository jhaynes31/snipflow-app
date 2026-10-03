"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";

/**
 * One email, through Brevo's API (a free plan sends 300 a day, from a
 * sender address you validate in Brevo; no domain needed). The key and the
 * sender live in the Convex environment: BREVO_API_KEY, EMAIL_FROM, and an
 * optional EMAIL_FROM_NAME. Nothing is stored; a failure is logged and
 * skipped.
 */
export const deliver = internalAction({
  args: { to: v.string(), title: v.string(), body: v.string(), url: v.string() },
  handler: async (_ctx, args) => {
    const key = process.env.BREVO_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!key || !from) {
      console.error("Email: BREVO_API_KEY and EMAIL_FROM are not both set on the Convex deployment.");
      return;
    }
    const site = (process.env.SITE_URL ?? "https://the-shire-lilac.vercel.app").replace(/\/$/, "");
    const link = `${site}${args.url.startsWith("/") ? args.url : `/${args.url}`}`;
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: from, name: process.env.EMAIL_FROM_NAME ?? "The Shire" },
        to: [{ email: args.to }],
        subject: args.title,
        textContent: `${args.body}\n\nOpen it: ${link}`,
        htmlContent: `<p style="font:16px/1.5 sans-serif">${esc(args.body)}</p><p style="font:16px/1.5 sans-serif"><a href="${esc(link)}">Open it in The Shire</a></p>`,
      }),
    });
    if (!res.ok) console.error(`Email: Brevo answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
  },
});
