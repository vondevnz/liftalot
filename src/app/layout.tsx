import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

/**
 * The brand wordmark is Sora 700. next/font self-hosts it at build time, so
 * there is no request to Google at runtime and no layout shift from a late
 * webfont.
 *
 * Display only — headings and the wordmark. Body copy, numeric inputs and the
 * dense list rows stay on the system stack, which is better tuned for small
 * sizes on each platform than any webfont we would ship.
 */
const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-sora",
  display: "swap",
});

/**
 * Absolute base for Open Graph images. Vercel exposes the production domain at
 * build time; without this, share previews point at localhost.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Liftalot",
  description: "A lift tracker that rewards moving every day.",
  applicationName: "Liftalot",
  // The SVG comes first so modern browsers take the crisp one; the 32px PNG is
  // the fallback, and the 2-dot simplification is used at favicon sizes where
  // the full 4-dot mark turns to mush.
  icons: {
    icon: [
      { url: "/brand/liftalot-favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon-180.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Liftalot",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  width: "device-width",
  initialScale: 1,
  // The logging screen is full of numeric inputs; letting iOS zoom into them
  // and never zoom back out makes the whole session feel broken.
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={sora.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
