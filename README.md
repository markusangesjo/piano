# Note Nest

A playful, mobile-first first slice for kids learning beginner music theory and piano. It includes a guided note-name lesson, an interactive treble staff, touch-friendly piano keys with optional Web Audio, and a quick identification quiz.

The interface is Swedish by default. Use the visible **Svenska / English** language toggle to switch languages; the selection is saved in `localStorage` and restored on the next visit. Note letters remain A–G in both languages.

## Local development

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. Validate a production build with `npm run build`; run the tests with `npm test -- --run`.

## Deploying to GitHub Pages

The included `.github/workflows/deploy.yml` builds and publishes on pushes to `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. Vite is configured with a relative base path, so the static app works for project pages and custom domains.
