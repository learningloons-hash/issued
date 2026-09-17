import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const writing = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/writing" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    slug: z.string(),
    topic: z.enum(["learning", "parenting-school", "mind-meaning"]),
    featured: z.boolean().default(false),
    hero: z.string().optional(),
    heroAlt: z.string().optional(),
    wordCount: z.number().optional(),
    originalUrl: z.string().optional(),
  }),
});

const builds = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/builds" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    slug: z.string(),
    summary: z.string(),
    status: z.enum(["live", "private", "paused"]).default("live"),
    ctaLabel: z.string().optional(),
    ctaUrl: z.string().optional(),
    relatedEssay: z.string().optional(),
    relatedEssayTitle: z.string().optional(),
    privacyUrl: z.string().optional(),
    hero: z.string().optional(),
    heroAlt: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    originalUrl: z.string().optional(),
    topic: z.string().optional(),
    featured: z.boolean().optional(),
    wordCount: z.number().optional(),
  }),
});

const legal = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/legal" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    slug: z.string(),
    updatedDate: z.coerce.date().optional(),
  }),
});

export const collections = { writing, builds, legal };
