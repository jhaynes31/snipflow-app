import { createServerFn } from "@tanstack/react-start";
import { sendResendCodeEmail } from "../../lib/email";

/**
 * Client initiated "Lost your code?" resend. Takes ONLY an email.
 *
 * Server side it asks Convex (mutations:resendReturnCode) to resolve the three
 * cases:
 *   - an existing pet profile is found        -> resend that code
 *   - no profile but a past approved booking  -> LEGACY BACKFILL: generate a
 *     fresh code and create the profile from that booking's saved pet details,
 *     then resend the new code
 *   - no profile and no approved booking      -> return not-found, NO email is
 *     sent (an empty code is never compromised or mailed)
 *
 * It only ever sends the resendCode email, never the approval time
 * "Your Pet Profile Is Saved!" email, and vice versa the approval path never
 * triggers this sender. One click equals one email; the button is debounced in
 * the booking form so a rapid double click cannot fire two.
 */
export const resendReturnCode = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid request");
    }
    const d = data as Record<string, unknown>;
    return {
      clientEmail:
        typeof d.clientEmail === "string" ? d.clientEmail.trim() : "",
    };
  })
  .handler(async ({ data }) => {
    if (!data.clientEmail) {
      return { success: false, error: "Please enter your email." };
    }
    const deploymentUrl = process.env.CONVEX_DEPLOYMENT_URL;
    if (!deploymentUrl) {
      return { success: false, error: "Backend not configured" };
    }
    try {
      const response = await fetch(`${deploymentUrl}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "mutations:resendReturnCode",
          args: { clientEmail: data.clientEmail },
        }),
      });
      if (!response.ok) {
        return {
          success: false,
          error: `Server error: ${response.status}`,
        };
      }
      const json = (await response.json()) as {
        status?: string;
        errorMessage?: string;
        value?: {
          found?: boolean;
          backfilled?: boolean;
          clientName?: string;
          returnCode?: string;
          petNames?: string;
        } | null;
      };
      if (json.status === "error" || json.errorMessage) {
        return { success: false, error: json.errorMessage || "Not found" };
      }
      const value = json.value;
      if (!value || !value.found) {
        return {
          success: false,
          notFound: true,
          error:
            "We couldn't find a saved profile for that email. You're welcome to book as normal and your profile will be created on your first approved booking.",
        };
      }
      // Send the resendCode email (client initiated, one email).
      await sendResendCodeEmail({
        clientName: value.clientName || data.clientEmail,
        clientEmail: data.clientEmail,
        returnCode: value.returnCode || "",
        petNames: value.petNames,
      });
      return { success: true, backfilled: Boolean(value.backfilled) };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : "Something went wrong",
      };
    }
  });
