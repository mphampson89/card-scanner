# card-scanner
## Claude Code Session Context
## Last Updated: 2026-11-18

## Purpose
Card scanner PWA. Snap or upload a business card photo, extract a contact, dedupe, export vCard.

## Stack
- React 18 + Vite, React Router 6. Tests: Vitest + Testing Library (`npx vitest run`).
- Netlify Functions (`netlify/functions/`) backed by Neon Postgres (`@neondatabase/serverless`).
- PWA (manifest.json, public/sw.js). Verified on Android Firefox and Chrome.

## Deploy
- Hosted on Netlify. `netlify.toml`: build `npm run build`, publish `dist`, SPA redirect to `/index.html`.
- Deploys automatically on push to `main`. No GitHub Actions workflow.
- The scanner's own Netlify URL is not recorded in this repo. Fill in here: [URL]
- `public/_headers` sets `frame-ancestors` so the app can run framed inside the Bridge shell
  (https://bridge-mph.netlify.app). Those URLs are the parent app, not this site.
- The old GitHub Pages address (mphampson89.github.io/card-scanner/) is no longer the deploy target.

## Current Status
- All 10 original tasks complete + verified.
- 2026-09-10: PR #2 merged. Single mode now has separate "Take a photo" (camera) and
  "Upload from files" (picker) buttons; the + tab opens the picker when already on /scan.
- 2026-11-18: Upload feedback. Capture shows "Preparing photo…" and an error box when a file
  can't be opened (previously skipped silently). Review shows a per-card extraction error with
  "Try again", and a save error. sw.js cache bumped to v3.
- 2026-11-18: Settings has an "Update app" button (src/lib/update.js: refresh service worker,
  clear caches, reload) and shows the build time (__BUILD_TIME__ defined in vite.config.js).
- 2026-11-18: Review shows the card photo above the fields (pinned while scrolling in single
  mode); tap opens it full screen. Uses shots[i].dataUrl passed from Capture.
- 2026-11-18: Crop to card. extract.js asks the model for cardBox (0-1 fractions); coerceBox
  validates it. Review crops with cropToBox (src/lib/camera.js, 4% margin) and falls back to the
  full photo if the box is missing. Full-screen view has "Show whole photo".
- 2026-11-18: Contact screen shows the saved card photo instead of initials; tap for full screen.
  New column contacts.card_image (migrations/0002_card_image.sql), auto-applied by ensureSchema()
  in _db.js. Review saves a 900px cropped JPEG (cardImageFor). List and match endpoints exclude
  the image; GET /api/contacts/:id returns it. PATCH keeps the stored image unless a new one is sent.

## Active Worktrees (if applicable)
None.

## Known Issues or Blockers
- Uploads accept images only. vCard (.vcf) and PDF imports are not supported.
- HEIC/HEIF (iPhone) photos can't be decoded by Chrome/Firefox on Android or desktop. The app now
  says so; converting them would need a library such as heic2any (not added).
- Installed PWA can serve a cached build after a deploy; use Settings > Update app, close fully
  and reopen, or bump the cache name in public/sw.js.

## Next Steps
[Update at start of session]

## Architecture Notes
- `src/screens/Capture.jsx` exports `PICK_EVENT`; `src/components/TabBar.jsx` dispatches it on
  `window` when + is pressed on /scan so Capture can open its hidden file input.
- Never put `capture="environment"` on the upload input. On Android it forces the camera app and
  hides the file picker.
- Framed unlock handshake with Bridge lives in `src/lib/bridgeUnlock.js` and `src/App.jsx`.

## Do Not Touch
- `public/_headers` frame-ancestors list without updating `src/lib/bridgeUnlock.js` to match.
