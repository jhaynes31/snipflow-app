import { createServerFn } from "@tanstack/react-start";
import type { PetDetail } from "../../lib/petDetails";

export interface SavedProfilePet {
  name: string;
  breed?: string;
  age?: string;
  type: string;
  species?: string;
  vetName?: string;
  vetPhone?: string;
  feedingInstructions?: string;
}

export interface PetProfileData {
  clientName: string;
  returnCode: string;
  pets: SavedProfilePet[];
  anxieties?: string;
  anxietyManifestation?: string;
  sleepsInBed?: string;
  quirks?: string;
}

/**
 * Fetch a returning client's saved pet profile. Requires BOTH the return code
 * and the email so no code guess can leak another client's details. Returns
 * { success: true, profile } on a match, { success: false, error } otherwise.
 */
export const getPetProfile = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid request");
    }
    const d = data as Record<string, unknown>;
    return {
      returnCode: typeof d.returnCode === "string" ? d.returnCode : "",
      clientEmail: typeof d.clientEmail === "string" ? d.clientEmail : "",
    };
  })
  .handler(async ({ data }) => {
    const deploymentUrl = process.env.CONVEX_DEPLOYMENT_URL;
    if (!deploymentUrl) {
      return { success: false, error: "Backend not configured" };
    }
    try {
      const response = await fetch(`${deploymentUrl}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "queries:getPetProfile",
          args: {
            returnCode: data.returnCode,
            clientEmail: data.clientEmail,
          },
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
        value?: PetProfileData | null;
      };
      if (json.status === "error" || json.errorMessage) {
        return { success: false, error: json.errorMessage || "Not found" };
      }
      if (!json.value) {
        return {
          success: false,
          error:
            "We couldn't find a saved profile for that code and email. Double check your code and email and try again.",
        };
      }
      return { success: true, profile: json.value };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : "Something went wrong",
      };
    }
  });
