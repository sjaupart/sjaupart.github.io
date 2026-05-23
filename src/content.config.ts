import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(['réflexions', 'veille']),
    tags: z.array(z.string()),
    excerpt: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
