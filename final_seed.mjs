import { execSync } from "child_process";
import { readFileSync } from "fs";

const convexUrl = "https://precious-hawk-617.convex.cloud";
const seedData = JSON.parse(readFileSync("/home/team/shared/seed_data_all_45.json", "utf-8"));

console.log(`Seeding ${seedData.length} posts to ${convexUrl}...`);

for (const post of seedData) {
  const args = JSON.stringify({
    title: post.title,
    slug: post.slug,
    content: post.body,
    excerpt: post.body.substring(0, 160).replace(/#/g, '').trim() + "...",
    author: "SnipFlow Team",
    publishedAt: new Date(post.pub_date).getTime()
  });

  try {
    const output = execSync(`npx convex run blogs:seed '${args.replace(/'/g, "'\\''")}' --url ${convexUrl}`).toString().trim();
    console.log(`✓ Seeded: ${post.slug} (ID: ${output})`);
  } catch (error) {
    console.error(`✗ Failed: ${post.slug}`, error.message);
  }
}

console.log("Seeding complete.");
