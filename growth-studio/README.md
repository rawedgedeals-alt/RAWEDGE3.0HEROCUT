# Growth Studio — RawEdge + WHATIF

This is the shared, owner-operated creative pipeline. It preserves each site's branding and does **not** alter either site's editorial rankings.

## Built and running

- `plan.py` makes **four** 14-second, portrait-video briefs every day: 8:00 AM and 7:30 PM for **each** brand, America/Chicago.
- Video prompts require a **real moving person**, natural gestures, coherent walking and spoken dialogue. Moving stills/slideshows are explicitly disallowed.
- Every reel includes a site-specific, verifiable destination and per-network UTM links.
- The GitHub Action archives the four briefs automatically as a private-to-repository-workflow artifact for 14 days.
- The plan generator has no AI dependency or external bills.
- `render_ltx.py` is a working **optional** LTX v2 video submission/download adapter: dry-run by default, explicit per-render cap, no automatic retries and a resumable job ID to avoid duplicate bills.

## Important current limitations

A **brief is not a finished reel**. Scheduled brief generation alone does not synthesize human motion, verify lip sync, host public video files, or post to Instagram/Facebook. The automatic publishing stage is **not connected or enabled**. Never tell users that scheduled briefs have been posted. Never substitute a still or slideshow for a reel.

For a fully automated video-to-social pipeline, the following account-side elements must be configured in protected settings before activation:

1. A licensed, original approved RawEdge spokeswoman first-frame image, hosted at an HTTPS URL. Do not use a casino ad poster with text baked into the woman's face or outfit.
2. An LTX account with prepaid credits and an API key held **only** in a protected secret named `LTX_API_KEY`. Never commit or paste secrets.
3. A durable approved media store: LTX result links expire, so store finished MP4s before attempting to schedule.
4. Authorized Instagram and Facebook connections in the correct brand's publishing account. Maintain editorial and platform-compliance checks (including AI-generated-media disclosure where required).
5. A persistent cross-run spending ledger and authorization gate before enabling unattended paid rendering. The per-render cap alone **does not** enforce a monthly cap.
6. Human review of the first complete motion/video result for anatomy, spoken accuracy, brand fit and licensing, before approving unattended releases.

## How to preview without charges

```bash
python3 growth-studio/plan.py --date 2026-11-01 --output /tmp/reel-briefs
python3 growth-studio/render_ltx.py /tmp/reel-briefs/2026-11-01-whatif-morning.json
```

The renderer prints a dry-run estimate and does **not** call LTX without `--execute`, a sufficient `--per-render-cap-usd`, and `LTX_API_KEY`. RawEdge also needs `--image-uri https://.../approved-reference.jpg` to preserve the character.

## Cost guardrail

As of October 31, 2026, the LTX-2.5 Fast API at 720x1280 is listed at **$0.09 per generated video second**. One 14-second reel is about **$1.26**. Four completely new reels a day for 30 days is **$151.20**, excluding failed renders, storage, delivery and extra edits. **No such charges are enabled by this repository.** Vercel's $25 setting does not cap LTX bills.

## Operation

The site publishing and editorial SEO automation remains separate. The scheduled Growth Studio Action is non-billable and safe to run unattended. When a fully authorized video workflow is attached, it must gate publishing on a verified moving MP4 and avoid inventing casino payout statistics, software features, licensing or offers.
