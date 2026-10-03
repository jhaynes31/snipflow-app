"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";

/**
 * One text message, through Twilio. The account and the sending number live
 * in the Convex environment: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 * TWILIO_FROM. Nothing is stored; a failure is logged and skipped.
 */
export const deliver = internalAction({
  args: { to: v.string(), title: v.string(), body: v.string(), url: v.string() },
  handler: async (_ctx, args) => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) {
      console.error("Text: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM are not all set on the Convex deployment.");
      return;
    }
    const site = (process.env.SITE_URL ?? "https://the-shire-lilac.vercel.app").replace(/\/$/, "");
    const link = `${site}${args.url.startsWith("/") ? args.url : `/${args.url}`}`;
    const form = new URLSearchParams({ From: from, To: args.to, Body: `${args.title}\n${args.body}\n${link}`.slice(0, 1500) });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: { authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!res.ok) console.error(`Text: Twilio answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
  },
});
