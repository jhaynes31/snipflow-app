import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Send each goals form 48 hours ahead, let go of unpaid drop-in holds, and
// close out sessions that ended.
crons.interval("upkeep", { minutes: 30 }, internal.upkeep.tick);

export default crons;
