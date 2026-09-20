# Note Nest

A playful, mobile-first first slice for kids learning beginner music theory and piano. It includes a guided note-name lesson, an interactive treble staff, touch-friendly piano keys with optional Web Audio, and a quick identification quiz.

## Local development

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. Validate a production build with `npm run build`; run the focused tests with `npm test`.

## Deploying to GitHub Pages

The included `.github/workflows/deploy.yml` builds and publishes on pushes to `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. Vite is configured with a relative base path, so the static app works for project pages and custom domains.
