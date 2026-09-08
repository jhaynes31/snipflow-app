const DEPLOYMENT = "https://agreeable-ox-622.convex.cloud";

async function seed() {
  // Call the mutation via Convex HTTP API
  const res = await fetch(`${DEPLOYMENT}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: "seedReviews",
      args: {},
    }),
  });
  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Result:", JSON.stringify(data, null, 2));
}

seed();
