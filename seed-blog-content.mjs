import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "fs";
import { join } from "path";

const convexUrl = "http://127.0.0.1:3210";
const client = new ConvexHttpClient(convexUrl);

async function seedBlogs() {
  // Read the seed data
  const seedDataPath = join(process.cwd(), "../content-calendar/seed_data.json");
  const seedData = JSON.parse(readFileSync(seedDataPath, "utf-8"));

  console.log(`Seeding ${seedData.length} blog posts...`);

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
      console.log(`✓ Seeded: ${post.slug} (${post.day})`);
      successCount++;
    } catch (error) {
      console.error(`✗ Error seeding ${post.slug}: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\nSeeding complete: ${successCount} successful, ${errorCount} errors`);
}

seedBlogs().catch(console.error);