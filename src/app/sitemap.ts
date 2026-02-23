import type { MetadataRoute } from "next";
import { getSortedPostsData } from "@/lib/posts";

const siteUrl = "https://equalfi.org";

function normalizeDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  const normalized = dateStr.includes(".")
    ? dateStr.replace(/\./g, "-")
    : dateStr;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getSortedPostsData();
  const latestPostDate = normalizeDate(posts[0]?.date);

  return [
    {
      url: siteUrl,
      lastModified: latestPostDate ?? new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: latestPostDate ?? new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    ...posts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: normalizeDate(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
