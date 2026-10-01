import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// TradingView widgets load a script from s3.tradingview.com which then renders iframes.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://s3.tradingview.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.tradingview.com https://*.tradingview-widget.com",
  "frame-src https://*.tradingview.com https://*.tradingview-widget.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp.replace(/\s{2,}/g, " ") },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image; ignored by Vercel.
  output: "standalone",
  poweredByHeader: false,
  // Hide the floating Next.js dev badge.
  devIndicators: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "static2.finnhub.io" }],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
