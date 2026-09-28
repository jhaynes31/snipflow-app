import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import ErrorScreen, { NotFoundScreen } from "~/components/ErrorScreen";

import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "The Financial DM: Roll for Initiative" },
    ],
    links: [
      {
        rel: "preload",
        href: "/fonts/medievalsharp-latin.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  // The document shell wraps every page, including the error and not-found
  // screens, so a crash never renders without <html> and the stylesheet.
  shellComponent: RootDocument,
  notFoundComponent: NotFoundScreen,
  errorComponent: (props) => <ErrorScreen {...props} />,
  component: RootComponent,
});

function RootComponent() {
  return <Outlet />;
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
