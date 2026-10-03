import { query } from "../_generated/server";

/** Whether email and text are connected on this deployment (keys set in the Convex environment). */
export const status = query({
  args: {},
  handler: async () => ({
    email: Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM),
    text: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM),
  }),
});
