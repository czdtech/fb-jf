import { z, defineCollection } from 'astro:content';

const gamesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    image: z.string(),
    iframe: z.string().url(),
    category: z.string(),
    meta: z.object({
      title: z.string(),
      description: z.string(),
      canonical: z.string().url(),
      ogImage: z.string(),
    }),
    seo: z.object({
        title: z.string(),
        description: z.string(),
        keywords: z.string(),
        canonical: z.string().url(),
        ogImage: z.string(),
        schema: z.object({
            name: z.string(),
            alternateName: z.string(),
            url: z.string().url()
        }).optional()
    }).optional(),
    rating: z.object({
        score: z.number(),
        maxScore: z.number(),
        votes: z.number(),
        stars: z.number()
    }).optional(),
    breadcrumb: z.object({
        home: z.string(),
        current: z.string()
    }).optional(),
    pageType: z.string().optional(),
    isDemo: z.boolean().optional(),
  }).passthrough(), 
});

export const collections = {
  'games': gamesCollection,
};
