import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pingpong.example.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/reserve", "/ranking", "/seasons", "/login", "/register", "/players"],
        disallow: ["/api", "/admin", "/mypage"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
