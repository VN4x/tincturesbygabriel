# Metsa vägi ja tervis

Browser reader for Gabriel Corpus’s tincture book. Landing and free sample are the Lovable design; Cursor adds a gated **foliate-js** EPUB reader and paywall.

**Live demo:** https://tincturesbygabriel.lovable.app

Vercel is the design host: connect this GitHub repo at [vercel.com/new](https://vercel.com/new) (framework **TanStack Start**). Push the branch — Vercel runs `npm ci` and `npm run build`; you do not need local `npm run dev`.

**Test-mode env (Vercel dashboard):**

| Variable | Value |
| --- | --- |
| `FREE_ACCESS` | `1` |
| `VITE_FREE_ACCESS` | `1` |
| `ACCESS_SECRET` | long random string |
| `PUBLIC_SITE_URL` | `https://your-project.vercel.app` |

With those set, **`/read` opens the foliate reader with no login.** Each deploy builds a tiny demo EPUB automatically (real book later via `BOOK_URL` — never commit `.epub` files).

## Stack

TanStack Start + React 19 + Tailwind v4. Do not add a second SvelteKit app. `main` syncs back to [Lovable](https://lovable.dev/projects/7462252c-66c1-49b3-8715-cb4ac8dcc721) — no force-push.

| Route | Who |
| --- | --- |
| `/` | Landing (ET/EN), 0€ / 5€ / invite |
| `/lugemine` | Random free chapters; locked text truncated on the server |
| `/read` | Full EPUB (`foliate-js`); with `FREE_ACCESS=1` on Vercel, open directly — no paywall |
| `/admin` | Author ledger — not linked from the public site |
| `GET /api/book?t=` | Short-lived signed EPUB bytes; 401 without entitlement |

## Local development (optional)

Most work happens on the Vercel preview URL after a git push. For local debugging only:

```sh
npm i
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

Copy `private/books/metsa-vagi.epub` onto the machine that builds (gitignored). The Vercel build packs it into the serverless function — not `public/`, not git. `/api/book` still requires an access cookie unless `FREE_ACCESS=1`. Without that file or `BOOK_URL`, the build writes a **demo EPUB** when `VERCEL=1`.

The file ledger cannot persist across serverless instances. Paid access on Vercel needs the Stripe webhook plus Supabase `purchases` / `/auth`, or a later Node host with `ADMIN_STORE_PATH`.

Stripe webhook endpoint: `https://<host>/api/stripe/webhook` (`checkout.session.completed`).
