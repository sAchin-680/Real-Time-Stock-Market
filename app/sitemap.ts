import type { MetadataRoute } from "next";

const base = process.env.BETTER_AUTH_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-10-01");
  return ["/sign-in", "/sign-up", "/privacy", "/terms", "/disclaimer"].map((path) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: path === "/sign-in" ? 1 : 0.5,
  }));
}
