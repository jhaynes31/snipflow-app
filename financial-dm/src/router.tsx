import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

/**
 * After a deploy, a tab that still has the old build tries to load page
 * chunks that no longer exist, and a click on a tab then hangs. Vite
 * announces that failure; one reload fetches the new build and the click
 * works again.
 */
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault();
    window.location.reload();
  });
}

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultNotFoundComponent: () => <p>Not found</p>,
  });
}
