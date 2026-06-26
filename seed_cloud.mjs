import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "fs";
import { join } from "path";

const convexUrl = "https://snipflow-pearl.convex.cloud";
const client = new ConvexHttpClient(convexUrl);

async function seedBlogs() {
  // Read the seed data from Phase 1
  const seedDataPath1 = "/home/team/shared/content-calendar/seed_data.json";
  const seedData1 = JSON.parse(readFileSync(seedDataPath1, "utf-8"));

  console.log(`Seeding ${seedData1.length} Phase 1 blog posts to ${convexUrl}...`);

  for (const post of seedData1) {
    try {
      await client.mutation("blogs:seed", {
        title: post.title,
        slug: post.slug,
        content: post.body,
        excerpt: post.body.substring(0, 160) + "...",
        author: "SnipFlow Team",
        publishedAt: new Date(post.pub_date).getTime(),
      });
      console.log(`✓ Seeded Phase 1: ${post.slug}`);
    } catch (error) {
    console.error(`✗ Error seeding Phase 1 ${post.slug}:`, error);
    }
  }


  // Phase 2 posts
  const phase2Path = "/home/team/shared/content-calendar-phase2/";
  console.log(`Seeding Phase 2 blog posts from ${phase2Path}...`);
  
  // Day 31 to 45
  for (let day = 31; day <= 45; day++) {
    try {
      const content = readFileSync(join(phase2Path, `day-${day}.md`), "utf-8");
      const lines = content.split('\n');
      const title = lines.find(l => l.startsWith('# '))?.replace('# ', '') || `Day ${day} Post`;
      const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
      
      await client.mutation("blogs:seed", {
        title: title,
        slug: slug,
        content: content,
        excerpt: content.substring(0, 160).replace(/#/g, '') + "...",
        author: "SnipFlow Team",
        publishedAt: Date.now() - (45 - day) * 24 * 60 * 60 * 1000,
      });
      console.log(`✓ Seeded Phase 2: ${slug}`);
    } catch (error) {
      console.error(`✗ Error seeding Phase 2 Day ${day}: ${error.message}`);
    }
  }

  console.log(`\nSeeding complete.`);
}

seedBlogs().catch(console.error);
