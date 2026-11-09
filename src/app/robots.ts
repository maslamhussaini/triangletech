import type { MetadataRoute } from "next";
import { business } from "@/lib/site";

/** Static robots.txt — see sitemap.ts note on `force-static`. */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${business.url}/sitemap.xml` };
}
