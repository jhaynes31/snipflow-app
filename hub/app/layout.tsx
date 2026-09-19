import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/core/auth/ConvexClientProvider";
import { APP_DESCRIPTION, APP_DISPLAY_NAME } from "@/core/config";
import { HubShell } from "@/core/shell/HubShell";
import { backgroundCss } from "@/core/theme/backgrounds";
import { cssVariables, LIGHT, DARK } from "@/core/theme/tokens";

const heading = Fraunces({ variable: "--font-heading", subsets: ["latin"], display: "swap" });
const body = Nunito({ variable: "--font-body", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: APP_DISPLAY_NAME, template: `%s · ${APP_DISPLAY_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_DISPLAY_NAME,
  appleWebApp: { capable: true, title: APP_DISPLAY_NAME, statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  robots: { index: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: LIGHT.background },
    { media: "(prefers-color-scheme: dark)", color: DARK.background },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} h-full`} data-theme="system">
      <head>
        {/* Every color on every screen comes from core/theme/tokens.ts. */}
        <style dangerouslySetInnerHTML={{ __html: cssVariables() + "\n" + backgroundCss() }} />
      </head>
      <body className="min-h-full">
        <ConvexClientProvider>
          <HubShell>{children}</HubShell>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
