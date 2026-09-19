import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Seasons: once a day, write any report that is due (Mondays for weekly and
 * every-other-week seasons, the 1st for monthly and for "our season").
 * 13:00 UTC is morning across the US, so reports are there over coffee.
 */
const crons = cronJobs();
crons.daily("seasons: write due reports", { hourUTC: 13, minuteUTC: 0 }, internal.seasons.generate.tick);
crons.daily("metamorphosis: the mentor's monthly letter", { hourUTC: 13, minuteUTC: 20 }, internal.metamorphosis.letter.tick);
export default crons;
