# Learning Loons site

Static git/Markdown rebuild of [learningloons.com](https://learningloons.com). Astro + Markdown, no WordPress.

This folder is the new public site. The Issued invoice app at the repository root is unchanged.

## Run locally

You need Node.js 20+ and npm.

```bash
cd site
npm install
npm run dev
```

Open [http://127.0.0.1:4321](http://127.0.0.1:4321).

```bash
npm run build     # writes ./dist
npm run preview   # serves the production build
```

## What migrated

- 66 writing posts at their original slugs (`/teen-mental-health-should-we-be-worried/`, etc.)
- Ms. Lee moved to `/builds/ms-lee/`; the old post URL redirects
- Cassy Care, Gains Guardian, and WhereBabe are Builds pages, not Blog cards
- About is Mark Lee; tagline is *Writing on learning, life, and a few things I build.*
- Legal: site privacy + WhereBabe privacy
- Redirect map for privacy/tag/author/category/pagination URLs (`src/data/redirects.json`)
- Public media under `public/media/` (the unused 73MB InVideo file was not kept)
- Typo tags (`ADHA`, `autisum`, `seconardlanguage`, `iterativeam`) were not recreated as taxonomies

Re-import from the public WP REST API (optional):

```bash
python3 scripts/import-wp.py
```

No Hostinger deploy and no WordPress admin are required for local preview.
