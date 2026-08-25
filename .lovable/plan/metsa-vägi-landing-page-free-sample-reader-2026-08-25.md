# Metsa Vägi — landing page + free sample reader

## What I read from the EPUB

"METSA VÄGI JA TERVIS" by Gabriel Corpus (Estonian, `et-EE`), a single reflowable `Story1.xhtml` of ~188k characters with page markers 1–131, embedded Garamond and Arial fonts, and an `encryption.xml` (obfuscated fonts). Content: forest and tree tinctures, etymology (Bailey / Bailly), historical Estonian charms, propolis, castoreum. Tone is ritual, herbal, reverent — "tinktuur on kontsentreeritud aeg".

That tone drives the design: **dark forest, mystical** — near-black forest green ground, moonlit botanical engravings, amber-glass and gold accents, Garamond-family display serif, generous editorial spacing. Not wellness-soft, not purple-gradient SaaS.

## Scope of this build

A) Landing page (Estonian + English toggle) and B) a working free sample reader.

### Landing page (`/`)
- Hero: full-bleed dark forest imagery, title, author, one-line promise, primary CTA "Ava tasuta lõik" / secondary "Logi sisse".
- The premise strip: three panels — forest as pharmacy, tincture as concentrated time, the two pillars (Bailey / Bailly).
- Inside the book: chapter teasers pulled from the real text, each showing 2–3 legible sentences dissolving into blur.
- Sample reader entry: "Every visit unlocks a different passage."
- Access: free browse vs. full access vs. friend account (admin-issued), OTP-by-email described as the login method.
- About the author, FAQ, footer with copyright notice from the book.
- Language toggle ET/EN in the header, persisted.

### Free sample reader (`/lugemine`)
- The EPUB text is parsed at build time into structured sections and stored as local content data (ET; EN when you supply the English EPUB).
- On each visit the reader picks a random small set of passages and renders them fully; every other passage renders behind a progressive blur with a lock affordance.
- Blur is layered: CSS blur plus reduced-opacity plus non-selectable text, over truncated content so the hidden text is short rather than fully present.
- Reading UI: paginated column, Garamond serif, adjustable text size, chapter rail, progress, "unlock full book" bar pinned at the bottom.
- No auth, no backend in this phase — locked passages are simply not shipped in full.

### Explicitly out of scope here
Real OTP email delivery, payments, admin friend-account issuing, per-user progress. Those are marked as clearly-designed but non-functional entry points, ready to wire to a backend if you take plan B.

## Technical notes

- This project is **TanStack Start (React 19) + Tailwind v4**, not SvelteKit. The design, tokens, typography scale and reader mechanics all translate directly to your Cursor SvelteKit build — treat this as the reference implementation of the look and the reader behaviour, not as code you paste into SvelteKit.
- EPUB parsing: a one-off script unzips the uploaded EPUB, strips the InDesign/Affinity markup, and emits typed JSON (`sections[] { id, page, heading, paragraphs[] }`) plus a `free`/`locked` classification. Committed as data so the reader needs no runtime EPUB library.
- Fonts: the EPUB's Garamond files are encrypted/obfuscated and licence-unclear, so I use a self-hosted open Garamond (EB Garamond) rather than extracting them.
- Design tokens (forest, ink, amber, gold, parchment) go in `src/styles.css` as oklch semantic tokens; no hardcoded colour utilities.
- Imagery generated as assets: forest canopy hero, botanical engravings of the book's trees, amber tincture bottle still life.
- Head metadata per route with ET/EN-aware titles and descriptions, JSON-LD `Book`.
- Security posture for the sample reader: the only real protection is that locked text is never sent to the browser. Client-side blur alone is trivially defeated.

## Plan B — building and running the full app here

Honest evaluation, since you asked.

**Feasibility.** Everything the Cursor spec wants is buildable here: OTP email login, admin-issued friend accounts, Stripe/Paddle paywall, per-user entitlements, server-gated chapter delivery, reading progress. Lovable Cloud provides Postgres with row-level security, auth with email OTP, storage and server functions — no external accounts to wire.

**Cost.** Development is credit-based, not per-seat: expect the full app to be a meaningful multiple of this landing-page build, with the paywall, entitlement gating and admin tooling the largest slices. Running it: Lovable hosting plus Cloud on a paid plan covers a book with a few thousand readers comfortably; the variable costs that actually grow are transactional email (OTP volume) and payment processing fees (~2.9% + fixed per sale). A book audience of this size is very cheap to run — this is not a bandwidth-heavy product, since the payload is text.

**Security, long term.** The parts I can make genuinely strong: server-side entitlement checks, RLS so a reader can only ever read their own rows, roles in a separate `user_roles` table so admin status cannot be self-granted, OTP with short expiry and rate limiting, signed short-lived chapter requests, no secrets in the client. The part nobody can make strong: a paying reader can always copy the text they legitimately see. Realistic mitigations are chapter-at-a-time delivery, per-account watermarking of served text, and rate limits that make wholesale scraping slow — not DRM. Plan for that as a business reality rather than an engineering problem.

**Long-term maintenance.** Low. The risk items over a few years are dependency and framework upgrades, email-provider deliverability, and payment-provider API changes. There is no operational on-call burden at this scale.

**Recommendation.** Ship the landing page and sample reader here first — it is the piece that has to be beautiful and it validates demand with zero backend risk. Decide on the full app once you see conversion, and if you do build it, build it in one stack rather than maintaining a SvelteKit and a Lovable version in parallel.

## Waiting on you

- `prompt.md` (you said you'd upload it) — I'll reconcile the plan with the Cursor spec before building.
- The English EPUB, for real EN content instead of a translated shell.
