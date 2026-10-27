# RawEdge Growth Studio — v1

This engine belongs **only to RawEdge** (not WHAT IF). No domain, DNS, or WHAT IF repo changes are involved.

## Publishing controls

- `content/topics.json`: the idea bank with editorial source notes.
- `node scripts/generate.mjs`: creates a website draft in `content/queue` and a matching social caption + reel script in `content/social-drafts`.
- `node scripts/publish.mjs`: converts **approved**, due drafts into accessible static pages under `articles/`, updates `insights.html`, and maintains `sitemap.xml`.
- GitHub Actions runs both daily; changes are committed back to `main`, triggering the existing Vercel deployment. Scheduled workflows operate only on the default branch.
- To publish a draft: confirm all claims, check jurisdiction/age/offer terms, review source notes, then set `status: "approved"`, `editorial_approved: true`, and a valid `publish_at` ISO timestamp. The publisher rejects missing source notes or very short articles.
- Pause publication in GitHub Actions or set `MAX_POSTS_PER_RUN: '0'` in the workflow. Limit per-run is 25 by design.
- For auto-draft generation, optionally configure GitHub Actions repository secret `CONTENT_GENERATION_API_KEY`; without it, curated topics with text still work at **no model API cost**. AI-only drafts remain unapproved by default.
- Social content is draft-only; it cannot auto-post to Instagram/Facebook/Threads without a verified connected scheduler and appropriate video/image assets, permissions and platform policy compliance. The existing Metricool connection can be used for separate scheduling after review.

## Content safety standard

Never invent first-hand payout tests, withdrawal times, official licensing, live bonus claims, guaranteed winnings, ratings or traffic. No bought rankings. Ensure 18+/21+ and jurisdiction disclaimers. Content is educational; regulated promotions require checking local policies and platform restrictions.

## Files

* `scripts/generate.mjs` — create drafts from editorial topics
* `scripts/publish.mjs` — gated publisher and sitemap builder
* `content/topics.json` — controlled topic queue
* `content/queue/` — draft and approved article state
* `content/social-drafts/` — social captions and reel scripts
* `content/published.json` — published article index
* `insights.html` — auto-generated research hub once content publishes

Manual trigger: GitHub → Actions → **RawEdge Growth Publisher** → Run workflow.
