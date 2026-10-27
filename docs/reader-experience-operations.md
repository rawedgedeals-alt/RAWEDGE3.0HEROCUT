# RawEdge Reader Experiences: Operations

Visitor:
- Homepage offers LEAVE YOUR EXPERIENCE and READ WHAT OTHERS ARE SAYING.
- A submitted account is persisted privately; the visitor immediately sees the saved text and status PENDING PUBLIC APPROVAL.
- Their random private receipt persists on that browser, so they can recover their story after reload.
- Community feed displays only manually approved experiences, never invented testimonials.
- Reader submissions are explicitly marked as personal anecdotes, not first-hand RawEdge payout tests.

Moderator:
- Go to /reader-moderation.html.
- Enter the private moderator key delivered securely to the owner, and choose LOAD PENDING SUBMISSIONS.
- Check each story for first-hand relevance, private data, defamatory/unsubstantiated accusations, threats and spam.
- Approve or reject fairly. Payment and advertising affiliation must never affect moderation.
- The key is stored in Vercel encrypted project environment variable READER_MODERATION_KEY, never in GitHub source.
- Public items are stored in reader-approved/ in private Vercel Blob. Pending records are in reader-pending/.
- Requests to remove or correct personal submissions require a documented editorial follow-up. No public deletion button exists yet.

Dynamic API:
- POST /api/reader-experiences securely saves a pending story and returns an unguessable receipt ID.
- GET /api/reader-experiences?receipt=... returns one private story for its receipt holder.
- GET /api/public-reader-experiences returns approved entries only.
- GET/POST /api/admin-reader-experiences requires a separate moderator secret.
- Avoid a testimonial wall populated with fake reviews or unverified payout metrics.

Cost:
- Static pages coexist with live serverless functions and a private Blob store. No wholesale rebuild required.
- The Vercel plan is currently Hobby; upgrade commercial projects to a permissible paid plan only after user approves billing.
- Blob storage and function traffic are usage-metered and can exceed included plan allowances.

Acceptance:
1. Reader form is visible on phone; both reader buttons work.
2. GET public feed returns [] until genuine approval.
3. POST a consented test story in a browser: 201 and pending.
4. Reload the same browser to verify the story still appears from its receipt.
5. Approve a consented test story in the admin dashboard and see it appear publicly; remove test data afterward.
6. All community entries say reader-submitted; never equate them with verified RawEdge payout statistics.

Backlog: anti-bot CAPTCHA/rate limit, pagination, correction/deletion workflow, moderation audit log, notification to editors.
