/**
 * One place that turns a thrown error into words a person can read. The
 * real error goes to the server log (Vercel > Logs) with a context tag so
 * whoever is debugging can find it; the caller gets a calm sentence with
 * no stack traces, table names, or connection strings in it.
 */
export const FRIENDLY_ERROR = "Something went wrong on our side. Please try again in a moment.";

export function friendlyError(context: string, e: unknown, message: string = FRIENDLY_ERROR): string {
  console.error(`[${context}]`, e);
  return message;
}
