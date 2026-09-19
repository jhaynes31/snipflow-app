import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import type { Id, TableNames } from "../_generated/dataModel";

/**
 * One-time move of the standalone Every Box's data into The Shire. Run by
 * scripts/import-every-box.mjs during the Vercel build, never from a screen.
 *
 * Rows arrive as plain JSON straight from the old deployment's snapshot.
 * Their old ids can't be reused (ids are deployment-specific), so every
 * row is inserted fresh and every link between rows is rebuilt through an
 * old-id to new-id map. Partners are attached to Shire profiles by the
 * email their old account used. Everything happens in one transaction:
 * either it all lands or nothing changes.
 */

type Row = Record<string, unknown>;
const row = v.any();

function num(x: unknown): number | undefined {
  return typeof x === "number" ? x : undefined;
}
function str(x: unknown): string | undefined {
  return typeof x === "string" ? x : undefined;
}

export const importAll = internalMutation({
  args: {
    households: v.array(row),
    partners: v.array(row),
    categories: v.array(row),
    tendingEvents: v.array(row),
    categoryNotes: v.array(row),
    weeklyReviews: v.array(row),
    commitments: v.array(row),
    /** Old users table, reduced to id and email, for linking partners to profiles. */
    legacyUsers: v.array(v.object({ legacyUserId: v.string(), email: v.string() })),
  },
  handler: async (ctx, args) => {
    // Start clean: anything created in The Shire's Every Box before the copy goes.
    for (const table of ["ebTendingEvents", "ebCategoryNotes", "ebWeeklyReviews", "ebCommitments", "ebCategories", "ebPartners", "ebHouseholds"] as const) {
      for (const doc of await ctx.db.query(table).collect()) await ctx.db.delete(doc._id);
    }

    const households = new Map<string, Id<"ebHouseholds">>();
    const partners = new Map<string, Id<"ebPartners">>();
    const categories = new Map<string, Id<"ebCategories">>();
    const mapped = <T extends TableNames>(map: Map<string, Id<T>>, oldId: unknown, what: string): Id<T> => {
      const id = map.get(String(oldId));
      if (!id) throw new ConvexError(`Import stopped: a ${what} points at a row that isn't in the snapshot (${String(oldId)}).`);
      return id;
    };

    for (const h of args.households as Row[]) {
      const id = await ctx.db.insert("ebHouseholds", {
        name: str(h.name) ?? "Our home",
        activeTheme: "village",
        unlockedThemes: [],
        isPremium: false,
        inviteCode: str(h.inviteCode) ?? "MOVED",
        createdBy: h.createdBy === undefined ? undefined : String(h.createdBy),
        createdAt: num(h.createdAt) ?? Date.now(),
        lastReviewAt: num(h.lastReviewAt),
        visibility: "shared",
      });
      households.set(String(h._id), id);
    }

    const users = await ctx.db.query("users").collect();
    const profiles = await ctx.db.query("profiles").collect();
    const linked: string[] = [];
    const unmatched: string[] = [];
    for (const p of args.partners as Row[]) {
      const legacyUserId = p.userId === undefined ? undefined : String(p.userId);
      const email = args.legacyUsers.find((u) => u.legacyUserId === legacyUserId)?.email.toLowerCase();
      const user = email ? users.find((u) => u.email?.toLowerCase() === email) : undefined;
      const profile = user ? profiles.find((pr) => pr.userId === user._id) : undefined;
      const displayName = profile?.displayName ?? str(p.displayName) ?? "Partner";
      const id = await ctx.db.insert("ebPartners", {
        householdId: mapped(households, p.householdId, "partner"),
        profileId: profile?._id,
        legacyUserId,
        displayName,
        joinedAt: num(p.joinedAt) ?? Date.now(),
        visibility: "shared",
      });
      partners.set(String(p._id), id);
      (profile ? linked : unmatched).push(`${displayName} (${email ?? "no email"})`);
    }

    const partnerList = (ids: unknown): Id<"ebPartners">[] | undefined =>
      Array.isArray(ids) ? ids.map((x) => mapped(partners, x, "box")) : undefined;

    for (const c of args.categories as Row[]) {
      const id = await ctx.db.insert("ebCategories", {
        householdId: mapped(households, c.householdId, "box"),
        name: str(c.name) ?? "Box",
        icon: str(c.icon) ?? "📦",
        idealCadenceDays: num(c.idealCadenceDays) ?? 7,
        tenderId: c.tenderId === undefined ? undefined : mapped(partners, c.tenderId, "box"),
        tenderIds: partnerList(c.tenderIds),
        area: str(c.area),
        lastTendedAt: num(c.lastTendedAt),
        sortOrder: num(c.sortOrder) ?? 0,
        createdAt: num(c.createdAt) ?? Date.now(),
        archivedAt: num(c.archivedAt),
        visibility: "shared",
      });
      categories.set(String(c._id), id);
    }

    for (const e of args.tendingEvents as Row[]) {
      await ctx.db.insert("ebTendingEvents", {
        householdId: mapped(households, e.householdId, "tending entry"),
        categoryId: mapped(categories, e.categoryId, "tending entry"),
        partnerId: mapped(partners, e.partnerId, "tending entry"),
        tendedAt: num(e.tendedAt) ?? Date.now(),
        note: str(e.note),
        visibility: "shared",
      });
    }

    for (const n of args.categoryNotes as Row[]) {
      await ctx.db.insert("ebCategoryNotes", {
        householdId: mapped(households, n.householdId, "note"),
        categoryId: mapped(categories, n.categoryId, "note"),
        partnerId: mapped(partners, n.partnerId, "note"),
        text: str(n.text) ?? "",
        createdAt: num(n.createdAt) ?? Date.now(),
        visibility: "shared",
      });
    }

    for (const r of args.weeklyReviews as Row[]) {
      const acks = Array.isArray(r.acknowledgements) ? (r.acknowledgements as Row[]) : [];
      await ctx.db.insert("ebWeeklyReviews", {
        householdId: mapped(households, r.householdId, "review"),
        completedBy: mapped(partners, r.completedBy, "review"),
        completedAt: num(r.completedAt) ?? Date.now(),
        acknowledgements: acks
          .filter((a) => categories.has(String(a.categoryId)))
          .map((a) => ({
            categoryId: mapped(categories, a.categoryId, "review"),
            answer: (["yes", "partial", "no", "skipped"].includes(String(a.answer)) ? String(a.answer) : "skipped") as "yes" | "partial" | "no" | "skipped",
            stageAtReview: num(a.stageAtReview) ?? 1,
          })),
        visibility: "shared",
      });
    }

    for (const c of args.commitments as Row[]) {
      const status = String(c.status);
      await ctx.db.insert("ebCommitments", {
        householdId: mapped(households, c.householdId, "commitment"),
        title: str(c.title) ?? "Commitment",
        proposedBy: mapped(partners, c.proposedBy, "commitment"),
        assignedTo: c.assignedTo === undefined ? undefined : mapped(partners, c.assignedTo, "commitment"),
        assignedToIds: partnerList(c.assignedToIds),
        status: (["proposed", "agreed", "active", "done", "declined"].includes(status) ? status : "proposed") as
          | "proposed"
          | "agreed"
          | "active"
          | "done"
          | "declined",
        createdAt: num(c.createdAt) ?? Date.now(),
        agreedAt: num(c.agreedAt),
        activatedAt: num(c.activatedAt),
        doneAt: num(c.doneAt),
        targetWindowDays: num(c.targetWindowDays),
        lastTendedAt: num(c.lastTendedAt),
        visibility: "shared",
      });
    }

    return {
      inserted: {
        ebHouseholds: households.size,
        ebPartners: partners.size,
        ebCategories: categories.size,
        ebTendingEvents: args.tendingEvents.length,
        ebCategoryNotes: args.categoryNotes.length,
        ebWeeklyReviews: args.weeklyReviews.length,
        ebCommitments: args.commitments.length,
      },
      linked,
      unmatched,
    };
  },
});

/** Row counts per Every Box table, for the before/after check. */
export const counts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [households, partners, categories, events, notes, reviews, commitments] = await Promise.all([
      ctx.db.query("ebHouseholds").collect(),
      ctx.db.query("ebPartners").collect(),
      ctx.db.query("ebCategories").collect(),
      ctx.db.query("ebTendingEvents").collect(),
      ctx.db.query("ebCategoryNotes").collect(),
      ctx.db.query("ebWeeklyReviews").collect(),
      ctx.db.query("ebCommitments").collect(),
    ]);
    return {
      ebHouseholds: households.length,
      ebPartners: partners.length,
      ebCategories: categories.length,
      ebTendingEvents: events.length,
      ebCategoryNotes: notes.length,
      ebWeeklyReviews: reviews.length,
      ebCommitments: commitments.length,
      partnersLinked: partners.filter((p) => p.profileId).length,
    };
  },
});
