import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";

export type LandingPageData = {
  id: string;
  slug: string;
  platform: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  h1: string | null;
  heroDescription: string | null;
  content: string | null;
  faqItems: any;
  published: boolean;
};

/**
 * Fetches landing page content from DB by slug, with Next.js caching.
 */
export const getLandingPageData = unstable_cache(
  async (slug: string, locale: string = "tr"): Promise<LandingPageData | null> => {
    try {
      const page = await db.landingPage.findUnique({
        where: { slug },
      });
      
      if (!page || !page.published) return null;
      
      // Override values if a translation exists for the requested locale
      if (locale !== "tr" && page.translations) {
        const trans = (page.translations as Record<string, any>)[locale];
        if (trans) {
          if (trans.seoTitle) page.seoTitle = trans.seoTitle;
          if (trans.seoDescription) page.seoDescription = trans.seoDescription;
          if (trans.h1) page.h1 = trans.h1;
          if (trans.heroDescription) page.heroDescription = trans.heroDescription;
          if (trans.content) page.content = trans.content;
          if (trans.faqItems) page.faqItems = trans.faqItems;
        }
      }
      
      return page;
    } catch (error) {
      console.error("Error fetching landing page data:", error);
      return null;
    }
  },
  ["landing-page-data"],
  { revalidate: 60 } // Revalidate every 60 seconds
);
