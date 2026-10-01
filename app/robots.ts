import type { MetadataRoute } from "next";

const base = process.env.BETTER_AUTH_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/sign-in", "/sign-up", "/privacy", "/terms", "/disclaimer"], disallow: ["/api/", "/portfolio", "/watchlist", "/alerts", "/stocks/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
