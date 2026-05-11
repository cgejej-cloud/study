import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pingpong.example.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`,        lastModified: now, changeFrequency: "daily",  priority: 1.0 },
    { url: `${SITE}/reserve`, lastModified: now, changeFrequency: "daily",  priority: 0.9 },
    { url: `${SITE}/ranking`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE}/login`,   lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/register`,lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/terms`,   lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
