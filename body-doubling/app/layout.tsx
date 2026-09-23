import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";
import { Provider } from "@/components/Provider";
import { Nav } from "@/components/Nav";
import { COMMUNITY_NAME, TAGLINE } from "@/lib/config";

const heading = Fraunces({ variable: "--font-heading", subsets: ["latin"], display: "swap" });
const body = Nunito({ variable: "--font-body", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: COMMUNITY_NAME, template: `%s · ${COMMUNITY_NAME}` },
  description: TAGLINE,
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body className="min-h-screen">
        <Provider>
          <Nav />
          <main className="wrap pb-16 pt-6">{children}</main>
        </Provider>
      </body>
    </html>
  );
}
