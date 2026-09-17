export const SITE = {
  title: "Learning Loons",
  tagline: "Writing on learning, life, and a few things I build.",
  description:
    "Essays by Mark Lee from Singapore — how people learn, how families handle school, and the messier parts of a life.",
  url: "https://learningloons.com",
  author: "Mark Lee",
  email: "admin@learningloons.com",
  year: 2026,
};

export const NAV = [
  { href: "/writing/", label: "Writing" },
  { href: "/topics/", label: "Topics" },
  { href: "/builds/", label: "Builds" },
  { href: "/about/", label: "About" },
  { href: "/legal/", label: "Legal" },
] as const;

export const TOPICS = {
  learning: {
    slug: "learning",
    title: "Learning",
    summary: "How memory, study, language, and AI actually work — without the listicle chrome.",
  },
  "parenting-school": {
    slug: "parenting-school",
    title: "Parenting & school",
    summary: "Singapore classrooms, teens, neurodivergence, and the village that is not always there.",
  },
  "mind-meaning": {
    slug: "mind-meaning",
    title: "Mind & meaning",
    summary: "Wanting it all, hoarding, faith, money, death, sobriety — the longer essays.",
  },
} as const;

export type TopicSlug = keyof typeof TOPICS;
