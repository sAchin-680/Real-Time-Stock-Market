import type { Metadata } from "next";
// Self-hosted fonts: builds never depend on fetching from Google Fonts.
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import { Toaster } from "@/components/ui/sonner";
import { BRAND } from "@/components/brand/Logo";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description:
    "Tickline streams live prices into your portfolio: tick-by-tick P&L, FIFO cost basis, allocation, risk, price alerts and market news in one terminal.",
  applicationName: BRAND.name,
  metadataBase: new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000"),
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: "Live P&L, allocation, risk and price alerts, streamed in real time.",
    type: "website",
    siteName: BRAND.name,
  },
};

// No colorScheme here: a dark scheme makes browsers paint cross-origin TradingView iframes opaque white.
export const viewport = { themeColor: "#0b0b0d" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        {children}
        <Toaster theme="dark" position="bottom-right" closeButton />
      </body>
    </html>
  );
}
