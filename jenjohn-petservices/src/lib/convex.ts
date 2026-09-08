import { ConvexClient } from "convex/browser";

let client: ConvexClient | null = null;

export function getConvexClient(): ConvexClient | null {
  const deploymentUrl = process.env.CONVEX_DEPLOYMENT_URL;
  if (!deploymentUrl) {
    console.warn("CONVEX_DEPLOYMENT_URL not set ,  Convex client unavailable");
    return null;
  }
  if (!client) {
    client = new ConvexClient(deploymentUrl);
  }
  return client;
}

export function getConvexUrl(): string | undefined {
  return process.env.CONVEX_DEPLOYMENT_URL;
}
