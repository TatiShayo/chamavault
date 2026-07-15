import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://chamavault.com", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: "https://chamavault.com/pricing", lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://chamavault.com/login", lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: "https://chamavault.com/signup", lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];
}
