# Note Nest

A playful, mobile-first first slice for kids learning beginner music theory and piano. It includes a guided treble-clef lesson, an interactive staff with accurate C4–C5 pitch positions, touch-friendly piano keys with optional Web Audio, and a quick identification quiz. C4 is middle C, shown on a ledger line below the staff.

The interface is Swedish by default. Use the visible **Svenska / English** language toggle to switch languages; the selection is saved in `localStorage` and restored on the next visit. The lesson covers the C4–C5 range (C4 middle C through the C5 above the treble staff). The lesson keyboard includes touch-friendly black keys for C♯4/D♭4, D♯4/E♭4, F♯4/G♭4, G♯4/A♭4, and A♯4/B♭4, with labels and selection highlighting. The quiz intentionally stays white-note-only so learners practise the eight pitches shown on the staff.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. For normal app development, the service worker stays disabled in dev mode so cached assets do not interfere with iteration.

Validate the production build and the generated PWA locally with:

```bash
npm run build
npm run preview
```

Then open the preview URL in Chrome, Edge, or Safari and:

1. confirm the app offers installation or **Add to Home Screen**
2. load the app once while online so the shell and icons are cached
3. switch the browser to offline mode and refresh to confirm the lesson and piano still open

Run the tests with:

```bash
npm test
```

Notes:

- Install prompts are browser-dependent. Chromium browsers show a native install UI; on iPhone/iPad, use Safari’s **Add to Home Screen** action.
- The app itself works offline after the first production visit. Google Fonts are cached when available, but if a browser blocks or skips those requests the app falls back to system fonts without affecting piano/audio behavior.

## Deploying to GitHub Pages

The included `.github/workflows/deploy.yml` builds and publishes on pushes to `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. Vite is configured with a relative base path, so the static app works for project pages and custom domains.
