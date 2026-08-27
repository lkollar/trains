# Repo Guide for Agents

This repo is a static PWA with Vite as its development server. There is no
production build pipeline or test runner. Files are plain HTML/CSS/JS at repo
root.

## Commands

### Run locally
- First setup: `npm install`
- Start: `npm run dev`
- Open the local URL Vite prints; default is `http://localhost:5173`

### Build
- None configured. Deploy the static source files.

### Lint
- None configured.

### Tests
- Syntax: `node --check app.js && node --check sw.js`
- Patch hygiene: `git diff --check`
- No test runner configured.

### Single test
- Not applicable (no test runner).

## Layout
- `index.html`: main page shell
- `styles.css`: global styles
- `app.js`: data fetch + render
- `manifest.json`: PWA manifest
- `sw.js`: service worker
- `icon.svg`: PWA icon
- `package.json`: Vite development command
- `package-lock.json`: locked development dependencies
- `README.md`: usage notes

## Data source
- API base: `https://departureboard-io-api-mj7fisk44q-nw.a.run.app/api/v1.0`
- Endpoint: `getFormattedJourneyByCRS?sourceCRS=ELW&destCRS=CST`
- CORS: public, browser fetch ok

## UI behavior
- Auto refresh: 60s interval in `app.js`
- Manual refresh: button in header
- Route tabs: Eltham → Cannon Street and reverse
- Alerts: `alert_messages` rendered when present
- Loop badge: duration > 45 minutes OR stops > 12
- Platform: prominent station-board block; hidden value shown as `tbd`
- Revised departure times shown as `Expected HH:MM`

## HTML style
- Keep semantic tags (`main`, `header`, `section`, `article`).
- Prefer class selectors over inline styles.
- Keep IDs only for JS hooks (`#departures`, `#alerts`, etc).
- Maintain accessibility roles and `aria-*` for tabs.

## CSS style
- Use CSS variables in `:root` for colors.
- Keep palette warm/earthy; avoid purple.
- Prefer `clamp()` for type size if needed.
- Keep responsive tweaks in a single `@media` block.
- Avoid heavy layout frameworks; use flex/grid.

## JS style
- Plain ES6, no production build step.
- Use `const` by default; `let` only when needed.
- Keep functions small and pure when possible.
- Use template literals for HTML rendering.
- Escape all API-provided values before inserting them via `innerHTML`.
- Handle network errors with try/catch; fail gracefully.
- Keep timers in module scope and clear when rescheduling.
- Avoid global leaks; file is module-like but loaded as script.

## Naming
- Constants: `UPPER_SNAKE` for tunables.
- Functions: `camelCase` verbs (`renderServices`).
- DOM hooks: `elements` map with camelCase keys.
- CSS classes: kebab-case (`service-card`).

## Imports
- None. Vite serves source files directly during development.
- Do not add a framework or production bundling pipeline unless requested.
- External assets via CDN only if needed.

## Formatting
- 2-space indentation in HTML/CSS/JS.
- One statement per line in JS.
- Keep lines under ~100 chars where possible.

## Types
- No TypeScript. If adding complex data handling, document
  shapes via JSDoc (optional) but keep minimal.

## Error handling
- Network failures should show user-facing status text.
- Do not throw uncaught errors in UI thread.
- If API shape changes, fallback to safe defaults.

## PWA rules
- Update `CACHE_NAME` on cache changes.
- Keep cached asset list in `sw.js` in sync with files.
- Avoid caching API responses; use `no-store` fetch.
- Ensure `manifest.json` stays in root.
- Do not register the service worker on localhost. Vite can return transformed
  JavaScript for cache requests to CSS paths, causing strict MIME failures.

## Deployment
- GitHub Pages serving root of repo.
- Paths are relative; do not hardcode base path.

## Accessibility
- Keep high contrast text on cards.
- Status labels must be text (not color only).
- Buttons need clear labels.

## Content rules
- Use British spelling where visible to users.
- Keep UI copy terse.
- No emojis unless requested.

## Repo-specific gotchas
- Loop service is real and slower; keep badge logic.
- Platform may be hidden; display "Platform tbd".
- `departureDue` can be "On time" or time string.
- `alert_messages` may be string or array.
- Abort superseded fetches so rapid route changes cannot render stale results.

## If you add new files
- Keep at repo root.
- Update `sw.js` cache list.
- Update `manifest.json` if adding icons.

## Rule files
- No `.cursor/rules`, `.cursorrules`, or
  `.github/copilot-instructions.md` in this repo.
