# Align the reader with prompt.md, and write down the Plan B evaluation

The spec file is now readable. It confirms the target: a FlipHTML5-style browser reading experience with a paywall gate, OTP login, admin-created free accounts, and a customization toolbar. Two things in the current build fall short of it, plus the evaluation you asked for exists only as chat text.

## What already matches the spec

- Landing page with cover art, description, pricing/access tiers and an "unlock" call to action.
- Reading route with a chapter table of contents rail and font-size control.
- Locked chapters are truncated server-side, so the raw text never reaches the browser. This is the "stream chapter-by-chapter instead of shipping the archive" requirement from the spec's security section, and it is stricter than signed URLs.

## Part 1 — Reader toolbar to spec (frontend only)

Add to the reading view, matching the existing dark-forest design:

- Themes: dark (current), sepia, and light. Persisted in localStorage.
- Progress: a slim bottom bar showing percent read, driven by scroll position over the open sections.
- Position jump: a slider that scrolls to a section instead of an EPUB page, since the text is served as structured sections rather than a raw EPUB.
- Bookmarks: a toggle per section, saved to localStorage, listed in the table of contents rail so a return visit can jump back.
- Paginated view stays out of scope. Column flipping is a foliate-js feature tied to loading a real EPUB in the browser; it conflicts with server-side truncation, which is the stronger protection. Worth saying out loud to your friend before the Cursor build commits to foliate-js.

## Part 2 — Written Plan B evaluation

A new `/hinnang` route (Estonian and English, same as the rest) laying out what you asked for as a shareable page rather than chat scrollback:

- Scope of a full build here: OTP email login, admin-created friend accounts, one-time payment, per-account entitlement, admin view for granting access.
- Running cost at book scale: hosting included, transactional email and payment fees are the only real variable costs; a table with rough monthly figures at 50, 500, and 5000 readers.
- Long-term security: server-side entitlement on every chapter request, roles in a separate table, no client-side unlock flag, and the honest limit — a paying reader can always copy text they can legitimately read, so per-account watermarking plus chapter-at-a-time delivery is the realistic ceiling.
- Maintenance reality: what needs attention yearly, and the recommendation to pick one stack rather than maintaining SvelteKit and this side by side.

## Still not included

Real authentication and payment stay mocked. Turning the login and unlock buttons into working flows means enabling the backend, which is a separate decision and a separate approval.

## Technical notes

- Theme handling goes through the existing token layer in `src/styles.css` (a `.sepia` and `.light` class alongside `.dark`), so no component gets hardcoded colors.
- Bookmarks, theme and text size read from localStorage inside `useEffect` to avoid hydration mismatch during server rendering.
- Progress and slider derive from the sections already returned by `getSample`; no change to the server function's truncation logic.
- `/hinnang` is static content in the existing i18n dictionary, with its own `head()` metadata and `noindex`, since it is an internal document rather than a marketing page.
