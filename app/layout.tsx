import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import './globals.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Signalist — Portfolio & Market Terminal", template: "%s · Signalist" },
  description:
    "Track your portfolio in real time: live P&L, FIFO cost basis, sector allocation, risk metrics, price alerts and market news.",
  applicationName: "Signalist",
  metadataBase: new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000"),
  openGraph: {
    title: "Signalist — Portfolio & Market Terminal",
    description: "Live P&L, allocation, risk and price alerts for your portfolio.",
    type: "website",
  },
};

export const viewport = { themeColor: "#050505", colorScheme: "dark" as const };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster theme="dark" position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
