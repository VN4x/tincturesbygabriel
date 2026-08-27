# Metsa vägi ja tervis

Browser reader for Gabriel Corpus’s tincture book. Landing and free sample are the Lovable design; Cursor adds a gated **foliate-js** EPUB reader and paywall.

**Live demo:** https://tincturesbygabriel.lovable.app

Vercel is the demo host before a Node/Podman production box. Import the GitHub repo at [vercel.com/new](https://vercel.com/new) (framework **TanStack Start**) or run `npx vercel`. Set `ACCESS_SECRET`, `INVITE_TOKENS`, and `PUBLIC_SITE_URL` in the project. Put the EPUB in `private/books/` on the build machine so Vercel can bundle it into the function; do not commit `.epub` files or place them in `public/`.

## Stack

TanStack Start + React 19 + Tailwind v4. Do not add a second SvelteKit app. `main` syncs back to [Lovable](https://lovable.dev/projects/7462252c-66c1-49b3-8715-cb4ac8dcc721) — no force-push.

| Route | Who |
| --- | --- |
| `/` | Landing (ET/EN), 0€ / 5€ / invite |
| `/lugemine` | Random free chapters; locked text truncated on the server |
| `/read` | Full EPUB (`foliate-js`) after OTP, invite, or purchase |
| `/admin` | Author ledger — not linked from the public site |
| `GET /api/book?t=` | Short-lived signed EPUB bytes; 401 without entitlement |

## Local development

```sh
npm i
# EPUB is gitignored. Keep 120326reflowable.epub at the repo root or at private/books/metsa-vagi.epub
npm run dev
```

Demo paywall (no Stripe / Resend keys):

- **OTP:** only works for emails that already paid, used an invite, or were granted in `/admin`. Then any 6 digits (until Resend is set).
- **Invite:** `METSAVAGI-FRIEND`
- **5€:** grants mock access and opens `/read`

## Admin panel

Open **`/admin`** (local: `http://localhost:8080/admin`). It is not in the public navigation and is served with `noindex`.

| | Local (dev, unset env) | Production |
| --- | --- | --- |
| URL | `/admin` | `https://your-domain/admin` |
| E-mail | `gabriel@corpus.ee` | `ADMIN_EMAIL` |
| Password | `metsavagi-admin` | `ADMIN_PASSWORD` (12+ characters, required) |

Set both in `.env` before launch. The session is an httpOnly cookie (12 hours), login is rate-limited (5 failures / 15 minutes / IP), and a revoked reader loses `/read` immediately.

The panel lists paid and invited readers, dates, contacts, Doctor DMs, reader-reported issues, read counts, and a 14-day chart. Replies go out through Resend when `RESEND_API_KEY` is set.

Ledger file: `private/admin-store.json` (or `ADMIN_STORE_PATH`). Lovable/Cloudflare cannot persist this file — use the Podman Node server for a real ledger.

## Book files (never public)

- Runtime EPUB: `private/books/metsa-vagi.epub` (or `BOOK_PATH` / `BOOK_URL`)
- Full JSON extract: `private/book-et.full.json` — regenerate public teasers with `python scripts/harden-sample.py`
- Committed `src/content/book-et.json` is **sample-only** (intro + four chapters in full)

## Production (Podman / Ubuntu)

Nitro defaults to Cloudflare for Lovable. For a Node container:

```sh
podman compose up --build
```

`compose.yml` mounts `./private/books` to `/data/books` and `./private/admin` to `/data/admin`. Copy `.env.example` and set `ACCESS_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Optional: `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID`, `RESEND_API_KEY`.

## Production (Vercel)

`vercel.json` sets the TanStack Start preset. `vite.config.ts` uses Nitro `vercel` when `VERCEL=1`. Install uses `npm ci` (ignore the Lovable `bun.lock` on this host).

| Env | Why |
| --- | --- |
| `ACCESS_SECRET` | HMAC for entitlement cookies (required in production) |
| `INVITE_TOKENS` | Friend codes, e.g. `METSAVAGI-FRIEND` |
| `PUBLIC_SITE_URL` | Canonical origin (`https://….vercel.app`) for Stripe return URLs |
| `BOOK_URL` | Optional remote EPUB URL fetched by `/api/book` after entitlement. Alternative to bundling. |
| Stripe / Resend / Supabase | Same names as `.env.example` |

Copy `private/books/metsa-vagi.epub` onto the machine that builds (gitignored). The Vercel build packs it into the serverless function — not `public/`, not git. `/api/book` still requires an access cookie. Without that file or `BOOK_URL`, `/read` returns 503.

The file ledger cannot persist across serverless instances. Paid access on Vercel needs the Stripe webhook plus Supabase `purchases` / `/auth`, or a later Node host with `ADMIN_STORE_PATH`.

Stripe webhook endpoint: `https://<host>/api/stripe/webhook` (`checkout.session.completed`).
