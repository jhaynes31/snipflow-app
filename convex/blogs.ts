import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("blogs").order("desc").collect();
  },
});

export const get = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("blogs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const seed = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    excerpt: v.string(),
    author: v.string(),
    publishedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("blogs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    
    return await ctx.db.insert("blogs", args);
  },
});

export const remove = mutation({
  args: { id: v.id("blogs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
