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
// The Field Guide: refresh the two feeds' headlines before the morning reports.
crons.daily("metamorphosis: field guide feeds", { hourUTC: 12, minuteUTC: 40 }, internal.metamorphosis.feeds.tick);
// Every Box: "remind me about this box", checked once an hour so each person gets theirs at the hour they chose.
crons.hourly("every box: box reminders", { minuteUTC: 5 }, internal.everyBox.reminders.tick);
// The Lookout: his scheduled job search, only when he turned it on (daily or weekly; the action checks which).
crons.daily("lookout: scheduled job search", { hourUTC: 11, minuteUTC: 15 }, internal.lookout.discover.tick);
// Pip (the Friend): a nudge at most once a day, mid-afternoon in the US; weekly headlines from the other places on Monday morning.
crons.daily("friend: pip reaches out", { hourUTC: 20, minuteUTC: 10 }, internal.friend.entries.nudgeTick);
crons.weekly("friend: weekly headlines", { dayOfWeek: "monday", hourUTC: 12, minuteUTC: 30 }, internal.friend.headlines.weekly);
// The Loop Map: tripwire check-ins at each person's own risky times, checked hourly.
crons.hourly("loops: tripwire check-ins", { minuteUTC: 12 }, internal.loops.entries.tripwireTick);
export default crons;
