# Card Scanner Contact-Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Card Scanner from a stateless single-file vCard tool into a PIN-gated React + Vite + Neon app with a searchable saved contact library, batch scanning, duplicate detection, and vCard export.

**Architecture:** React 18 + Vite PWA on Netlify. Netlify Functions (v2) are the API tier and hold the Anthropic key server-side. Neon Postgres stores contacts. Pure logic (field mapping, vCard, confidence, dedup matching) lives in framework-free modules under `shared/` so both the client and the functions import the exact same code. The client orchestrates batch extraction by calling `/api/extract` per card at limited concurrency.

**Tech Stack:** React 18, React Router 6, Vite, Vitest + @testing-library/react, Netlify Functions v2, `@neondatabase/serverless`, Neon Postgres (`pg_trgm`).

**Design spec:** `docs/superpowers/specs/2026-06-11-card-scanner-library-design.md`

---

## File structure

```
card-scanner/
  shared/
    fields.js          # FIELDS list, camelCase keys, column ⇄ key maps, coercion
    confidence.js      # deterministic high/check heuristic
    vcard.js           # contact → vCard string, many → one .vcf
    dedup.js           # pure match predicate (email / name+company)
  netlify/
    functions/
      _db.js           # Neon client + PIN auth guard (shared by all functions)
      extract.js       # POST /api/extract  (Claude vision)
      contacts.js      # GET list/search + POST create/bulk
      contact.js       # PATCH/DELETE /api/contacts/:id
      match.js         # POST /api/contacts/match
  migrations/
    0001_init.sql      # contacts table + pg_trgm + indexes
  src/
    main.jsx           # React entry, router
    App.jsx            # PIN gate wrapper + routes + tab shell
    lib/
      api.js           # fetch wrapper (adds Bearer PIN), typed calls
      camera.js        # file-input capture + client-side resize
    theme.css          # design tokens (dark default, light variant)
    screens/
      PinGate.jsx
      Library.jsx
      Capture.jsx
      Review.jsx
      Contact.jsx
      Settings.jsx
    components/
      TabBar.jsx
      Avatar.jsx
  index.html           # Vite entry (replaces the old static app)
  manifest.json        # kept (existing)
  icons/               # kept (existing)
  netlify.toml
  vite.config.js
  package.json
```

Field naming: the API and all JS speak **camelCase**; snake_case appears only inside `_db.js`/SQL via the maps in `shared/fields.js`.

---

## Task 1: Scaffold the Vite React app

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`
- Delete: old `service-worker.js` (replaced in Task 19); leave `manifest.json` + `icons/` in place
- Note: the old static `index.html` is overwritten by the new Vite entry below

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "card-scanner",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.9.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.1.1",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
  },
})
```

- [ ] **Step 3: Create `src/test-setup.js`**

```js
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#0f1014" />
  <title>Card Scanner</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 5: Create `src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './theme.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
```

- [ ] **Step 6: Create placeholder `src/App.jsx` and `src/theme.css`**

```jsx
export default function App() {
  return <div>Card Scanner</div>
}
```

```css
:root { color-scheme: dark; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
```

- [ ] **Step 7: Install and verify the app builds**

Run: `npm install && npm run build`
Expected: build succeeds, `dist/` is produced.

- [ ] **Step 8: Commit**

```bash
git add package.json vite.config.js index.html src/ -- ':!src/test-setup.js'
git add src/test-setup.js
git rm --cached service-worker.js 2>/dev/null; rm -f service-worker.js
git commit -m "chore: scaffold Vite + React app, retire static service worker"
```

---

## Task 2: Database migration

**Files:**
- Create: `migrations/0001_init.sql`

- [ ] **Step 1: Write the migration**

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name    text NOT NULL DEFAULT '',
  last_name     text NOT NULL DEFAULT '',
  title         text NOT NULL DEFAULT '',
  company       text NOT NULL DEFAULT '',
  work_phone    text NOT NULL DEFAULT '',
  mobile_phone  text NOT NULL DEFAULT '',
  email         text NOT NULL DEFAULT '',
  website       text NOT NULL DEFAULT '',
  street        text NOT NULL DEFAULT '',
  city          text NOT NULL DEFAULT '',
  province      text NOT NULL DEFAULT '',
  postal_code   text NOT NULL DEFAULT '',
  country       text NOT NULL DEFAULT '',
  notes         text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contacts_email_lower_idx ON contacts (lower(email));
CREATE INDEX contacts_search_trgm_idx ON contacts
  USING gin ((lower(first_name || ' ' || last_name || ' ' || company)) gin_trgm_ops);
```

- [ ] **Step 2: Apply it (manual infra step — run against the new Neon project)**

The new Neon project `card-scanner` is created via the Neon MCP/console. Apply
`migrations/0001_init.sql` to its default branch, and also to a `test` branch used by
the integration test. Record the connection strings as `DATABASE_URL` (default) and
`DATABASE_URL_TEST` (test branch).

Expected: `\d contacts` shows 16 columns and the two indexes.

- [ ] **Step 3: Commit**

```bash
git add migrations/0001_init.sql
git commit -m "feat: add contacts table migration with pg_trgm indexes"
```

---

## Task 3: Shared fields module (TDD)

**Files:**
- Create: `shared/fields.js`, `shared/fields.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest'
import { CAMEL_KEYS, emptyContact, coerceFields, rowToContact, contactToRow } from './fields.js'

describe('fields', () => {
  it('has 14 camelCase keys', () => {
    expect(CAMEL_KEYS).toHaveLength(14)
    expect(CAMEL_KEYS).toContain('firstName')
    expect(CAMEL_KEYS).toContain('postalCode')
  })

  it('emptyContact is all empty strings', () => {
    const c = emptyContact()
    expect(Object.keys(c)).toHaveLength(14)
    expect(c.firstName).toBe('')
  })

  it('coerceFields fills missing keys with "" and drops unknown keys', () => {
    const out = coerceFields({ firstName: 'Maya', bogus: 'x' })
    expect(out.firstName).toBe('Maya')
    expect(out.lastName).toBe('')
    expect('bogus' in out).toBe(false)
  })

  it('rowToContact maps snake_case row to camelCase + id', () => {
    const c = rowToContact({ id: 'u1', first_name: 'Maya', postal_code: 'V6B' })
    expect(c.id).toBe('u1')
    expect(c.firstName).toBe('Maya')
    expect(c.postalCode).toBe('V6B')
  })

  it('contactToRow maps camelCase to snake_case (no id)', () => {
    const row = contactToRow({ firstName: 'Maya', postalCode: 'V6B' })
    expect(row.first_name).toBe('Maya')
    expect(row.postal_code).toBe('V6B')
    expect('id' in row).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/fields.test.js`
Expected: FAIL — cannot import from `./fields.js`.

- [ ] **Step 3: Write `shared/fields.js`**

```js
export const CAMEL_KEYS = [
  'firstName', 'lastName', 'title', 'company',
  'workPhone', 'mobilePhone', 'email', 'website',
  'street', 'city', 'province', 'postalCode', 'country', 'notes',
]

const CAMEL_TO_SNAKE = {
  firstName: 'first_name', lastName: 'last_name', title: 'title', company: 'company',
  workPhone: 'work_phone', mobilePhone: 'mobile_phone', email: 'email', website: 'website',
  street: 'street', city: 'city', province: 'province', postalCode: 'postal_code',
  country: 'country', notes: 'notes',
}
const SNAKE_TO_CAMEL = Object.fromEntries(
  Object.entries(CAMEL_TO_SNAKE).map(([k, v]) => [v, k]),
)

export function emptyContact() {
  return Object.fromEntries(CAMEL_KEYS.map((k) => [k, '']))
}

export function coerceFields(obj) {
  const out = emptyContact()
  for (const k of CAMEL_KEYS) {
    if (obj && typeof obj[k] === 'string') out[k] = obj[k]
  }
  return out
}

export function rowToContact(row) {
  const c = { id: row.id }
  for (const [snake, camel] of Object.entries(SNAKE_TO_CAMEL)) {
    c[camel] = row[snake] ?? ''
  }
  return c
}

export function contactToRow(contact) {
  const row = {}
  for (const k of CAMEL_KEYS) {
    row[CAMEL_TO_SNAKE[k]] = contact[k] ?? ''
  }
  return row
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run shared/fields.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/fields.js shared/fields.test.js
git commit -m "feat: shared fields module with camel/snake mapping and coercion"
```

---

## Task 4: Confidence heuristic (TDD)

**Files:**
- Create: `shared/confidence.js`, `shared/confidence.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest'
import { computeConfidence } from './confidence.js'
import { emptyContact } from './fields.js'

const base = emptyContact()

describe('computeConfidence', () => {
  it('high when a name and one contact method exist', () => {
    expect(computeConfidence({ ...base, firstName: 'Maya', lastName: 'Rodriguez', email: 'm@x.co' })).toBe('high')
  })
  it('check when name is fully empty', () => {
    expect(computeConfidence({ ...base, company: 'Acme', email: 'm@x.co' })).toBe('check')
  })
  it('check when all contact methods are empty', () => {
    expect(computeConfidence({ ...base, firstName: 'Maya', lastName: 'Rodriguez' })).toBe('check')
  })
  it('high with only mobile phone', () => {
    expect(computeConfidence({ ...base, firstName: 'Maya', lastName: 'R', mobilePhone: '+1604' })).toBe('high')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/confidence.test.js`
Expected: FAIL — cannot import `computeConfidence`.

- [ ] **Step 3: Write `shared/confidence.js`**

```js
export function computeConfidence(fields) {
  const nameEmpty = !fields.firstName && !fields.lastName
  const noContact = !fields.workPhone && !fields.mobilePhone && !fields.email
  return nameEmpty || noContact ? 'check' : 'high'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run shared/confidence.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/confidence.js shared/confidence.test.js
git commit -m "feat: deterministic extraction confidence heuristic"
```

---

## Task 5: vCard generation (TDD)

**Files:**
- Create: `shared/vcard.js`, `shared/vcard.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest'
import { contactToVCard, contactsToVCardFile, vcardFilename } from './vcard.js'
import { emptyContact } from './fields.js'

const maya = { ...emptyContact(), firstName: 'Maya', lastName: 'Rodriguez', company: 'Northbeam', email: 'm@nb.co', workPhone: '+16045550148' }

describe('vcard', () => {
  it('produces a valid single vCard', () => {
    const v = contactToVCard(maya)
    expect(v).toContain('BEGIN:VCARD')
    expect(v).toContain('VERSION:3.0')
    expect(v).toContain('FN:Maya Rodriguez')
    expect(v).toContain('N:Rodriguez;Maya;;;')
    expect(v).toContain('ORG:Northbeam')
    expect(v).toContain('EMAIL:m@nb.co')
    expect(v).toContain('TEL;TYPE=WORK,VOICE:+16045550148')
    expect(v.trim().endsWith('END:VCARD')).toBe(true)
  })

  it('escapes commas and semicolons', () => {
    const v = contactToVCard({ ...emptyContact(), company: 'A, B; C' })
    expect(v).toContain('ORG:A\\, B\\; C')
  })

  it('falls back to company then Unknown for FN', () => {
    expect(contactToVCard({ ...emptyContact(), company: 'Acme' })).toContain('FN:Acme')
    expect(contactToVCard(emptyContact())).toContain('FN:Unknown')
  })

  it('concatenates many into one file', () => {
    const file = contactsToVCardFile([maya, maya])
    expect(file.match(/BEGIN:VCARD/g)).toHaveLength(2)
  })

  it('builds a filename from the name', () => {
    expect(vcardFilename(maya)).toBe('rodriguez-maya.vcf')
    expect(vcardFilename(emptyContact())).toBe('contact.vcf')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/vcard.test.js`
Expected: FAIL — cannot import from `./vcard.js`.

- [ ] **Step 3: Write `shared/vcard.js`** (port of the existing app's logic)

```js
function esc(s) {
  if (!s) return ''
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

export function contactToVCard(c) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0']
  const fn = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.company || 'Unknown'
  lines.push('FN:' + esc(fn))
  lines.push('N:' + esc(c.lastName) + ';' + esc(c.firstName) + ';;;')
  if (c.company) lines.push('ORG:' + esc(c.company))
  if (c.title) lines.push('TITLE:' + esc(c.title))
  if (c.workPhone) lines.push('TEL;TYPE=WORK,VOICE:' + esc(c.workPhone))
  if (c.mobilePhone) lines.push('TEL;TYPE=CELL:' + esc(c.mobilePhone))
  if (c.email) lines.push('EMAIL:' + esc(c.email))
  if (c.website) lines.push('URL:' + esc(c.website))
  if (c.street || c.city || c.province || c.postalCode || c.country) {
    lines.push('ADR;TYPE=WORK:;;' + esc(c.street) + ';' + esc(c.city) + ';' + esc(c.province) + ';' + esc(c.postalCode) + ';' + esc(c.country))
  }
  if (c.notes) lines.push('NOTE:' + esc(c.notes))
  lines.push('END:VCARD')
  return lines.join('\r\n') + '\r\n'
}

export function contactsToVCardFile(contacts) {
  return contacts.map(contactToVCard).join('')
}

export function vcardFilename(c) {
  const first = (c.firstName || '').toLowerCase().replace(/\s+/g, '-')
  const last = (c.lastName || '').toLowerCase().replace(/\s+/g, '-')
  if (last && first) return `${last}-${first}.vcf`
  if (last) return `${last}.vcf`
  if (first) return `${first}.vcf`
  return 'contact.vcf'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run shared/vcard.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/vcard.js shared/vcard.test.js
git commit -m "feat: vCard generation module (single + batch)"
```

---

## Task 6: Dedup match predicate (TDD)

**Files:**
- Create: `shared/dedup.js`, `shared/dedup.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest'
import { normalizeEmail, matchedOn } from './dedup.js'

describe('dedup', () => {
  it('normalizes email', () => {
    expect(normalizeEmail('  Maya@NB.co ')).toBe('maya@nb.co')
    expect(normalizeEmail('')).toBe('')
  })
  it('matches on email when emails are equal (case/space-insensitive)', () => {
    const a = { email: 'maya@nb.co', firstName: 'Maya', lastName: 'R', company: 'X' }
    const b = { email: 'MAYA@nb.co ', firstName: 'Different', lastName: 'Z', company: 'Y' }
    expect(matchedOn(a, b)).toBe('email')
  })
  it('matches on name+company when both equal and no email', () => {
    const a = { email: '', firstName: 'Maya', lastName: 'Rodriguez', company: 'Northbeam' }
    const b = { email: '', firstName: ' maya ', lastName: 'RODRIGUEZ', company: 'northbeam' }
    expect(matchedOn(a, b)).toBe('name+company')
  })
  it('returns null when nothing matches', () => {
    const a = { email: 'a@x.co', firstName: 'Maya', lastName: 'R', company: 'X' }
    const b = { email: 'b@x.co', firstName: 'Tom', lastName: 'A', company: 'Y' }
    expect(matchedOn(a, b)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/dedup.test.js`
Expected: FAIL — cannot import from `./dedup.js`.

- [ ] **Step 3: Write `shared/dedup.js`**

```js
export function normalizeEmail(e) {
  return (e || '').trim().toLowerCase()
}

function norm(s) {
  return (s || '').trim().toLowerCase()
}

export function matchedOn(candidate, existing) {
  const ce = normalizeEmail(candidate.email)
  const ee = normalizeEmail(existing.email)
  if (ce && ee && ce === ee) return 'email'
  const sameName = norm(candidate.firstName) === norm(existing.firstName)
    && norm(candidate.lastName) === norm(existing.lastName)
  const sameCompany = norm(candidate.company) === norm(existing.company)
  const hasName = norm(candidate.firstName) || norm(candidate.lastName)
  if (hasName && sameName && norm(candidate.company) && sameCompany) return 'name+company'
  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run shared/dedup.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/dedup.js shared/dedup.test.js
git commit -m "feat: pure duplicate-match predicate"
```

---

## Task 7: DB client + PIN guard for functions

**Files:**
- Create: `netlify/functions/_db.js`

- [ ] **Step 1: Write `_db.js`**

```js
import { neon } from '@neondatabase/serverless'

export const sql = neon(process.env.DATABASE_URL)

export function checkPin(req) {
  const auth = req.headers.get('authorization') || ''
  const pin = auth.replace(/^Bearer\s+/i, '')
  return pin && pin === process.env.APP_PIN
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export function unauthorized() {
  return json({ error: 'Unauthorized' }, 401)
}
```

- [ ] **Step 2: Verify it imports (lint-level check)**

Run: `node --input-type=module -e "import('./netlify/functions/_db.js').then(()=>console.log('ok')).catch(e=>{console.error(e);process.exit(1)})"`
Expected: prints `ok` (env vars unset is fine; `neon()` is lazy).

- [ ] **Step 3: Commit**

```bash
git add netlify/functions/_db.js
git commit -m "feat: Neon client + PIN guard helper for functions"
```

---

## Task 8: `/api/contacts` — list/search + create/bulk (integration test against Neon)

**Files:**
- Create: `netlify/functions/contacts.js`, `netlify/functions/contacts.test.js`

- [ ] **Step 1: Write the failing integration test** (real Neon `test` branch)

```js
import { describe, it, expect, beforeAll } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { rowToContact, contactToRow } from '../../shared/fields.js'

const dbUrl = process.env.DATABASE_URL_TEST
const run = dbUrl ? describe : describe.skip
const sql = dbUrl ? neon(dbUrl) : null

run('contacts table contract', () => {
  beforeAll(async () => { await sql`DELETE FROM contacts` })

  it('insert via contactToRow then read back via rowToContact round-trips', async () => {
    const row = contactToRow({ firstName: 'Maya', lastName: 'Rodriguez', company: 'Northbeam', email: 'm@nb.co' })
    const [inserted] = await sql`
      INSERT INTO contacts (first_name, last_name, company, email)
      VALUES (${row.first_name}, ${row.last_name}, ${row.company}, ${row.email})
      RETURNING *`
    const c = rowToContact(inserted)
    expect(c.firstName).toBe('Maya')
    expect(c.email).toBe('m@nb.co')
    expect(c.id).toBeTruthy()

    const found = await sql`SELECT * FROM contacts WHERE lower(email) = ${'m@nb.co'}`
    expect(found).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails (or skips without DB)**

Run: `DATABASE_URL_TEST=<neon test branch> npx vitest run netlify/functions/contacts.test.js`
Expected: FAIL only if the table/columns are wrong; with a correct migration it should PASS. If `DATABASE_URL_TEST` is unset the suite is skipped (and you MUST set it before claiming this task done — a skipped integration test does not satisfy the spec's integration requirement).

- [ ] **Step 3: Write `contacts.js`**

```js
import { sql, checkPin, json, unauthorized } from './_db.js'
import { rowToContact, contactToRow } from '../../shared/fields.js'

export default async function handler(req) {
  if (!checkPin(req)) return unauthorized()

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const q = (url.searchParams.get('query') || '').trim().toLowerCase()
    const rows = q
      ? await sql`
          SELECT * FROM contacts
          WHERE lower(first_name || ' ' || last_name || ' ' || company) LIKE ${'%' + q + '%'}
             OR lower(email) LIKE ${'%' + q + '%'}
          ORDER BY created_at DESC`
      : await sql`SELECT * FROM contacts ORDER BY created_at DESC`
    return json(rows.map(rowToContact))
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const list = Array.isArray(body) ? body : [body]
    const created = []
    for (const contact of list) {
      const r = contactToRow(contact)
      const [row] = await sql`
        INSERT INTO contacts (first_name, last_name, title, company, work_phone, mobile_phone, email, website, street, city, province, postal_code, country, notes)
        VALUES (${r.first_name}, ${r.last_name}, ${r.title}, ${r.company}, ${r.work_phone}, ${r.mobile_phone}, ${r.email}, ${r.website}, ${r.street}, ${r.city}, ${r.province}, ${r.postal_code}, ${r.country}, ${r.notes})
        RETURNING *`
      created.push(rowToContact(row))
    }
    return json(created, 201)
  }

  return json({ error: 'Method not allowed' }, 405)
}

export const config = { path: '/api/contacts' }
```

- [ ] **Step 4: Run the integration test to verify it passes**

Run: `DATABASE_URL_TEST=<neon test branch> npx vitest run netlify/functions/contacts.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/contacts.js netlify/functions/contacts.test.js
git commit -m "feat: /api/contacts list/search + create/bulk with integration test"
```

---

## Task 9: `/api/contacts/:id` — PATCH + DELETE

**Files:**
- Create: `netlify/functions/contact.js`

- [ ] **Step 1: Write `contact.js`**

```js
import { sql, checkPin, json, unauthorized } from './_db.js'
import { rowToContact, contactToRow } from '../../shared/fields.js'

export default async function handler(req) {
  if (!checkPin(req)) return unauthorized()
  const id = new URL(req.url).pathname.split('/').pop()

  if (req.method === 'PATCH') {
    const r = contactToRow(await req.json())
    const [row] = await sql`
      UPDATE contacts SET
        first_name=${r.first_name}, last_name=${r.last_name}, title=${r.title}, company=${r.company},
        work_phone=${r.work_phone}, mobile_phone=${r.mobile_phone}, email=${r.email}, website=${r.website},
        street=${r.street}, city=${r.city}, province=${r.province}, postal_code=${r.postal_code},
        country=${r.country}, notes=${r.notes}, updated_at=now()
      WHERE id=${id} RETURNING *`
    if (!row) return json({ error: 'Not found' }, 404)
    return json(rowToContact(row))
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM contacts WHERE id=${id}`
    return json({ ok: true })
  }

  return json({ error: 'Method not allowed' }, 405)
}

export const config = { path: '/api/contacts/:id' }
```

- [ ] **Step 2: Verify the module imports**

Run: `node --input-type=module -e "import('./netlify/functions/contact.js').then(()=>console.log('ok'))"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add netlify/functions/contact.js
git commit -m "feat: /api/contacts/:id PATCH + DELETE"
```

---

## Task 10: `/api/contacts/match` — duplicate detection

**Files:**
- Create: `netlify/functions/match.js`

- [ ] **Step 1: Write `match.js`**

```js
import { sql, checkPin, json, unauthorized } from './_db.js'
import { rowToContact } from '../../shared/fields.js'
import { matchedOn } from '../../shared/dedup.js'

export default async function handler(req) {
  if (!checkPin(req)) return unauthorized()
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const candidates = await req.json()
  const existingRows = await sql`SELECT * FROM contacts`
  const existing = existingRows.map(rowToContact)

  const results = candidates.map((cand) => {
    for (const ex of existing) {
      const on = matchedOn(cand, ex)
      if (on) return { match: { id: ex.id, matchedOn: on } }
    }
    return { match: null }
  })
  return json(results)
}

export const config = { path: '/api/contacts/match' }
```

- [ ] **Step 2: Verify the module imports**

Run: `node --input-type=module -e "import('./netlify/functions/match.js').then(()=>console.log('ok'))"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add netlify/functions/match.js
git commit -m "feat: /api/contacts/match duplicate detection"
```

---

## Task 11: `/api/extract` — Claude vision (confidence tested via fixtures)

**Files:**
- Create: `netlify/functions/extract.js`, `netlify/functions/extract.test.js`

- [ ] **Step 1: Confirm the model id**

Use the `claude-api` reference skill to confirm the current Claude Sonnet vision model
id. Set it as the `MODEL` constant in `extract.js`. Do NOT ship a stale dated id without
checking.

- [ ] **Step 2: Write the failing test** (tests the pure response→fields+confidence path)

```js
import { describe, it, expect } from 'vitest'
import { parseExtraction } from './extract.js'

describe('parseExtraction', () => {
  it('parses clean JSON and computes high confidence', () => {
    const text = JSON.stringify({ firstName: 'Maya', lastName: 'R', email: 'm@x.co' })
    const out = parseExtraction(text)
    expect(out.fields.firstName).toBe('Maya')
    expect(out.fields.lastName).toBe('R')
    expect(out.confidence).toBe('high')
  })
  it('strips code fences', () => {
    const text = '```json\n{"firstName":"Maya","lastName":"R","mobilePhone":"+1"}\n```'
    expect(parseExtraction(text).fields.firstName).toBe('Maya')
  })
  it('throws on non-JSON', () => {
    expect(() => parseExtraction('not json')).toThrow()
  })
  it('coerces missing keys and flags check confidence', () => {
    const out = parseExtraction(JSON.stringify({ company: 'Acme' }))
    expect(out.fields.firstName).toBe('')
    expect(out.confidence).toBe('check')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run netlify/functions/extract.test.js`
Expected: FAIL — cannot import `parseExtraction`.

- [ ] **Step 4: Write `extract.js`**

```js
import { checkPin, json, unauthorized } from './_db.js'
import { coerceFields } from '../../shared/fields.js'
import { computeConfidence } from '../../shared/confidence.js'

const MODEL = 'claude-sonnet-4-5'

const INSTRUCTION = "Extract the contact details from this business card. Return ONLY a valid JSON object with these exact keys: firstName, lastName, title, company, workPhone, mobilePhone, email, website, street, city, province, postalCode, country, notes. If a field is not present on the card, return an empty string for that key. Phone numbers should be in E.164 format where possible. Do not include any preamble, explanation, markdown, or code fences. Return the JSON object only."

export function parseExtraction(text) {
  let raw = text.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  const parsed = JSON.parse(raw)
  const fields = coerceFields(parsed)
  return { fields, confidence: computeConfidence(fields) }
}

export default async function handler(req) {
  if (!checkPin(req)) return unauthorized()
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const { image, mediaType } = await req.json()
  if (!image) return json({ error: 'No image' }, 400)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
        { type: 'text', text: INSTRUCTION },
      ] }],
    }),
  })
  const data = await res.json()
  if (!res.ok) return json({ error: data?.error?.message || `API error ${res.status}` }, 502)

  const block = (data.content || []).find((b) => b.type === 'text')
  if (!block) return json({ error: 'No text block in response' }, 502)
  try {
    return json(parseExtraction(block.text))
  } catch {
    return json({ error: 'Could not parse card', raw: block.text }, 422)
  }
}

export const config = { path: '/api/extract' }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run netlify/functions/extract.test.js`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add netlify/functions/extract.js netlify/functions/extract.test.js
git commit -m "feat: /api/extract Claude vision with deterministic confidence"
```

---

## Task 12: Client API wrapper + camera/resize

**Files:**
- Create: `src/lib/api.js`, `src/lib/camera.js`

- [ ] **Step 1: Write `src/lib/api.js`**

```js
const PIN_KEY = 'cs_pin'

export function getPin() { return sessionStorage.getItem(PIN_KEY) || '' }
export function setPin(p) { sessionStorage.setItem(PIN_KEY, p) }
export function clearPin() { sessionStorage.removeItem(PIN_KEY) }

async function call(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${getPin()}`, ...(opts.headers || {}) },
  })
  if (res.status === 401) { clearPin(); throw new Error('Unauthorized') }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const api = {
  verifyPin: (pin) => fetch('/api/contacts', { headers: { authorization: `Bearer ${pin}` } }).then((r) => r.ok),
  extract: (image, mediaType) => call('/api/extract', { method: 'POST', body: JSON.stringify({ image, mediaType }) }),
  listContacts: (query = '') => call(`/api/contacts${query ? `?query=${encodeURIComponent(query)}` : ''}`),
  createContacts: (contactsOrOne) => call('/api/contacts', { method: 'POST', body: JSON.stringify(contactsOrOne) }),
  updateContact: (id, contact) => call(`/api/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(contact) }),
  deleteContact: (id) => call(`/api/contacts/${id}`, { method: 'DELETE' }),
  matchDuplicates: (candidates) => call('/api/contacts/match', { method: 'POST', body: JSON.stringify(candidates) }),
}
```

- [ ] **Step 2: Write `src/lib/camera.js`** (port of the existing resize logic)

```js
const MAX_PX = 1600
const QUALITY = 0.82

export function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > MAX_PX || height > MAX_PX) {
        if (width >= height) { height = Math.round(height * MAX_PX / width); width = MAX_PX }
        else { width = Math.round(width * MAX_PX / height); height = MAX_PX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', QUALITY)
      resolve({ b64: dataUrl.split(',')[1], type: 'image/jpeg', dataUrl })
    }
    img.onerror = reject
    img.src = url
  })
}

export function downloadVcf(filename, content) {
  const blob = new Blob([content], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.js src/lib/camera.js
git commit -m "feat: client API wrapper and camera/resize/download helpers"
```

---

## Task 13: Theme tokens + TabBar + Avatar

**Files:**
- Modify: `src/theme.css`
- Create: `src/components/TabBar.jsx`, `src/components/Avatar.jsx`

- [ ] **Step 1: Write `src/theme.css`** (dark default + light variant, brass accent)

```css
:root {
  color-scheme: dark;
  --bg: #0f1014; --surface: #1a1b22; --surface-2: #2a2b33;
  --text: #f2efe8; --text-2: #97968f; --text-3: #6a6a66;
  --accent: #e0a94a; --accent-ink: #1a1306;
  --ok: #56c9a4; --warn: #e7b257; --line: rgba(255,255,255,.07);
}
[data-theme='light'] {
  color-scheme: light;
  --bg: #f6f3ec; --surface: #ffffff; --surface-2: #eae6dc;
  --text: #1b1b1f; --text-2: #6f6e66; --text-3: #97968f;
  --accent: #cf9b34; --accent-ink: #ffffff;
  --ok: #2c7d62; --warn: #8a6618; --line: rgba(0,0,0,.08);
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
#root { max-width: 480px; margin: 0 auto; min-height: 100dvh; }
button { font-family: inherit; }
.btn-primary { background: var(--accent); color: var(--accent-ink); border: none;
  border-radius: 14px; padding: 14px; font-size: 16px; font-weight: 600; width: 100%; }
.input { width: 100%; background: var(--surface); color: var(--text);
  border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; font-size: 16px; }
```

- [ ] **Step 2: Write `src/components/Avatar.jsx`**

```jsx
export default function Avatar({ contact, size = 40 }) {
  const initials = ((contact.firstName?.[0] || '') + (contact.lastName?.[0] || '')).toUpperCase()
    || (contact.company?.[0] || '?').toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.32, flex: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'color-mix(in srgb, var(--accent) 16%, transparent)',
      color: 'var(--accent)', fontWeight: 600, fontSize: size * 0.33 }}>
      {initials}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/TabBar.jsx`**

```jsx
import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Cards' },
  { to: '/scan', label: 'Scan', primary: true },
  { to: '/settings', label: 'Settings' },
]

export default function TabBar() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, height: 72, background: 'var(--surface)',
      borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center',
      justifyContent: 'space-around' }}>
      {TABS.map((t) => {
        const active = pathname === t.to
        if (t.primary) {
          return (
            <button key={t.to} onClick={() => nav(t.to)} aria-label="Scan"
              style={{ width: 54, height: 54, borderRadius: 18, marginTop: -18,
                background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none',
                fontSize: 24, fontWeight: 700 }}>+</button>
          )
        }
        return (
          <button key={t.to} onClick={() => nav(t.to)}
            style={{ background: 'none', border: 'none', fontSize: 12,
              color: active ? 'var(--accent)' : 'var(--text-3)' }}>{t.label}</button>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/theme.css src/components/Avatar.jsx src/components/TabBar.jsx
git commit -m "feat: theme tokens (dark/light), TabBar, Avatar"
```

---

## Task 14: App shell + PIN gate + routes

**Files:**
- Modify: `src/App.jsx`
- Create: `src/screens/PinGate.jsx`

- [ ] **Step 1: Write `src/screens/PinGate.jsx`**

```jsx
import { useState } from 'react'
import { api } from '../lib/api.js'
import { setPin } from '../lib/api.js'

export default function PinGate({ onUnlock }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault()
    setError('')
    const ok = await api.verifyPin(value)
    if (ok) { setPin(value); onUnlock() } else setError('Wrong PIN')
  }
  return (
    <form onSubmit={submit} style={{ padding: '120px 24px 0', display: 'flex',
      flexDirection: 'column', gap: 16, alignItems: 'center' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600 }}>Card Scanner</h1>
      <input className="input" type="password" inputMode="numeric" value={value}
        onChange={(e) => setValue(e.target.value)} placeholder="Enter PIN" autoFocus
        style={{ maxWidth: 240, textAlign: 'center' }} />
      {error && <p style={{ color: 'var(--warn)', fontSize: 13 }}>{error}</p>}
      <button className="btn-primary" style={{ maxWidth: 240 }}>Unlock</button>
    </form>
  )
}
```

- [ ] **Step 2: Write `src/App.jsx`**

```jsx
import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { getPin } from './lib/api.js'
import PinGate from './screens/PinGate.jsx'
import Library from './screens/Library.jsx'
import Capture from './screens/Capture.jsx'
import Review from './screens/Review.jsx'
import Contact from './screens/Contact.jsx'
import Settings from './screens/Settings.jsx'
import TabBar from './components/TabBar.jsx'

export default function App() {
  const [unlocked, setUnlocked] = useState(!!getPin())
  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />
  return (
    <>
      <div style={{ paddingBottom: 88 }}>
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/scan" element={<Capture />} />
          <Route path="/review" element={<Review />} />
          <Route path="/contact/:id" element={<Contact />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
      <TabBar />
    </>
  )
}
```

- [ ] **Step 3: Create stub screens so the app compiles**

Create `src/screens/Library.jsx`, `Capture.jsx`, `Review.jsx`, `Contact.jsx`,
`Settings.jsx`, each exporting a default component returning its name in an `<h1>`.
Example for `Library.jsx`:

```jsx
export default function Library() { return <h1>Library</h1> }
```

(Repeat the same one-line pattern for Capture, Review, Contact, Settings — replacing the
name. These are fully replaced in Tasks 15–19.)

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/screens/
git commit -m "feat: app shell, PIN gate, routes with screen stubs"
```

---

## Task 15: Library screen (list + search + filter) — TDD on filtering

**Files:**
- Create: `src/screens/Library.jsx`, `src/screens/Library.test.jsx`

- [ ] **Step 1: Write the failing test** (search calls the API with the query)

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Library from './Library.jsx'
import { api } from '../lib/api.js'

vi.mock('../lib/api.js', () => ({
  api: { listContacts: vi.fn() },
}))

beforeEach(() => {
  api.listContacts.mockResolvedValue([
    { id: '1', firstName: 'Maya', lastName: 'Rodriguez', title: 'VP', company: 'Northbeam' },
  ])
})

describe('Library', () => {
  it('lists contacts on load', async () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    expect(await screen.findByText('Maya Rodriguez')).toBeInTheDocument()
  })
  it('re-queries when searching', async () => {
    render(<MemoryRouter><Library /></MemoryRouter>)
    await screen.findByText('Maya Rodriguez')
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'north' } })
    await waitFor(() => expect(api.listContacts).toHaveBeenLastCalledWith('north'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/screens/Library.test.jsx`
Expected: FAIL — stub Library renders only `<h1>Library</h1>`.

- [ ] **Step 3: Write `src/screens/Library.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import Avatar from '../components/Avatar.jsx'

export default function Library() {
  const nav = useNavigate()
  const [contacts, setContacts] = useState([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    const t = setTimeout(() => {
      api.listContacts(query).then((rows) => { if (active) setContacts(rows) }).catch(() => {})
    }, query ? 250 : 0)
    return () => { active = false; clearTimeout(t) }
  }, [query])

  return (
    <div style={{ padding: '24px 18px 0' }}>
      <h1 style={{ fontSize: 23, fontWeight: 600, margin: 0 }}>Cards</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 12, margin: '2px 0 14px' }}>{contacts.length} contacts</p>
      <input className="input" placeholder="Search name, company…" value={query}
        onChange={(e) => setQuery(e.target.value)} />
      <div style={{ marginTop: 12 }}>
        {contacts.map((c) => (
          <button key={c.id} onClick={() => nav(`/contact/${c.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%',
              background: 'none', border: 'none', borderBottom: '1px solid var(--line)',
              padding: '11px 0', textAlign: 'left', color: 'var(--text)' }}>
            <Avatar contact={c} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{`${c.firstName} ${c.lastName}`.trim()}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                {[c.title, c.company].filter(Boolean).join(' · ')}
              </div>
            </div>
          </button>
        ))}
        {contacts.length === 0 && (
          <p style={{ color: 'var(--text-3)', textAlign: 'center', marginTop: 48 }}>
            No contacts yet. Tap + to scan a card.
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/screens/Library.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/screens/Library.jsx src/screens/Library.test.jsx
git commit -m "feat: Library screen with debounced search"
```

---

## Task 16: Capture screen (native picker, single + batch)

**Files:**
- Create: `src/screens/Capture.jsx`
- Note: captured items are passed to Review via `navigate('/review', { state })`

- [ ] **Step 1: Write `src/screens/Capture.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resizeImage } from '../lib/camera.js'

export default function Capture() {
  const nav = useNavigate()
  const [batch, setBatch] = useState(false)
  const [shots, setShots] = useState([])

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const r = await resizeImage(file)
    const shot = { b64: r.b64, type: r.type, dataUrl: r.dataUrl }
    if (batch) setShots((s) => [...s, shot])
    else nav('/review', { state: { shots: [shot] } })
  }

  return (
    <div style={{ padding: '24px 18px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Scan card</h1>
        <label style={{ fontSize: 13, color: 'var(--text-2)' }}>
          <input type="checkbox" checked={batch} onChange={(e) => setBatch(e.target.checked)} /> Batch
        </label>
      </div>

      <div style={{ marginTop: 24, border: '2px dashed var(--accent)', borderRadius: 16,
        aspectRatio: '16/10', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-2)', fontSize: 13, textAlign: 'center', padding: 16 }}>
        Align the card and take a clear, well-lit photo
      </div>

      <label className="btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: 18 }}>
        {batch ? 'Add a card' : 'Take or upload card photo'}
        <input type="file" accept="image/*" capture="environment" onChange={onFile}
          style={{ display: 'none' }} />
      </label>

      {batch && shots.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            {shots.map((s, i) => (
              <img key={i} src={s.dataUrl} alt={`Card ${i + 1}`}
                style={{ width: 64, height: 44, objectFit: 'cover', borderRadius: 8 }} />
            ))}
          </div>
          <button className="btn-primary" style={{ marginTop: 16 }}
            onClick={() => nav('/review', { state: { shots } })}>
            Review {shots.length} {shots.length === 1 ? 'card' : 'cards'}
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Capture.jsx
git commit -m "feat: Capture screen with native picker and batch filmstrip"
```

---

## Task 17: Review screen (extract, confidence, dedup, save) — TDD on orchestration

**Files:**
- Create: `src/screens/Review.jsx`, `src/screens/Review.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Review from './Review.jsx'
import { api } from '../lib/api.js'

vi.mock('../lib/api.js', () => ({
  api: {
    extract: vi.fn(),
    matchDuplicates: vi.fn(),
    createContacts: vi.fn(),
  },
}))

function renderWithShots(shots) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/review', state: { shots } }]}>
      <Routes>
        <Route path="/review" element={<Review />} />
        <Route path="/" element={<div>Library</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  api.extract.mockResolvedValue({ fields: { firstName: 'Maya', lastName: 'R', email: 'm@x.co' }, confidence: 'high' })
  api.matchDuplicates.mockResolvedValue([{ match: null }])
  api.createContacts.mockResolvedValue([{ id: '1' }])
})

describe('Review', () => {
  it('extracts each shot and shows the name', async () => {
    renderWithShots([{ b64: 'x', type: 'image/jpeg' }])
    expect(await screen.findByDisplayValue('Maya')).toBeInTheDocument()
    expect(api.extract).toHaveBeenCalledTimes(1)
  })
  it('saves on confirm', async () => {
    renderWithShots([{ b64: 'x', type: 'image/jpeg' }])
    await screen.findByDisplayValue('Maya')
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(api.createContacts).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/screens/Review.test.jsx`
Expected: FAIL — stub Review.

- [ ] **Step 3: Write `src/screens/Review.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../lib/api.js'
import { CAMEL_KEYS, emptyContact } from '../../shared/fields.js'

const LABELS = {
  firstName: 'First name', lastName: 'Last name', title: 'Title', company: 'Company',
  workPhone: 'Work phone', mobilePhone: 'Mobile phone', email: 'Email', website: 'Website',
  street: 'Street', city: 'City', province: 'Province', postalCode: 'Postal code',
  country: 'Country', notes: 'Notes',
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      try { out[idx] = await fn(items[idx], idx) } catch (e) { out[idx] = { error: e.message } }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

export default function Review() {
  const nav = useNavigate()
  const shots = useLocation().state?.shots || []
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (shots.length === 0) { nav('/'); return }
    mapLimit(shots, 3, (shot) => api.extract(shot.b64, shot.type)).then(async (results) => {
      const initial = results.map((r) => ({
        fields: r.error ? emptyContact() : r.fields,
        confidence: r.error ? 'check' : r.confidence,
        error: r.error || null,
        dupe: null,
        action: 'save',
      }))
      const matches = await api.matchDuplicates(initial.map((c) => c.fields)).catch(() => [])
      setCards(initial.map((c, i) => ({ ...c, dupe: matches[i]?.match || null,
        action: matches[i]?.match ? 'skip' : 'save' })))
      setLoading(false)
    })
  }, [])

  function update(idx, key, value) {
    setCards((cs) => cs.map((c, i) => i === idx ? { ...c, fields: { ...c.fields, [key]: value } } : c))
  }
  function setAction(idx, action) {
    setCards((cs) => cs.map((c, i) => i === idx ? { ...c, action } : c))
  }

  async function save() {
    setSaving(true)
    const toCreate = cards.filter((c) => c.action === 'save').map((c) => c.fields)
    const toUpdate = cards.filter((c) => c.action === 'update' && c.dupe)
    if (toCreate.length) await api.createContacts(toCreate)
    for (const c of toUpdate) await api.updateContact(c.dupe.id, c.fields)
    nav('/')
  }

  if (loading) return <p style={{ padding: 48, textAlign: 'center', color: 'var(--text-2)' }}>Reading {shots.length > 1 ? 'cards' : 'card'}…</p>

  const single = cards.length === 1
  return (
    <div style={{ padding: '24px 18px 0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600 }}>{single ? 'Review details' : `Review ${cards.length} cards`}</h1>
      {cards.map((card, idx) => (
        <div key={idx} style={{ borderTop: idx ? '1px solid var(--line)' : 'none', paddingTop: idx ? 16 : 8, marginTop: idx ? 16 : 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: 14 }}>{`${card.fields.firstName} ${card.fields.lastName}`.trim() || 'Untitled card'}</strong>
            <span style={{ fontSize: 11, fontWeight: 600,
              color: card.confidence === 'high' ? 'var(--ok)' : 'var(--warn)' }}>
              {card.confidence === 'high' ? 'High' : 'Check'}
            </span>
          </div>
          {card.dupe && (
            <div style={{ background: 'color-mix(in srgb, var(--warn) 14%, transparent)',
              borderRadius: 10, padding: 10, marginBottom: 10, fontSize: 12 }}>
              Possible duplicate (matched on {card.dupe.matchedOn).
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {['skip', 'save', 'update'].map((a) => (
                  <button key={a} onClick={() => setAction(idx, a)}
                    style={{ flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 12,
                      border: '1px solid var(--line)',
                      background: card.action === a ? 'var(--accent)' : 'transparent',
                      color: card.action === a ? 'var(--accent-ink)' : 'var(--text)' }}>
                    {a === 'skip' ? 'Skip' : a === 'save' ? 'Save new' : 'Update'}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(single ? CAMEL_KEYS : ['firstName', 'lastName', 'company', 'email', 'workPhone']).map((key) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--text-2)' }}>{LABELS[key]}</label>
              <input className="input" value={card.fields[key]}
                onChange={(e) => update(idx, key, e.target.value)} />
            </div>
          ))}
        </div>
      ))}
      <button className="btn-primary" style={{ margin: '16px 0 24px' }} disabled={saving} onClick={save}>
        {saving ? 'Saving…' : `Save ${cards.filter((c) => c.action !== 'skip').length} ${single ? 'contact' : 'contacts'}`}
      </button>
    </div>
  )
}
```

> Note: fix the JSX typo before running — the duplicate banner line must read
> `matched on {card.dupe.matchedOn})` with a closing paren as plain text, i.e.
> `Possible duplicate (matched on {card.dupe.matchedOn}).`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/screens/Review.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/screens/Review.jsx src/screens/Review.test.jsx
git commit -m "feat: Review screen with batch extract, confidence, dedup, save"
```

---

## Task 18: Contact detail (actions, vCard export, edit, delete)

**Files:**
- Create: `src/screens/Contact.jsx`

- [ ] **Step 1: Write `src/screens/Contact.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { CAMEL_KEYS } from '../../shared/fields.js'
import { contactToVCard, vcardFilename } from '../../shared/vcard.js'
import { downloadVcf } from '../lib/camera.js'
import Avatar from '../components/Avatar.jsx'

const LABELS = { workPhone: 'Work', mobilePhone: 'Mobile', email: 'Email', website: 'Website' }

export default function Contact() {
  const { id } = useParams()
  const nav = useNavigate()
  const [c, setC] = useState(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    api.listContacts().then((rows) => setC(rows.find((x) => x.id === id) || null))
  }, [id])

  if (!c) return <p style={{ padding: 48, textAlign: 'center', color: 'var(--text-2)' }}>Loading…</p>

  async function saveEdit() { await api.updateContact(id, c); setEditing(false) }
  async function remove() {
    if (!confirm('Delete this contact?')) return
    await api.deleteContact(id); nav('/')
  }

  return (
    <div style={{ padding: '24px 18px 0' }}>
      <button onClick={() => nav('/')} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 14 }}>‹ Cards</button>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 8 }}>
        <Avatar contact={c} size={64} />
        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 10 }}>{`${c.firstName} ${c.lastName}`.trim()}</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{[c.title, c.company].filter(Boolean).join(' · ')}</div>
      </div>

      <div style={{ display: 'flex', gap: 9, margin: '16px 0' }}>
        <a className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none', padding: 11 }} href={`tel:${c.workPhone || c.mobilePhone}`}>Call</a>
        <a className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none', padding: 11 }} href={`mailto:${c.email}`}>Email</a>
        <button className="btn-primary" style={{ padding: 11 }}
          onClick={() => downloadVcf(vcardFilename(c), contactToVCard(c))}>vCard</button>
      </div>

      {editing ? (
        <>
          {CAMEL_KEYS.map((k) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--text-2)' }}>{k}</label>
              <input className="input" value={c[k]} onChange={(e) => setC({ ...c, [k]: e.target.value })} />
            </div>
          ))}
          <button className="btn-primary" onClick={saveEdit}>Save changes</button>
        </>
      ) : (
        <>
          {['workPhone', 'mobilePhone', 'email', 'website'].filter((k) => c[k]).map((k) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--text-2)', fontSize: 13 }}>{LABELS[k]}</span>
              <span style={{ fontSize: 14 }}>{c[k]}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button onClick={() => setEditing(true)} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--line)', background: 'none', color: 'var(--text)' }}>Edit</button>
            <button onClick={remove} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--line)', background: 'none', color: 'var(--warn)' }}>Delete</button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Contact.jsx
git commit -m "feat: Contact detail with call/email/vCard, edit, delete"
```

---

## Task 19: Settings + PWA service worker (versioned cache)

**Files:**
- Create: `src/screens/Settings.jsx`, `public/sw.js`
- Modify: `src/main.jsx` (register SW), `manifest.json` (confirm name/icons)

- [ ] **Step 1: Write `src/screens/Settings.jsx`**

```jsx
import { useNavigate } from 'react-router-dom'
import { api, clearPin } from '../lib/api.js'
import { contactsToVCardFile } from '../../shared/vcard.js'
import { downloadVcf } from '../lib/camera.js'

export default function Settings() {
  const nav = useNavigate()
  async function exportAll() {
    const rows = await api.listContacts()
    if (!rows.length) return alert('No contacts to export.')
    downloadVcf('card-scanner-contacts.vcf', contactsToVCardFile(rows))
  }
  return (
    <div style={{ padding: '24px 18px 0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600 }}>Settings</h1>
      <button className="btn-primary" style={{ marginTop: 16 }} onClick={exportAll}>Export all contacts (.vcf)</button>
      <button onClick={() => { clearPin(); nav('/'); location.reload() }}
        style={{ width: '100%', marginTop: 12, padding: 14, borderRadius: 14, border: '1px solid var(--line)', background: 'none', color: 'var(--text)' }}>
        Lock app
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Write `public/sw.js`** (versioned cache — bump `CACHE` on each release)

```js
const CACHE = 'card-scanner-v1'
self.addEventListener('install', (e) => { self.skipWaiting() })
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
  )).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (url.pathname.startsWith('/api/')) return
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put(e.request, copy))
      return res
    }).catch(() => caches.match(e.request)),
  )
})
```

- [ ] **Step 3: Register the SW — append to `src/main.jsx`**

```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
```

- [ ] **Step 4: Verify build + tests**

Run: `npm run build && npx vitest run`
Expected: build succeeds; all unit/component tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Settings.jsx public/sw.js src/main.jsx manifest.json
git commit -m "feat: Settings (export-all, lock) + versioned service worker"
```

---

## Task 20: Netlify config + deploy + smoke

**Files:**
- Create: `netlify.toml`

- [ ] **Step 1: Write `netlify.toml`**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- [ ] **Step 2: Provision Netlify site + env vars (manual infra step)**

Create Netlify site `card-scanner-mph`, connect Git CD to `mphampson89/card-scanner`
`main`. Set env vars: `DATABASE_URL` (Neon `card-scanner` default branch),
`ANTHROPIC_API_KEY`, `APP_PIN=288989`.

- [ ] **Step 3: Merge the feature branch and deploy**

```bash
git checkout main
git merge --no-ff card-scanner-library -m "feat: contact-library rebuild"
git push origin main
```

Expected: Netlify build runs `npm run build`, publishes `dist`, deploys functions.

- [ ] **Step 4: Smoke test (record evidence)**

Verify on the live URL:
1. Wrong PIN is rejected; `288989` unlocks.
2. Scan one card → fields extracted → Save → appears in Library.
3. Search filters the library.
4. Batch: two cards → review both with confidence chips → save both.
5. Re-scan a saved card → duplicate flagged → Skip/Update works.
6. Contact detail → Export vCard downloads a valid `.vcf`.
7. `/api/contacts` returns 401 without the PIN header.

- [ ] **Step 5: Commit netlify.toml (if not already on the branch)**

```bash
git add netlify.toml
git commit -m "chore: Netlify build + functions config"
```

---

## Self-review notes (addressed)

- **Spec coverage:** Library (T15), Capture/batch (T16), Review + confidence + dedup (T11, T17), Contact + vCard export + edit + delete (T18), search/filter (T15), PIN gate + server-side key (T14, T11), Neon schema (T2), discard-photo (no blob code anywhere), out-of-scope items absent (no Cromwell/tags/blob). ✅
- **Integration test:** T8 hits a real Neon `test` branch (skips only if `DATABASE_URL_TEST` unset — flagged as a must-set). ✅
- **Type consistency:** API speaks camelCase everywhere; snake_case confined to `_db.js`/SQL via `shared/fields.js` maps; `matchedOn` field name consistent across `dedup.js`, `match.js`, and `Review.jsx`. ✅
- **Model id:** T11 Step 1 forces confirming the current Sonnet id via `claude-api` before shipping. ✅
- **Known JSX typo** in the Review duplicate banner is explicitly called out to fix before running its test.
