# Note Nest

A playful, mobile-first first slice for kids learning beginner music theory and piano. It includes a guided treble-clef lesson, an interactive staff with accurate C4–C5 pitch positions, touch-friendly piano keys with optional Web Audio, a quick identification quiz, and a microphone-guided practice mode that listens for the correct pitch before advancing. C4 is middle C, shown on a ledger line below the staff.

Learners can practise the free C4–C5 lesson, play along to three songs (Blinka lilla stjärna, Spanien är ett land där man dansar tango, and the opening of Für Elise) or open the **Felsökning / Debug** tab, which prints the detected pitch, its frequency, clarity and level together with the reason a reading was accepted or ignored. The footer shows the running version, which is stamped from the release tag during deployment.

The interface is Swedish by default. Use the visible **Svenska / English** language toggle to switch languages; the selection is saved in `localStorage` and restored on the next visit. The lesson covers the C4–C5 range (C4 middle C through the C5 above the treble staff). The lesson keyboard includes touch-friendly black keys for C♯4/D♭4, D♯4/E♭4, F♯4/G♭4, G♯4/A♭4, and A♯4/B♭4, with labels and selection highlighting. The quiz intentionally stays white-note-only so learners practise the eight pitches shown on the staff. The microphone practice mode is also focused on the C4–C5 range and works best when you play a real piano close to the device microphone in a quiet room.

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

Check types, linting and the production build the same way CI does:

```bash
npm run lint
npm run build
```

Notes:

- Install prompts are browser-dependent. Chromium browsers show a native install UI; on iPhone/iPad, use Safari’s **Add to Home Screen** action.
- The app works offline from the first production visit, including its fonts: DM Sans and Nunito are self-hosted woff2 files in `src/assets/fonts/`, precached by the service worker, so the app makes no third-party requests at runtime.
- `.github/workflows/ci.yml` runs lint, tests and the build on every pull request and on pushes to `main`, and deploys `main` to GitHub Pages (see [Checks and deployment](#checks-and-deployment)).

## Checks and deployment

`.github/workflows/ci.yml` is a single workflow that both verifies pull requests and publishes `main`:

1. **Resolve version** reads the release tag for the commit, or creates and pushes the next patch tag when a commit lands on `main`.
2. **Checks and build** runs `npm ci`, `npm run lint`, `npm test` and `npm run build` (with `VITE_BASE_PATH=/piano/` and the resolved version) on every pull request and on pushes to `main`.
3. On pushes to `main` (or a manual run) the same job uploads the build output as a GitHub Pages artifact, and **Deploy to GitHub Pages** publishes it to the `github-pages` environment.

Pull requests only run the checks: the Pages and deploy steps are skipped, so a pull request can never publish to the live site.

## Deploying to GitHub Pages

Publishing happens from `.github/workflows/ci.yml` on pushes to `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

The workflow builds the PWA with `VITE_BASE_PATH=/piano/` so the manifest scope, service worker, and asset URLs match this repository’s GitHub Pages project URL. If you later move the app to a custom domain or a different subpath, update that environment variable to the deployed root path (for example `/`).
