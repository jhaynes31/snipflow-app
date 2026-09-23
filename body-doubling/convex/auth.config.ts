/**
 * Tells the Convex backend to trust JWTs minted by Convex Auth (the Password
 * provider in `auth.ts`). Without this file `getAuthUserId` always returns
 * null, so every signed-in query behaves as signed out.
 */
const authConfig = {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
