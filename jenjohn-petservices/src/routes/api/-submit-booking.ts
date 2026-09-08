import { createServerFn } from "@tanstack/react-start";
import { sendNewRequestNotification } from "../../lib/email";
import type { PetDetail } from "../../lib/petDetails";
import { computeMeetGreet } from "../../lib/meetGreetServer";

interface OtherSpeciesEntry {
  name: string;
  quantity: number;
}

interface PetsData {
  adultDogs: number;
  puppies: number;
  cats: number;
  kittens: number;
  otherSpecies: OtherSpeciesEntry[];
}

interface SubmitBookingInput {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress: string;
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
  pets: PetsData;
  isHoliday: boolean;
  totalPrice: number;
  holidaySurchargeDays?: number;
  holidaySurcharge?: number;
  priceBreakdown: unknown;
  notes?: string;
  petAnxieties?: string;
  petAnxietyManifestation?: string;
  petSleepsInBed?: string;
  petQuirks?: string;
  petNames?: string;
  petDetails?: PetDetail[];
  hearAboutUs?: string;
  referredBy?: string;
}
export const submitBooking = createServerFn({ method: "POST" })
  .validator((data: unknown): SubmitBookingInput => {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid request body");
    }
    const d = data as Record<string, unknown>;

    if (typeof d.clientName !== "string" || !d.clientName.trim()) {
      throw new Error("Client name is required");
    }
    if (typeof d.clientEmail !== "string" || !d.clientEmail.trim()) {
      throw new Error("Client email is required");
    }
    if (typeof d.clientAddress !== "string" || !d.clientAddress.trim()) {
      throw new Error("Client address is required");
    }
    if (typeof d.arrivalDate !== "string" || !d.arrivalDate.trim()) {
      throw new Error("Arrival date is required");
    }
    if (typeof d.arrivalTime !== "string" || !d.arrivalTime.trim()) {
      throw new Error("Arrival time is required");
    }
    if (typeof d.departureDate !== "string" || !d.departureDate.trim()) {
      throw new Error("Departure date is required");
    }
    if (typeof d.departureTime !== "string" || !d.departureTime.trim()) {
      throw new Error("Departure time is required");
    }
    if (typeof d.totalPrice !== "number") {
      throw new Error("Total price must be a number");
    }

    return {
      clientName: d.clientName as string,
      clientEmail: d.clientEmail as string,
      clientPhone: (d.clientPhone as string) || undefined,
      clientAddress: d.clientAddress as string,
      arrivalDate: d.arrivalDate as string,
      arrivalTime: d.arrivalTime as string,
      departureDate: d.departureDate as string,
      departureTime: d.departureTime as string,
      pets: d.pets as PetsData,
      isHoliday: Boolean(d.isHoliday),
      totalPrice: d.totalPrice as number,
      holidaySurchargeDays:
        typeof d.holidaySurchargeDays === "number"
          ? (d.holidaySurchargeDays as number)
          : undefined,
      holidaySurcharge:
        typeof d.holidaySurcharge === "number"
          ? (d.holidaySurcharge as number)
          : undefined,
      priceBreakdown: d.priceBreakdown as unknown,
      notes: (d.notes as string) || undefined,
      petAnxieties: (d.petAnxieties as string) || undefined,
      petAnxietyManifestation:
        (d.petAnxietyManifestation as string) || undefined,
      petSleepsInBed: (d.petSleepsInBed as string) || undefined,
      petQuirks: (d.petQuirks as string) || undefined,
      petNames: (d.petNames as string) || undefined,
      petDetails: Array.isArray(d.petDetails)
        ? (d.petDetails as PetDetail[])
        : undefined,
      hearAboutUs: (d.hearAboutUs as string) || undefined,
      referredBy: (d.referredBy as string) || undefined,
    };
  })
  .handler(async ({ data }) => {
    const deploymentUrl = process.env.CONVEX_DEPLOYMENT_URL;
    if (!deploymentUrl) {
      return {
        success: false,
        error: "Backend not configured. Please try again later.",
      };
    }

    try {
      // Compute the Owner-only Meet & Greet travel fee server-side from the
      // client's home address. Never sent back to the browser and never shown
      // to the client; it is persisted with the request for the admin/approval
      // summary. If no address resolves or no API key is configured, the fee
      // fields are left undefined (owner can override in the admin panel).
      let mgDistanceMiles: number | undefined;
      let mgFee: number | undefined;
      let mgOutsideArea: boolean | undefined;
      let mgManual: boolean | undefined;
      try {
        if (data.clientAddress && data.clientAddress.trim()) {
          const { distance, fee } = await computeMeetGreet({
            clientAddress: data.clientAddress.trim(),
          });
          if (distance.status === "ok" && distance.oneWayMiles > 0) {
            mgDistanceMiles = distance.oneWayMiles;
            mgFee = fee.fee;
            mgOutsideArea = fee.outsideArea;
            mgManual = distance.mode === "manual";
          }
        }
      } catch (mgErr) {
        // Never fail the booking because the fee lookup failed; the owner can
        // set the fee manually in the admin panel.
        console.error(
          "[booking] meet-greet fee computation failed:",
          mgErr instanceof Error ? mgErr.message : String(mgErr),
        );
      }
      const response = await fetch(`${deploymentUrl}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "mutations:createRequest",
          args: {
            clientName: data.clientName,
            clientEmail: data.clientEmail,
            clientPhone: data.clientPhone,
            clientAddress: data.clientAddress,
            arrivalDate: data.arrivalDate,
            arrivalTime: data.arrivalTime,
            departureDate: data.departureDate,
            departureTime: data.departureTime,
            pets: data.pets,
            isHoliday: data.isHoliday,
            totalPrice: data.totalPrice,
            holidaySurchargeDays: data.holidaySurchargeDays,
            holidaySurcharge: data.holidaySurcharge,
            priceBreakdown: data.priceBreakdown,
            notes: data.notes,
            petAnxieties: data.petAnxieties,
            petAnxietyManifestation: data.petAnxietyManifestation,
            petSleepsInBed: data.petSleepsInBed,
            petQuirks: data.petQuirks,
            petNames: data.petNames,
            petDetails: data.petDetails,
            hearAboutUs: data.hearAboutUs,
            referredBy: data.referredBy,
            meetGreetDistanceMiles: mgDistanceMiles,
            meetGreetFee: mgFee,
            meetGreetOutsideArea: mgOutsideArea,
            meetGreetManual: mgManual,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[booking] Convex mutation HTTP ${response.status}: ${errorText}`,
        );
        return {
          success: false,
          error: `Server error: ${response.status}. Please try again.`,
        };
      }

      const result = (await response.json()) as {
        status?: string;
        value?: unknown;
        errorMessage?: string;
      };

      // Convex returns {"status":"error","errorMessage":...} (with HTTP 200)
      // when the mutation fails validation or throws. Treat anything that
      // isn't an explicit success as a failed save — never report success
      // just because the HTTP request went through.
      if (result.status !== "success") {
        console.error(
          `[booking] Convex mutation error: ${
            result.errorMessage ?? "unknown error"
          }`,
        );
        return {
          success: false,
          error: result.errorMessage || "Booking could not be saved.",
        };
      }

      // Record is confirmed saved — now notify Jen & John. If the email
      // fails, the request is still saved and visible in the admin panel,
      // so we return success but log the failure for diagnosis.
      try {
        await sendNewRequestNotification({
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          clientPhone: data.clientPhone,
          clientAddress: data.clientAddress,
          arrivalDate: data.arrivalDate,
          arrivalTime: data.arrivalTime,
          departureDate: data.departureDate,
          departureTime: data.departureTime,
          pets: data.pets,
          isHoliday: data.isHoliday,
          totalPrice: data.totalPrice,
          priceBreakdown: data.priceBreakdown,
          notes: data.notes,
          petAnxieties: data.petAnxieties,
          petAnxietyManifestation: data.petAnxietyManifestation,
          petSleepsInBed: data.petSleepsInBed,
          petQuirks: data.petQuirks,
          petNames: data.petNames,
          petDetails: data.petDetails,
          hearAboutUs: data.hearAboutUs,
          referredBy: data.referredBy,
          referralRewardStatus: data.referredBy ? "pending" : undefined,
          meetGreetFee: mgFee,
          meetGreetDistanceMiles: mgDistanceMiles,
          meetGreetOutsideArea: mgOutsideArea,
        });
      } catch (emailErr) {
        console.error(
          "[booking] Failed to send new-request notification email:",
          emailErr instanceof Error ? emailErr.message : String(emailErr),
        );
      }

      return { success: true, requestId: result.value as string };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : "An unexpected error occurred.",
      };
    }
  });
