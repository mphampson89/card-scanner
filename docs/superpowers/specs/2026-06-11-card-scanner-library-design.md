# Card Scanner — Contact Library Rebuild (design spec)

**Date:** 2026-06-11
**Status:** Approved for planning
**Author:** Claude (brainstormed with Patrick)

## Summary

Card Scanner today is a single-file, stateless PWA: photograph a business card →
Claude Sonnet vision extracts contact fields (browser-direct call, user-pasted API
key) → edit → download a `.vcf` vCard → nothing is saved. This spec evolves it into
a **PIN-gated React + Vite + Neon app** with a real, searchable **saved contact
library**, **batch scanning**, **duplicate detection**, and **vCard export**. The
Anthropic key moves server-side; the original card photo is discarded after
extraction.

This is an expansion, not a redesign — almost nothing of the current behaviour is
preserved except the extraction prompt and the client-side vCard generation logic.

## Goals

- Turn the stateless tool into a persistent, searchable contact library.
- Add batch scanning (multiple cards in one session) with a review-all step.
- Detect duplicates before saving.
- Keep the original superpower: export a saved contact (or a batch) as a `.vcf`.
- Move the Anthropic API key server-side (remove the browser-pasted key).
- Match Patrick's standard stack (React + Vite + Netlify Functions + Neon, PIN `288989`).

## Non-goals (explicit out of scope)

- **Cromwell sync** — not a real integration yet; no dormant columns, no hooks.
- **Tags system** — deferred. The single `notes` field is kept (already extracted,
  feeds the vCard) but no tag chips / tagging UI.
- **Card-photo storage** — the image is discarded after extraction. No blob storage
  (no Netlify Blobs / R2). Contact detail uses an initials avatar.
- **Live camera viewfinder with auto edge-detection / auto-capture** — v1 uses the
  native camera file picker (see §Capture). Live viewfinder is a possible later pass.
- **Multi-user / sharing** — single-user app (Patrick only).

## Architecture & stack

- **Frontend:** React 18 + Vite, PWA. React Router for screen routing.
- **Hosting:** New Netlify site `card-scanner-mph`, Git CD from the existing repo
  `mphampson89/card-scanner` `main` (build `vite build` → publish `dist`).
- **API tier:** Netlify Functions (API **v2**, `export default` + handler).
- **Database:** New Neon project `card-scanner`, accessed from functions via
  `@neondatabase/serverless`.
- **AI:** Claude Sonnet (current 4.x — pin the exact model id in one config constant;
  verify the id against the `claude-api` reference at implementation time). Vision
  extraction runs **server-side** in `/api/extract`.
- **Auth:** PIN `288989` gate (same pattern as Ledger / Bridge / InfraProspect).
- **PWA:** Reuse the existing `manifest.json` + icons (`icons/`). Keep installability.
  The retired GitHub Pages version is removed; the repo contents are replaced with the
  React app.
- **Migration:** None required — the current app stores nothing. The library starts empty.

## Data model (Neon)

Single table `contacts`:

| column        | type          | notes                          |
|---------------|---------------|--------------------------------|
| `id`          | uuid          | pk, `default gen_random_uuid()`|
| `first_name`  | text          |                                |
| `last_name`   | text          |                                |
| `title`       | text          |                                |
| `company`     | text          |                                |
| `work_phone`  | text          |                                |
| `mobile_phone`| text          |                                |
| `email`       | text          |                                |
| `website`     | text          |                                |
| `street`      | text          |                                |
| `city`        | text          |                                |
| `province`    | text          |                                |
| `postal_code` | text          |                                |
| `country`     | text          |                                |
| `notes`       | text          |                                |
| `created_at`  | timestamptz   | `default now()`                |
| `updated_at`  | timestamptz   | `default now()`                |

Empty fields are stored as empty strings (not null) to match the extraction contract.

**Indexes:**
- btree on `lower(email)` — duplicate lookup by email.
- `pg_trgm` GIN on `lower(first_name || ' ' || last_name || ' ' || company)` —
  fuzzy search and name/company duplicate matching.

No `user_id` column (single-user; YAGNI).

**Field naming convention (removes camelCase/snake_case ambiguity):** the extraction
prompt returns **camelCase** JSON keys (`firstName`, `lastName`, `title`, `company`,
`workPhone`, `mobilePhone`, `email`, `website`, `street`, `city`, `province`,
`postalCode`, `country`, `notes`) — reused verbatim from the current app. The API
request/response bodies also speak **camelCase**. The Netlify functions map
camelCase ⇄ snake_case columns at the DB boundary (the only place snake_case appears).

## API (Netlify Functions)

Every function validates the PIN: client sends `Authorization: Bearer <pin>`;
function compares to env `APP_PIN`. Reject with 401 on mismatch. (Single-user, low
stakes — a simple shared-PIN check, not full auth; do not gold-plate.)

- **`POST /api/extract`** — body `{ image: <base64>, mediaType: <string> }`.
  Calls Claude Sonnet vision with the existing extraction prompt. Returns
  `{ fields: { ...14 contact keys... }, confidence: "high" | "check" }`.
  - **Confidence is computed in deterministic server code, never judged by the LLM:**
    `confidence = "check"` if `(first_name AND last_name both empty)` OR
    `(work_phone AND mobile_phone AND email all empty)`; otherwise `"high"`.
  - Always coerce the model output to the full 14-key shape; missing keys → `""`.
- **`GET /api/contacts?query=<q>`** — list, newest first. When `query` present, filter
  via trgm + ILIKE across name / company / email.
- **`POST /api/contacts`** — accepts a single object **or an array** (single save and
  batch save use the same endpoint). Returns the created rows with their ids.
- **`PATCH /api/contacts/:id`** — update edited fields; bumps `updated_at`.
- **`DELETE /api/contacts/:id`** — delete a contact.
- **`POST /api/contacts/match`** — body: array of candidates
  `{ email, firstName, lastName, company }` (camelCase, per the field-naming note).
  Returns, per candidate, any existing matches `{ id, matchedOn: "email" | "name+company" }`. Used to flag duplicates in
  the review step before saving.

**vCard generation stays client-side** — reuse the existing `generateVCard` /
`esc` logic. Batch export = multiple `BEGIN:VCARD…END:VCARD` blocks concatenated into
one `.vcf` download.

## Screens & routing (React Router)

A PIN screen wraps the whole app (unlock once per session, PIN held in
`sessionStorage`).

- **`/` Library** — search box, `All / Recent` filter, contact list (initials avatar,
  name, title · company). Bottom tab bar: Cards · Scan · Settings. Scan FAB.
- **`/scan` Capture** — native camera file picker (`<input type="file"
  accept="image/*" capture="environment">`). Single mode → one photo → Review.
  Batch mode → repeated capture accruing into a filmstrip with a counter, then
  "Review N".
- **`/review` Review** —
  - *Single:* editable field form (the 14 fields), Save / Scan another.
  - *Batch:* list of captured cards, each with a confidence chip (`High` / `Check`),
    tap to expand and edit; duplicate flags shown inline; "Save N contacts".
- **`/contact/:id` Detail** — initials avatar, name, title · company; actions:
  **Call** (`tel:`), **Email** (`mailto:`), **Export vCard**, **Edit**, **Delete**;
  the contact fields. No card photo, no Cromwell status.
- **`/settings`** — PIN lock / clear session, export-all (download every contact as
  one `.vcf`).

## Capture (v1 decision)

v1 uses the **native camera file picker** — reliable across devices and matches what
works today. The framed-card look from the mockups becomes a **static guide overlay**,
not live edge detection. Batch mode repeatedly invokes the picker, collecting images
into a session filmstrip. A true live viewfinder (`getUserMedia` + canvas +
jscanify/OpenCV.js) is explicitly deferred.

## Extraction · batch · duplicate detection

- Client resizes each image before upload (reuse `MAX_PX = 1600`, quality `0.82`) to
  keep payloads small.
- **Batch:** the client orchestrates — runs `/api/extract` at **concurrency 3** with
  per-card progress. A failed card is marked "retry" and does **not** sink the rest of
  the batch.
- **Confidence:** deterministic, server-computed (see `/api/extract`).
- **Duplicate detection:** before saving, the client calls `/api/contacts/match` with
  the candidates. For each flagged duplicate the user chooses:
  - **Skip** — don't save this card.
  - **Save as new** — insert anyway.
  - **Update existing** — merge: fill only the *empty* fields on the existing record
    with non-empty incoming values; bump `updated_at`.

## Error handling

- Batch: per-card failures isolated, each with a retry control. The batch can be saved
  with the successful cards regardless.
- Single scan failure → error state showing a friendly message; raw API response shown
  for parse failures (reuse the existing error UI).
- Network errors → friendly "couldn't reach the service" copy.
- Field shape is always coerced server-side; the client never assumes a key exists.

## Testing

Per the "mocked DB/storage tests hide integration bugs" lesson:

- **Integration (required):** at least one test against an **ephemeral Neon branch**
  asserting the real `contacts` insert → read contract (columns + round-trip), and the
  bulk insert path used by batch save.
- **Unit:**
  - vCard generation + escaping (`esc`, field mapping, multi-card concatenation).
  - The deterministic confidence heuristic (boundary cases: name-only, contact-only,
    empty).
  - Duplicate matching: email normalization (lowercase/trim) and name+company match.
  - Field coercion: fixture model responses → full 14-key shape, missing keys `""`.
- The Anthropic call is **mocked** in tests (don't burn tokens); extraction logic is
  tested against captured fixture responses.

## Deployment

- New Neon project `card-scanner`; run the `contacts` migration + `pg_trgm` extension.
- New Netlify site `card-scanner-mph`, Git CD from `mphampson89/card-scanner` `main`.
- Netlify env vars: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `APP_PIN`.
- Replace the repo's static `index.html` / `service-worker.js` with the Vite app;
  keep `manifest.json` + `icons/`. Retire GitHub Pages.

## Open questions / risks

- **Model id pinning:** confirm the exact current Sonnet id against the `claude-api`
  reference at build time (don't hardcode a stale dated id without checking).
- **PWA cache:** Netlify + service-worker deploys cache hard on Patrick's other apps;
  the Vite PWA service worker must use a versioned cache + skip-waiting so new builds
  appear without a manual reinstall.
- **Camera on iOS vs Android:** the native picker behaves differently across browsers;
  verify capture + orientation on Patrick's actual device before calling it done.
