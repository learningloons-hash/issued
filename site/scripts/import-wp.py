#!/usr/bin/env python3
"""Export Learning Loons public WP REST content into Markdown + media."""

from __future__ import annotations

import html
import json
import re
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from bs4 import BeautifulSoup, Comment
from markdownify import markdownify as md

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "src" / "content"
PUBLIC = ROOT / "public"
MEDIA = PUBLIC / "media"
DATA = ROOT / "src" / "data"

API = "https://learningloons.com/wp-json/wp/v2"
ORIGIN = "https://learningloons.com"
UA = "LearningLoonsMigrate/1.0 (git rebuild; public REST)"

# Product landings that must not appear as Writing cards.
BUILD_ONLY_SLUGS = {
    "free-ai-english-tutor-secondary-onlevels": "ms-lee",
}

# Honest topic map. Anything missing falls back to learning.
TOPIC_BY_SLUG = {
    "teen-mental-health-should-we-be-worried": "parenting-school",
    "why-new-mums-feel-so-alone-and-what-actually-helps": "parenting-school",
    "how-to-use-chatgpt-for-learning-a-guide-for-teens-and-their-parents": "parenting-school",
    "plan-a-meaningful-family-holiday-with-your-children": "parenting-school",
    "how-overseas-holidays-help-kids-learn-and-grow": "parenting-school",
    "how-to-love-a-toxic-parent-while-protecting-yourself": "parenting-school",
    "supporting-children-with-autism-to-learn": "parenting-school",
    "helping-children-with-adhd-learn-more-effectively": "parenting-school",
    "the-developmental-stages-of-learning-from-babies-to-teenagers": "parenting-school",
    "can-you-balance-learning-while-working-full-time-and-looking-after-your-kids-and-elderly-parents": "parenting-school",
    "pomodoro-technique-for-kids-focus-without-burning-out": "parenting-school",
    "growth-mindset-explained-how-to-train-your-kids-brain-for-success": "parenting-school",
    "mind-mapping-for-teens-a-creative-way-to-organize-ideas": "parenting-school",
    "finding-forward-motion-rethinking-sobriety-through-momentum": "mind-meaning",
    "the-science-of-accountability-why-it-drives-success": "mind-meaning",
    "death-by-tv-reclaiming-presence-at-the-end-of-life": "mind-meaning",
    "television-and-the-medicalized-death": "mind-meaning",
    "the-scarcity-brain-meets-the-abundant-world-can-we-ever-be-satisfied": "mind-meaning",
    "from-mine-to-maybe-sharing-what-childhood-teaches-us-about-human-nature": "mind-meaning",
    "mine-not-ours-why-we-hoard-instead-of-share": "mind-meaning",
    "the-straight-and-narrow-path-why-having-everything-means-choosing-nothing": "mind-meaning",
    "the-stories-we-tell-how-we-justify-wanting-it-all": "mind-meaning",
    "the-psychology-of-giving-up-why-smart-people-know-when-to-stop": "mind-meaning",
    "what-prayer-and-manifestation-have-in-common-and-where-christian-theology-parts-ways": "mind-meaning",
    "what-f-you-money-really-means-and-why-its-not-just-about-wealth": "mind-meaning",
    "the-labyrinth-of-our-mind": "mind-meaning",
    "fewer-jobs-meet-fewer-people-isnt-that-a-good-thing": "mind-meaning",
    "job-interview-use-generative-ai-to-train-smarter-and-perform-better": "learning",
    "hooked-on-content-how-online-videos-are-shaping-a-generation-of-learners": "learning",
    "the-future-of-work-for-people-with-disabilities-in-the-age-of-ai": "learning",
    "is-cognitive-decline-just-a-myth-the-surprising-truth-about-aging-and-learning": "learning",
    "the-science-of-bilingualism-are-some-people-naturally-gifted-at-learning-languages": "learning",
    "the-uncanny-valley-playing-with-ghosts-of-people-who-were-never-born": "mind-meaning",
    "main-character-syndrome-when-life-feels-like-a-movie": "mind-meaning",
    "the-hidden-riches-of-a-poor-dad-what-i-only-learned-after-40": "mind-meaning",
    "why-everyone-should-learn-to-cook-even-just-a-little": "mind-meaning",
    "the-unbearable-lightness-of-being-a-dance-between-freedom-and-meaning": "mind-meaning",
    "learning-to-be-satisfied-with-what-you-have-but-not-who-you-are": "mind-meaning",
    "learning-to-see-people-as-they-truly-are": "mind-meaning",
    "learning-to-be-imperfect": "mind-meaning",
    "iterative-ambition": "mind-meaning",
    "fake-it-till-you-make-it": "mind-meaning",
    "the-power-of-thinking-less-when-less-is-more": "mind-meaning",
    "learning-to-be-kinder-a-daily-effort": "mind-meaning",
    "learning-my-way-out-of-sadness": "mind-meaning",
    "how-can-christianity-help-your-learning": "mind-meaning",
}

# Same-day study-tip clones and thinner early listicles stay on-site
# but are not featured on Home.
ARCHIVE_SLUGS = {
    "spaced-repetition-the-secret-to-remembering-more-with-less-effort",
    "mind-mapping-for-teens-a-creative-way-to-organize-ideas",
    "does-music-help-you-study-the-psychology-of-study-playlists",
    "pomodoro-technique-for-kids-focus-without-burning-out",
    "why-sleep-matters-more-than-you-think-for-learning",
    "active-vs-passive-learning-whats-the-difference-and-why-it-matters",
    "growth-mindset-explained-how-to-train-your-kids-brain-for-success",
    "essential-tools-for-effective-online-learning",
    "best-books-for-lifelong-learning",
    "learning-beyond-the-classroom",
}

TYPO_TAG_SLUGS = {
    "adha",
    "autisum",
    "seconardlanguage",
    "iterativeam",
}


def request(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as res:
        body = res.read()
        headers = {k.lower(): v for k, v in res.headers.items()}
        return body, headers


def fetch_json(url: str):
    body, headers = request(url)
    return json.loads(body.decode("utf-8")), headers


def fetch_all(endpoint: str, extra: str = "") -> list:
    items = []
    page = 1
    while True:
        sep = "&" if "?" in endpoint else "?"
        url = f"{API}/{endpoint}{sep}per_page=100&page={page}{extra}"
        try:
            data, headers = fetch_json(url)
        except urllib.error.HTTPError as err:
            if err.code == 400 and page > 1:
                break
            raise
        if not data:
            break
        items.extend(data)
        total_pages = int(headers.get("x-wp-totalpages", "1"))
        if page >= total_pages:
            break
        page += 1
    return items


def clean_title(raw: str) -> str:
    text = html.unescape(re.sub(r"<[^>]+>", "", raw or ""))
    text = text.replace("\xa0", " ").replace("\u200b", "")
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"(?:[\s\-–—]*Learning Loons)+$", "", text, flags=re.I).strip()
    return text


def excerpt_text(raw: str, fallback: str, limit: int = 220) -> str:
    text = html.unescape(re.sub(r"<[^>]+>", " ", raw or ""))
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        text = re.sub(r"\s+", " ", fallback).strip()
    if len(text) > limit:
        cut = text[: limit - 1].rsplit(" ", 1)[0]
        return cut + "…"
    return text


def rewrite_media_url(url: str) -> str:
    if not url:
        return url
    url = url.replace("http://https//", "https://")
    url = url.replace("http://https://", "https://")
    parsed = urllib.parse.urlparse(url)
    path = parsed.path
    marker = "/wp-content/uploads/"
    if marker in path:
        rel = path.split(marker, 1)[1]
        return "/media/" + rel
    if parsed.netloc.endswith("learningloons.com") and path.startswith("/"):
        return path
    return url


def html_to_markdown(raw_html: str) -> str:
    soup = BeautifulSoup(raw_html or "", "lxml")
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src") or ""
        srcset = img.get("srcset") or ""
        if not src and srcset:
            src = srcset.split(",")[0].strip().split(" ")[0]
        img["src"] = rewrite_media_url(src)
        for attr in ("srcset", "sizes", "data-src", "data-srcset", "decoding", "loading", "width", "height", "class", "srcset"):
            if attr in img.attrs:
                del img.attrs[attr]

    for a in soup.find_all("a"):
        href = a.get("href") or ""
        href = href.replace("http://https//", "https://").replace("http://https://", "https://")
        if "learningloons.com" in href:
            path = urllib.parse.urlparse(href).path
            if "/wp-content/uploads/" in path:
                href = rewrite_media_url(href)
            else:
                href = path or "/"
        a["href"] = href

    markdown = md(str(soup), heading_style="ATX", bullets="-", strip=["span", "div"])
    markdown = markdown.replace("\xa0", " ").replace("\u200b", "")
    markdown = re.sub(r"\n{3,}", "\n\n", markdown)
    markdown = re.sub(r"By Learning Loons\s*\|\s*\d{1,2} \w+ 20\d{2}\s*", "", markdown)
    markdown = markdown.strip() + "\n"
    return markdown


def yaml_quote(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def write_md(path: Path, frontmatter: dict, body: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = ["---"]
    for key, val in frontmatter.items():
        if isinstance(val, bool):
            lines.append(f"{key}: {'true' if val else 'false'}")
        elif isinstance(val, int):
            lines.append(f"{key}: {val}")
        elif val is None:
            continue
        else:
            lines.append(f"{key}: {yaml_quote(str(val))}")
    lines.append("---")
    lines.append("")
    path.write_text("\n".join(lines) + body.lstrip() + ("\n" if not body.endswith("\n") else ""), encoding="utf-8")


def media_local_path(source_url: str) -> Path | None:
    marker = "/wp-content/uploads/"
    parsed = urllib.parse.urlparse(source_url)
    if marker not in parsed.path:
        return None
    rel = parsed.path.split(marker, 1)[1]
    return MEDIA / rel


def download_file(url: str, dest: Path) -> str:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return "skip"
    try:
        body, _ = request(url)
        dest.write_bytes(body)
        return "ok"
    except Exception as exc:  # noqa: BLE001
        return f"fail:{exc}"


def main() -> int:
    print("Fetching posts, pages, media, tags…")
    posts = fetch_all("posts", "&status=publish")
    pages = fetch_all("pages", "&status=publish")
    media = fetch_all("media")
    tags = fetch_all("tags")
    print(f"  posts={len(posts)} pages={len(pages)} media={len(media)} tags={len(tags)}")

    media_by_id = {item["id"]: item for item in media}

    (CONTENT / "writing").mkdir(parents=True, exist_ok=True)
    (CONTENT / "builds").mkdir(parents=True, exist_ok=True)
    (CONTENT / "legal").mkdir(parents=True, exist_ok=True)
    DATA.mkdir(parents=True, exist_ok=True)
    MEDIA.mkdir(parents=True, exist_ok=True)

    writing_count = 0
    for post in posts:
        slug = post["slug"]
        title = clean_title(post["title"]["rendered"])
        raw_html = post["content"]["rendered"]
        body = html_to_markdown(raw_html)
        words = len(re.findall(r"\b\w+\b", body))
        description = excerpt_text(post.get("excerpt", {}).get("rendered", ""), body)
        topic = TOPIC_BY_SLUG.get(slug)
        if topic is None:
            topic = "learning"
            if slug not in BUILD_ONLY_SLUGS:
                print(f"  note: default topic=learning for {slug}")
        featured_id = post.get("featured_media") or 0
        hero = None
        hero_alt = ""
        if featured_id and featured_id in media_by_id:
            item = media_by_id[featured_id]
            source = item.get("source_url") or ""
            local = media_local_path(source)
            if local:
                hero = "/" + str(local.relative_to(PUBLIC))
            hero_alt = clean_title(item.get("alt_text") or item.get("title", {}).get("rendered", "") or title)

        featured = (
            slug not in BUILD_ONLY_SLUGS
            and slug not in ARCHIVE_SLUGS
            and (words >= 1000 or post["date"][:10] >= "2025-06-01")
        )

        fm = {
            "title": title,
            "description": description,
            "pubDate": post["date"][:10],
            "updatedDate": (post.get("modified") or post["date"])[:10],
            "slug": slug,
            "topic": topic,
            "featured": featured,
            "hero": hero,
            "heroAlt": hero_alt,
            "wordCount": words,
            "originalUrl": f"{ORIGIN}/{slug}/",
        }

        if slug in BUILD_ONLY_SLUGS:
            build_slug = BUILD_ONLY_SLUGS[slug]
            fm.update(
                {
                    "slug": build_slug,
                    "status": "live",
                    "ctaLabel": "Open in Telegram",
                    "ctaUrl": "https://t.me/SG_Tutor_bot",
                    "summary": "A free AI English tutor on Telegram for Singapore O-Level and N-Level students.",
                }
            )
            write_md(CONTENT / "builds" / f"{build_slug}.md", fm, body)
        else:
            write_md(CONTENT / "writing" / f"{slug}.md", fm, body)
            writing_count += 1

    for page in pages:
        slug = page["slug"]
        title = clean_title(page["title"]["rendered"])
        body = html_to_markdown(page["content"]["rendered"])
        if slug in {"privacy-policy-2", "privacy-policy"}:
            write_md(
                CONTENT / "legal" / "privacy.md",
                {
                    "title": "Privacy policy",
                    "description": "How Learning Loons handles personal data on this site.",
                    "slug": "privacy",
                    "updatedDate": (page.get("modified") or page["date"])[:10],
                },
                body,
            )
        elif slug == "wherebabe-privacy-policy":
            write_md(
                CONTENT / "legal" / "wherebabe-privacy.md",
                {
                    "title": "WhereBabe privacy policy",
                    "description": "Privacy policy for the WhereBabe couples location-sharing app.",
                    "slug": "wherebabe-privacy",
                    "updatedDate": (page.get("modified") or page["date"])[:10],
                },
                body,
            )
        # about-us is rewritten by hand in src/pages/about.astro

    # Download media + logo.
    jobs = []
    for item in media:
        source = item.get("source_url")
        if not source:
            continue
        dest = media_local_path(source)
        if dest is None:
            continue
        if dest.suffix.lower() in {".mp4", ".mov", ".webm"}:
            continue
        jobs.append((source, dest))
    # Site logo used in the old WP theme.
    jobs.append((f"{ORIGIN}/wp-content/uploads/2025/02/1.png", PUBLIC / "logo.png"))

    print(f"Downloading {len(jobs)} media files…")
    ok = skip = fail = 0
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(download_file, url, dest): (url, dest) for url, dest in jobs}
        for fut in as_completed(futures):
            status = fut.result()
            if status == "ok":
                ok += 1
            elif status == "skip":
                skip += 1
            else:
                fail += 1
                url, dest = futures[fut]
                print("  FAIL", dest, status, file=sys.stderr)
    print(f"  media ok={ok} skip={skip} fail={fail}")

    tag_slugs = sorted({t["slug"] for t in tags})
    DATA.joinpath("wp-tags.json").write_text(
        json.dumps(
            {
                "tagSlugs": tag_slugs,
                "typoTagSlugs": sorted(TYPO_TAG_SLUGS),
                "buildOnlySlugs": BUILD_ONLY_SLUGS,
                "writingCount": writing_count,
                "postCount": len(posts),
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {writing_count} writing posts, builds, legal pages.")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
