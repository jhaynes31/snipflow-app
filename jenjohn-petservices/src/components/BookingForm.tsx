import { useState, useEffect, useMemo, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  calculatePrice,
  type BreakdownItem,
  type PricingResult,
} from "~/lib/pricing";
import PriceCalculator from "~/components/PriceCalculator";
import {
  submitBooking,
  getPetProfile as fetchPetProfile,
  resendReturnCode as fetchResendCode,
} from "~/lib/apiClient";
import {
  derivePetsData,
  derivePetNames,
  PET_TYPE_LABELS,
  type PetDetail,
  type PetsData,
} from "~/lib/petDetails";

/** Pet card with a stable local id (stripped before submit). */
interface PetCard extends PetDetail {
  id: number;
}

function newPetCard(id: number): PetCard {
  return { id, name: "", breed: "", age: "", type: "adultDog", species: "" };
}

const RECOGNIZED_HOLIDAYS = [
  "New Year's Day (Jan 1)",
  "Memorial Day (last Mon in May)",
  "Independence Day (Jul 4)",
  "Labor Day (first Mon in Sep)",
  "Thanksgiving (4th Thu in Nov)",
  "Easter Weekend",
  "Christmas Period (Dec 24 through Jan 2)",
];

const ANXIETY_OPTIONS = [
  "Separation anxiety",
  "Noise triggers (thunder, fireworks, loud sounds)",
  "Strangers or new people",
  "Other animals",
  "Other",
  "None",
] as const;

const HEAR_ABOUT_OPTIONS = [
  "Flyer",
  "Facebook",
  "NextDoor",
  "Google",
  "Friend",
  "Other",
] as const;

function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface BookingFormProps {
  externalArrivalDate?: string;
  externalDepartureDate?: string;
}

export default function BookingForm({
  externalArrivalDate,
  externalDepartureDate,
}: BookingFormProps = {}) {
  const navigate = useNavigate();

  // Client fields
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  // Date fields
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("10:00");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("16:00");

  // Sync external date props into internal state (driven by calendar selection)
  useEffect(() => {
    if (externalArrivalDate) setArrivalDate(externalArrivalDate);
  }, [externalArrivalDate]);

  useEffect(() => {
    if (externalDepartureDate) setDepartureDate(externalDepartureDate);
  }, [externalDepartureDate]);

  // Pets — one card per pet
  const [pets, setPets] = useState<PetCard[]>(() => [newPetCard(1)]);
  const [nextPetId, setNextPetId] = useState(2);

  // Notes
  const [notes, setNotes] = useState("");

  // How they found us (field A) + referral (fields B & C)
  const [hearAboutUs, setHearAboutUs] = useState<string>("");
  const [hearAboutUsOther, setHearAboutUsOther] = useState("");
  const [referredToUs, setReferredToUs] = useState<string>(""); // "", "yes", "no"
  const [referredBy, setReferredBy] = useState("");

  // Pet care questions
  const [petAnxietyOptions, setPetAnxietyOptions] = useState<string[]>([]);
  const [petAnxietyManifestation, setPetAnxietyManifestation] = useState("");
  const [petSleepsInBed, setPetSleepsInBed] = useState("");
  const [petQuirks, setPetQuirks] = useState("");

  // Returning client: enter a saved code + email to pre-fill their pets.
  const [returnCode, setReturnCode] = useState("");
  const [returnCodeEmail, setReturnCodeEmail] = useState("");
  const [loadProfileStatus, setLoadProfileStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [loadProfileMessage, setLoadProfileMessage] = useState("");
  const [loadedPetNames, setLoadedPetNames] = useState<string[]>([]);

  // Lost your code? resend state. resendStatus debounces the button so a rapid
  // double click can never fire two emails.
  const [resendStatus, setResendStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [resendMessage, setResendMessage] = useState("");

  async function handleLoadProfile() {
    if (!returnCode.trim() || !returnCodeEmail.trim()) {
      setLoadProfileStatus("error");
      setLoadProfileMessage(
        "Enter your return code and the email you booked with.",
      );
      return;
    }
    setLoadProfileStatus("loading");
    setLoadProfileMessage("");
    let result: Awaited<ReturnType<typeof fetchPetProfile>>;
    try {
      result = await fetchPetProfile({
        returnCode: returnCode.trim(),
        clientEmail: returnCodeEmail.trim(),
      });
    } catch (err) {
      setLoadProfileStatus("error");
      setLoadProfileMessage(
        err instanceof Error
          ? err.message
          : "We couldn't load your saved profile right now. Please try again.",
      );
      return;
    }
    if (!result.success || !result.profile) {
      setLoadProfileStatus("error");
      setLoadProfileMessage(
        result.error ||
          "We couldn't find a saved profile for that code and email.",
      );
      return;
    }
    const profile = result.profile;
    // Pre-fill the pet cards from the saved profile.
    const savedPets: PetCard[] = profile.pets.map((p, i) => ({
      id: i + 1,
      name: p.name || "",
      breed: p.breed ?? "",
      age: p.age ?? "",
      type: (p.type as PetCard["type"]) || "adultDog",
      species: p.species ?? "",
    }));
    setPets(savedPets.length > 0 ? savedPets : [newPetCard(1)]);
    setNextPetId(savedPets.length + 1);
    // Pre-fill the about-your-pets fields.
    if (profile.anxieties) {
      const opts = profile.anxieties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      setPetAnxietyOptions(opts);
      if (opts.some((o) => o !== "None") && profile.anxietyManifestation) {
        setPetAnxietyManifestation(profile.anxietyManifestation);
      }
    }
    if (profile.sleepsInBed) setPetSleepsInBed(profile.sleepsInBed);
    if (profile.quirks) setPetQuirks(profile.quirks);
    // Pre-fill the client name so they only confirm it.
    if (profile.clientName) setClientName(profile.clientName);
    setLoadedPetNames(
      profile.pets.map((p) => p.name.trim()).filter(Boolean),
    );
    const names = profile.pets.map((p) => p.name.trim()).filter(Boolean);
    setLoadProfileStatus("success");
    setLoadProfileMessage(
      names.length > 0
        ? `Found your saved profile. Your pets (${names.join(", ")}) are filled in for you.`
        : "Found your saved profile. Your pet details are filled in for you.",
    );
  }

  async function handleResendCode() {
    // Debounce: while a resend is in flight or has just completed, don't fire
    // a second request (one click = one email).
    if (resendStatus === "sending" || resendStatus === "sent") return;
    if (!returnCodeEmail.trim()) {
      setResendStatus("error");
      setResendMessage("Enter the email you booked with so we can send your code.");
      return;
    }
    setResendStatus("sending");
    setResendMessage("");
    let result: Awaited<ReturnType<typeof fetchResendCode>>;
    try {
      result = await fetchResendCode({ clientEmail: returnCodeEmail.trim() });
    } catch (err) {
      setResendStatus("error");
      setResendMessage(
        err instanceof Error
          ? err.message
          : "We couldn't send your code right now. Please try again.",
      );
      return;
    }
    if (result.success) {
      setResendStatus("sent");
      setResendMessage(
        `We've emailed your return code to ${returnCodeEmail.trim()}. Please keep it handy for next time.`,
      );
    } else {
      setResendStatus("error");
      setResendMessage(
        result.notFound
          ? "We couldn't find a saved code for that email. You're welcome to book as normal and your profile will be created on your first approved booking."
          : (result.error ??
              "We couldn't find a saved code for that email. Please try again."),
      );
    }
  }

  // Checkbox toggle: "None" excludes every other option; any other
  // option unchecks "None". When no non-"None" option remains checked,
  // the describe box hides, so its text is cleared.
  const toggleAnxietyOption = (option: string) => {
    setPetAnxietyOptions((prev) => {
      const next =
        option === "None"
          ? ["None"]
          : (() => {
              const withoutNone = prev.filter((o) => o !== "None");
              return withoutNone.includes(option)
                ? withoutNone.filter((o) => o !== option)
                : [...withoutNone, option];
            })();
      if (!next.some((o) => o !== "None")) {
        setPetAnxietyManifestation("");
      }
      return next;
    });
  };

  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Derived pets data — pricing counts from the card list
  const petsData: PetsData = useMemo(() => derivePetsData(pets), [pets]);
  const otherSpeciesCount = useMemo(
    () => petsData.otherSpecies.reduce((sum, row) => sum + row.quantity, 0),
    [petsData],
  );
  const petNames = useMemo(() => derivePetNames(pets), [pets]);

  // Live price calculation
  const pricingResult: PricingResult | null = useMemo(() => {
    if (!arrivalDate || !departureDate || !arrivalTime || !departureTime) {
      return null;
    }
    const arrDate = new Date(arrivalDate + "T00:00:00");
    const depDate = new Date(departureDate + "T00:00:00");

    if (isNaN(arrDate.getTime()) || isNaN(depDate.getTime())) {
      return null;
    }

    if (depDate <= arrDate) {
      return null; // validation will catch this
    }

    return calculatePrice({
      arrivalDate: arrDate,
      arrivalTime,
      departureDate: depDate,
      departureTime,
      adultDogs: petsData.adultDogs,
      puppies: petsData.puppies,
      cats: petsData.cats,
      kittens: petsData.kittens,
      otherSpeciesCount,
    });
  }, [
    arrivalDate,
    departureDate,
    arrivalTime,
    departureTime,
    petsData,
    otherSpeciesCount,
  ]);

  // Pet card management
  function addPet() {
    setPets((prev) => [...prev, newPetCard(nextPetId)]);
    setNextPetId((id) => id + 1);
  }

  function removePet(id: number) {
    setPets((prev) => prev.filter((p) => p.id !== id));
  }

  function updatePet(id: number, field: keyof PetCard, value: string) {
    setPets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  }

  // Validation
  function validate(): string[] {
    const errors: string[] = [];

    if (!clientName.trim()) errors.push("Name is required.");
    if (!clientEmail.trim()) errors.push("Email is required.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail))
      errors.push("Enter a valid email address.");
    if (!clientAddress.trim()) errors.push("Home address is required.");

    if (!arrivalDate) errors.push("Arrival date is required.");
    if (!departureDate) errors.push("Departure date is required.");
    if (!arrivalTime) errors.push("Arrival time is required.");
    if (!departureTime) errors.push("Departure time is required.");

    if (arrivalDate && departureDate) {
      const arr = new Date(arrivalDate + "T00:00:00");
      const dep = new Date(departureDate + "T00:00:00");
      if (dep <= arr) {
        errors.push("Departure date must be after arrival date.");
      }
    }

    const namedPets = pets.filter((p) => p.name.trim().length > 0);
    if (namedPets.length === 0) {
      errors.push("Please add at least one pet.");
    } else if (namedPets.length < pets.length) {
      errors.push("Please add a name for each pet.");
    }

    if (!petSleepsInBed) errors.push("Please select yes or no.");

    // Field A: how they heard about us is required. If "Other" is selected
    // the typed answer is required as part of field A.
    if (!hearAboutUs) {
      errors.push("Please tell us how you heard about us.");
    } else if (hearAboutUs === "Other" && !hearAboutUsOther.trim()) {
      errors.push("Please tell us how you heard about us.");
    }

    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitStatus("idle");
    setSubmitMessage("");

    const errors = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);

    setSubmitting(true);
    try {
      // Full per-pet details (id stripped, empty optionals omitted)
      const petDetails: PetDetail[] = pets.map(({ id: _id, ...rest }) => ({
        name: rest.name.trim(),
        breed: rest.breed?.trim() || undefined,
        age: rest.age?.trim() || undefined,
        type: rest.type,
        species:
          rest.type === "other" && rest.species?.trim()
            ? rest.species.trim()
            : undefined,
      }));

      const breakdown: BreakdownItem[] =
        pricingResult?.breakdown ?? [];

      const result = await submitBooking({
        data: {
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          clientPhone: clientPhone.trim() || undefined,
          clientAddress: clientAddress.trim(),
          arrivalDate,
          arrivalTime,
          departureDate,
          departureTime,
          pets: petsData,
          isHoliday: pricingResult?.isHoliday ?? false,
          holidaySurchargeDays: pricingResult?.holidayDays ?? 0,
          holidaySurcharge: pricingResult?.holidaySurcharge ?? 0,
          totalPrice: pricingResult?.total ?? 0,
          priceBreakdown: breakdown,
          notes: notes.trim() || undefined,
          petAnxieties:
            petAnxietyOptions.filter((o) => o !== "None").join(", ") ||
            undefined,
          petAnxietyManifestation:
            petAnxietyOptions.some((o) => o !== "None") &&
            petAnxietyManifestation.trim()
              ? petAnxietyManifestation.trim()
              : undefined,
          petSleepsInBed,
          petQuirks: petQuirks.trim() || undefined,
          petNames: petNames || undefined,
          petDetails,
          hearAboutUs:
            hearAboutUs === "Other"
              ? hearAboutUsOther.trim()
              : hearAboutUs || undefined,
          referredBy:
            referredToUs === "yes" ? referredBy.trim() || undefined : undefined,
        },
      });

      if (result.success) {
        const submittedName = clientName.trim();
        setSubmitStatus("success");
        // Reset form
        setClientName("");
        setClientEmail("");
        setClientPhone("");
        setClientAddress("");
        setArrivalDate("");
        setArrivalTime("10:00");
        setDepartureDate("");
        setDepartureTime("16:00");
        setPets([newPetCard(1)]);
        setNextPetId(2);
        setNotes("");
        setHearAboutUs("");
        setHearAboutUsOther("");
        setReferredToUs("");
        setReferredBy("");
        setPetAnxietyOptions([]);
        setPetAnxietyManifestation("");
        setPetSleepsInBed("");
        setPetQuirks("");
        // Send the client to a warm confirmation page
        navigate({
          to: "/booking-confirmation",
          search: { name: submittedName },
        });
      } else {
        setSubmitStatus("error");
        setSubmitMessage(
          result.error || "Something went wrong. Please try again.",
        );
      }
    } catch (err) {
      setSubmitStatus("error");
      setSubmitMessage(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full border border-brand-tan/30 rounded-lg px-4 py-2 font-sans text-brand-brown bg-white placeholder:text-brand-tan/60 focus:outline-none focus:ring-2 focus:ring-brand-tan/40 focus:border-brand-tan";
  const labelClass =
    "block font-sans text-sm font-semibold tracking-wide uppercase text-brand-brown mb-1";

  return (
    <section id="booking" className="py-12 px-6 bg-brand-cream">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-sans text-2xl font-semibold tracking-wide uppercase text-center text-brand-brown mb-2">
          Request a Booking
        </h2>
        <p className="font-script text-xl text-center text-brand-tan mb-8">
          Tell us about your stay
        </p>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <ul className="list-disc list-inside font-sans text-sm text-red-700 space-y-1">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Success/error messages */}
        {submitStatus !== "idle" && (
          <div className="max-w-2xl mx-auto mb-6">
            <div
              className={`rounded-lg p-4 font-sans text-sm ${
                submitStatus === "success"
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {submitMessage}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Form ,  left side, takes 3/5 on desktop */}
          <div className="lg:col-span-3">
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-6 sm:p-8"
            >
              {/* Returning client: load saved pets */}
              <fieldset className="mb-6">
                <legend className="font-sans text-base font-semibold text-brand-brown mb-3">
                  Returning Client?
                </legend>
                <p className="font-sans text-sm text-brand-brown mb-3">
                  Have a return code? Enter it along with the email you booked
                  with and we'll fill in your pets for you.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="returnCodeEmail" className={labelClass}>
                      Email you booked with
                    </label>
                    <input
                      id="returnCodeEmail"
                      type="email"
                      value={returnCodeEmail}
                      onChange={(e) => setReturnCodeEmail(e.target.value)}
                      className={inputClass}
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="returnCode" className={labelClass}>
                      Return code
                    </label>
                    <input
                      id="returnCode"
                      type="text"
                      value={returnCode}
                      onChange={(e) =>
                        setReturnCode(e.target.value.toUpperCase())
                      }
                      className={`${inputClass} uppercase tracking-widest`}
                      placeholder="e.g. K4T7QM"
                      maxLength={8}
                    />
                  </div>
                </div>
                <button
                  id="loadProfileButton"
                  type="button"
                  onClick={handleLoadProfile}
                  disabled={loadProfileStatus === "loading"}
                  className="mt-3 font-sans text-sm px-4 py-2 rounded-full border transition-colors bg-brand-brown text-brand-cream border-brand-brown hover:bg-brand-brown-light disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadProfileStatus === "loading"
                    ? "Loading..."
                    : "Fill in my pets"}
                </button>
                {loadProfileStatus !== "idle" && (
                  <p
                    className={`mt-3 font-sans text-sm ${
                      loadProfileStatus === "success"
                        ? "text-green-700"
                        : loadProfileStatus === "error"
                          ? "text-red-700"
                          : "text-brand-tan"
                    }`}
                  >
                    {loadProfileMessage}
                  </p>
                )}
                <p className="font-sans text-xs text-brand-tan mt-3">
                  Your pet details are saved on file so your next booking is
                  quick. No account needed. Just book as a guest if you prefer,
                  it's always welcome.
                </p>
                <div className="mt-3">
                  <button
                    id="resendCodeButton"
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendStatus === "sending" || resendStatus === "sent"}
                    className="font-sans text-sm text-brand-brown underline underline-offset-2 hover:text-brand-brown-light disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendStatus === "sending"
                      ? "Sending..."
                      : resendStatus === "sent"
                        ? "Code sent"
                        : "Lost your code? Send it to me"}
                  </button>
                  {resendMessage && (
                    <p
                      className={`mt-2 font-sans text-sm ${
                        resendStatus === "error" ? "text-red-700" : "text-green-700"
                      }`}
                    >
                      {resendMessage}
                    </p>
                  )}
                </div>
              </fieldset>

              {/* Client Info */}
              <fieldset className="mb-6">
                <legend className="font-sans text-base font-semibold text-brand-brown mb-3">
                  Your Information
                </legend>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="clientName" className={labelClass}>
                      Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="clientName"
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className={inputClass}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="clientEmail" className={labelClass}>
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="clientEmail"
                      type="email"
                      required
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className={inputClass}
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="clientPhone" className={labelClass}>
                      Phone <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="clientPhone"
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className={inputClass}
                      placeholder="(304) 555-0123"
                    />
                  </div>
                  <div>
                    <label htmlFor="clientAddress" className={labelClass}>
                      Home Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="clientAddress"
                      type="text"
                      required
                      autoComplete="street-address"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      className={inputClass}
                      placeholder="123 Main St, Morgantown, WV 26505"
                    />
                    <p className="font-sans text-xs text-brand-tan mt-2">
                      Where will your pet be staying? We will confirm any travel
                      arrangements when we respond to your request.
                    </p>
                  </div>
                </div>
              </fieldset>

              {/* How they heard + referral */}
              <fieldset className="mb-6">
                <legend className="font-sans text-base font-semibold text-brand-brown mb-3">
                  Tell Us About You
                </legend>
                <div className="space-y-5">
                  {/* Field A: how did you hear about us (required) */}
                  <div>
                    <label className={labelClass}>
                      How did you hear about us?{" "}
                      <span className="text-red-400">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {HEAR_ABOUT_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setHearAboutUs(opt)}
                          className={`font-sans text-sm px-4 py-2 rounded-full border transition-colors ${
                            hearAboutUs === opt
                              ? "bg-brand-brown text-brand-cream border-brand-brown"
                              : "bg-white text-brand-brown border-brand-tan/30 hover:border-brand-tan"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {hearAboutUs === "Other" && (
                      <div className="mt-3">
                        <label htmlFor="hearAboutUsOther" className={labelClass}>
                          Please tell us <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="hearAboutUsOther"
                          type="text"
                          value={hearAboutUsOther}
                          onChange={(e) => setHearAboutUsOther(e.target.value)}
                          className={inputClass}
                          placeholder="e.g. Yard sign, event, family member..."
                        />
                      </div>
                    )}
                  </div>

                  {/* Field B: were-you-referred yes/no */}
                  <div>
                    <label className={`${labelClass} mb-1`}>
                      Were you referred to us?
                    </label>
                    <div className="mt-1 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer font-sans text-sm text-brand-brown">
                        <input
                          type="radio"
                          name="referredToUs"
                          value="yes"
                          checked={referredToUs === "yes"}
                          onChange={() => setReferredToUs("yes")}
                          className="h-4 w-4 rounded-full border-brand-tan/40 accent-brand-tan focus:ring-brand-tan/40"
                        />
                        Yes
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-sans text-sm text-brand-brown">
                        <input
                          type="radio"
                          name="referredToUs"
                          value="no"
                          checked={referredToUs === "no"}
                          onChange={() => setReferredToUs("no")}
                          className="h-4 w-4 rounded-full border-brand-tan/40 accent-brand-tan focus:ring-brand-tan/40"
                        />
                        No
                      </label>
                    </div>
                  </div>

                  {/* Field C: conditional reveal, only when Yes is selected */}
                  {referredToUs === "yes" && (
                    <div>
                      <label htmlFor="referredBy" className={labelClass}>
                        Who referred you? First and last name
                      </label>
                      <input
                        id="referredBy"
                        type="text"
                        value={referredBy}
                        onChange={(e) => setReferredBy(e.target.value)}
                        className={inputClass}
                        placeholder="Jane Smith"
                      />
                    </div>
                  )}
                </div>
              </fieldset>

              {/* Dates */}
              <fieldset className="mb-6">
                <legend className="font-sans text-base font-semibold text-brand-brown mb-3">
                  Stay Dates
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="arrivalDate" className={labelClass}>
                      Arrival Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="arrivalDate"
                      type="date"
                      required
                      min={todayString()}
                      value={arrivalDate}
                      onChange={(e) => setArrivalDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="arrivalTime" className={labelClass}>
                      Arrival Time <span className="text-red-400">*</span>
                    </label>
                    <select
                      id="arrivalTime"
                      required
                      value={arrivalTime}
                      onChange={(e) => setArrivalTime(e.target.value)}
                      className={inputClass}
                    >
                      {generateTimeOptions().map((t) => (
                        <option key={t} value={t}>
                          {formatTime12h(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="departureDate" className={labelClass}>
                      Departure Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="departureDate"
                      type="date"
                      required
                      min={arrivalDate || todayString()}
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="departureTime" className={labelClass}>
                      Departure Time <span className="text-red-400">*</span>
                    </label>
                    <select
                      id="departureTime"
                      required
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className={inputClass}
                    >
                      {generateTimeOptions().map((t) => (
                        <option key={t} value={t}>
                          {formatTime12h(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="font-sans text-xs text-brand-tan mt-2">
                  Arrival before 3pm = full day rate. Departure after 3pm = full
                  day rate.
                </p>
              </fieldset>



              {/* Pets */}
              <fieldset className="mb-6">
                <legend className="font-sans text-base font-semibold text-brand-brown mb-3">
                  Your Pets
                </legend>
                <p className="font-sans text-xs text-brand-tan mb-4">
                  Puppies and kittens are dogs and cats 2 years old or
                  younger.
                </p>
                <div className="space-y-4">
                  {pets.map((pet, idx) => (
                    <div
                      key={pet.id}
                      className="border border-brand-tan/20 rounded-lg p-4 bg-brand-cream/30"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-sans text-sm font-semibold text-brand-brown">
                          Pet {idx + 1}
                        </span>
                        {pets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePet(pet.id)}
                            className="font-sans text-xs text-red-400 hover:text-red-600 underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor={`petName-${pet.id}`}
                            className={labelClass}
                          >
                            Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            id={`petName-${pet.id}`}
                            type="text"
                            value={pet.name}
                            onChange={(e) =>
                              updatePet(pet.id, "name", e.target.value)
                            }
                            className={inputClass}
                            placeholder="Bella"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`petBreed-${pet.id}`}
                            className={labelClass}
                          >
                            Breed
                          </label>
                          <input
                            id={`petBreed-${pet.id}`}
                            type="text"
                            value={pet.breed}
                            onChange={(e) =>
                              updatePet(pet.id, "breed", e.target.value)
                            }
                            className={inputClass}
                            placeholder="Labrador Retriever"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`petAge-${pet.id}`}
                            className={labelClass}
                          >
                            Age
                          </label>
                          <input
                            id={`petAge-${pet.id}`}
                            type="text"
                            value={pet.age}
                            onChange={(e) =>
                              updatePet(pet.id, "age", e.target.value)
                            }
                            className={inputClass}
                            placeholder="e.g. 3 years"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`petType-${pet.id}`}
                            className={labelClass}
                          >
                            Type
                          </label>
                          <select
                            id={`petType-${pet.id}`}
                            value={pet.type}
                            onChange={(e) =>
                              updatePet(pet.id, "type", e.target.value)
                            }
                            className={inputClass}
                          >
                            {Object.entries(PET_TYPE_LABELS).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      </div>
                      {pet.type === "other" && (
                        <div className="mt-4">
                          <label
                            htmlFor={`petSpecies-${pet.id}`}
                            className={labelClass}
                          >
                            Species
                          </label>
                          <input
                            id={`petSpecies-${pet.id}`}
                            type="text"
                            value={pet.species}
                            onChange={(e) =>
                              updatePet(pet.id, "species", e.target.value)
                            }
                            className={inputClass}
                            placeholder="Guinea Pig, Bird, Rabbit..."
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addPet}
                  className="mt-4 font-sans text-sm text-brand-tan hover:text-brand-brown underline"
                >
                  + Add another pet
                </button>
              </fieldset>

              {/* About Your Pets */}
              <fieldset className="mb-6">
                <legend className="font-sans text-base font-semibold text-brand-brown mb-3">
                  About Your Pets
                </legend>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>
                      Do any of your pets deal with anxiety or triggers?
                    </label>
                    <div className="mt-2 space-y-2">
                      {ANXIETY_OPTIONS.map((option) => (
                        <label
                          key={option}
                          className="flex items-center gap-2 cursor-pointer font-sans text-sm text-brand-brown"
                        >
                          <input
                            type="checkbox"
                            checked={petAnxietyOptions.includes(option)}
                            onChange={() => toggleAnxietyOption(option)}
                            className="h-4 w-4 rounded border-brand-tan/40 accent-brand-tan focus:ring-brand-tan/40"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                    {petAnxietyOptions.some((o) => o !== "None") && (
                      <div className="mt-3">
                        <label
                          htmlFor="petAnxietyManifestation"
                          className={labelClass}
                        >
                          How does it show up?
                        </label>
                        <textarea
                          id="petAnxietyManifestation"
                          rows={3}
                          value={petAnxietyManifestation}
                          onChange={(e) =>
                            setPetAnxietyManifestation(e.target.value)
                          }
                          className={`${inputClass} resize-y`}
                          placeholder="For example: destroying furniture, digging into carpets or furniture, aggression, excessive barking at the windows or TV."
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>
                      Will your pets need to sleep in bed with us?
                    </label>
                    <div className="mt-2 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer font-sans text-sm text-brand-brown">
                        <input
                          type="radio"
                          name="petSleepsInBed"
                          value="yes"
                          checked={petSleepsInBed === "yes"}
                          onChange={() => setPetSleepsInBed("yes")}
                          className="h-4 w-4 rounded-full border-brand-tan/40 accent-brand-tan focus:ring-brand-tan/40"
                        />
                        Yes
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-sans text-sm text-brand-brown">
                        <input
                          type="radio"
                          name="petSleepsInBed"
                          value="no"
                          checked={petSleepsInBed === "no"}
                          onChange={() => setPetSleepsInBed("no")}
                          className="h-4 w-4 rounded-full border-brand-tan/40 accent-brand-tan focus:ring-brand-tan/40"
                        />
                        No
                      </label>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="petQuirks" className={labelClass}>
                      Quirks &amp; joys
                    </label>
                    <textarea
                      id="petQuirks"
                      rows={3}
                      value={petQuirks}
                      onChange={(e) => setPetQuirks(e.target.value)}
                      className={`${inputClass} resize-y`}
                      placeholder="Peanut butter, ice cubes, playing with bubbles, etc."
                    />
                  </div>
                </div>
              </fieldset>

              {/* Holiday */}
              <fieldset className="mb-6">
                <legend className="font-sans text-base font-semibold text-brand-brown mb-3">
                  Holiday Stay
                </legend>
                <div className="p-3 bg-brand-cream/50 rounded-lg border border-brand-tan/20">
                  <p className="font-sans text-sm text-brand-brown">
                    {pricingResult && pricingResult.isHoliday
                      ? "This stay falls on a recognized holiday, so the $15 per day holiday rate applies automatically."
                      : "Holiday rates are applied automatically when your stay falls on a recognized holiday."}
                  </p>
                  <p className="font-sans text-xs text-brand-tan mt-1.5">
                    Recognized holidays:{" "}
                    {RECOGNIZED_HOLIDAYS.join(", ")}
                  </p>
                </div>
              </fieldset>

              {/* Notes */}
              <fieldset className="mb-6">
                <legend className="font-sans text-base font-semibold text-brand-brown mb-3">
                  Additional Notes
                </legend>
                <textarea
                  id="notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${inputClass} resize-y`}
                  placeholder="Special care instructions, medications, routines, etc."
                />
              </fieldset>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand-brown text-brand-cream font-sans font-semibold tracking-wide uppercase py-3 px-6 rounded-lg hover:bg-brand-brown-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Submitting..." : "Submit Booking Request"}
              </button>
            </form>
          </div>

          {/* Price card ,  right side, takes 2/5 on desktop, sticky */}
          <div className="lg:col-span-2 lg:sticky lg:top-8">
            <PriceCalculator
              result={pricingResult}
              hasArrival={arrivalDate !== ""}
              hasDeparture={departureDate !== ""}
              hasNamedPets={pets.some((p) => p.name.trim().length > 0)}
              datesInvalid={
                arrivalDate !== "" &&
                departureDate !== "" &&
                new Date(departureDate + "T00:00:00") <=
                  new Date(arrivalDate + "T00:00:00")
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Generate 30-minute interval time options from 00:00 to 23:30 */
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      options.push(`${hh}:${mm}`);
    }
  }
  return options;
}

/** Convert "HH:MM" to 12-hour display like "10:00 AM" */
function formatTime12h(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${ampm}`;
}
