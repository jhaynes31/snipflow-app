import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "fs";

const convexUrl = "https://happy-otter-123.convex.cloud";
const client = new ConvexHttpClient(convexUrl);

async function seedBlogs() {
  const seedDataPath = "/home/team/shared/seed_data_all_45.json";
  const seedData = JSON.parse(readFileSync(seedDataPath, "utf-8"));

  console.log(`Seeding ${seedData.length} blog posts to PRODUCTION (${convexUrl})...`);

  let successCount = 0;
  let errorCount = 0;

  for (const post of seedData) {
    try {
      const result = await client.mutation("blogs:seed", {
        title: post.title,
        slug: post.slug,
        content: post.body,
        excerpt: post.body.substring(0, 160) + "...",
        author: "SnipFlow Team",
        publishedAt: new Date(post.pub_date).getTime(),
      });
      console.log(`✓ Seeded: ${post.slug} (Day ${post.day})`);
      successCount++;
    } catch (error) {
      console.error(`✗ Error seeding ${post.slug}:`, error);
      errorCount++;
    }
  }

  console.log(`\nSeeding complete: ${successCount} successful, ${errorCount} errors`);
}

seedBlogs().catch(console.error);
