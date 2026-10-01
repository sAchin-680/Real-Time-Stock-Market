import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { BRAND } from "@/components/brand/Logo";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

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
export const viewport = { themeColor: "#07090d" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${plexSans.variable} ${plexMono.variable} font-sans`}>
        {children}
        <Toaster theme="dark" position="bottom-right" closeButton />
      </body>
    </html>
  );
}
