# Note Nest

A playful, mobile-first first slice for kids learning beginner music theory and piano. It includes a guided treble-clef lesson, an interactive staff with accurate C4–C5 pitch positions, touch-friendly piano keys with optional Web Audio, a quick identification quiz, and a microphone-guided practice mode that listens for the correct pitch before advancing. C4 is middle C, shown on a ledger line below the staff.

The interface is Swedish by default. Use the visible **Svenska / English** language toggle to switch languages; the selection is saved in `localStorage` and restored on the next visit. The lesson covers the C4–C5 range (C4 middle C through the C5 above the treble staff). The lesson keyboard includes touch-friendly black keys for C♯4/D♭4, D♯4/E♭4, F♯4/G♭4, G♯4/A♭4, and A♯4/B♭4, with labels and selection highlighting. The quiz intentionally stays white-note-only so learners practise the eight pitches shown on the staff. The microphone practice mode is also focused on the C4–C5 range and works best when you play a real piano close to the device microphone in a quiet room.

## Local development

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. Validate a production build with `npm run build`; run the tests with `npm test -- --run`.

## Deploying to GitHub Pages

The included `.github/workflows/deploy.yml` builds and publishes on pushes to `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. Vite is configured with a relative base path, so the static app works for project pages and custom domains.
