# Note Nest

A playful, mobile-first first slice for kids learning beginner music theory and piano. It includes a guided treble-clef lesson, an interactive staff with accurate C4–C5 pitch positions, touch-friendly piano keys with optional Web Audio, and a quick identification quiz. C4 is middle C, shown on a ledger line below the staff.

The interface is Swedish by default. Use the visible **Svenska / English** language toggle to switch languages; the selection is saved in `localStorage` and restored on the next visit. The lesson covers the C4–C5 range (C4 middle C through the C5 above the treble staff).

## Local development

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. Validate a production build with `npm run build`; run the tests with `npm test -- --run`.

## Deploying to GitHub Pages

The included `.github/workflows/deploy.yml` builds and publishes on pushes to `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. Vite is configured with a relative base path, so the static app works for project pages and custom domains.
