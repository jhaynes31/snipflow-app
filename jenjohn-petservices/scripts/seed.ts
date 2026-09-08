const DEPLOYMENT = process.env.CONVEX_DEPLOYMENT_URL || "";
const DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY || "";
if (!DEPLOYMENT || !DEPLOY_KEY) {
  console.error("Set CONVEX_DEPLOYMENT_URL and CONVEX_DEPLOY_KEY before seeding.");
  process.exit(1);
}

async function seed() {
  // Call the mutation via Convex HTTP API
  const res = await fetch(`${DEPLOYMENT}/api/mutation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Convex ${DEPLOY_KEY}`,
    },
    body: JSON.stringify({
      path: "mutations:seedReviews",
      args: {},
    }),
  });
  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Result:", JSON.stringify(data, null, 2));
}

seed();
