# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a young beginner — a child learning their first music theory — practising **alone** on a phone or tablet, with no adult sitting beside them (confirmed by the user). Everything the child needs must therefore be self-explanatory in the moment: no adult in the room to decode terminology, and no one to recover a dead end.

A secondary audience is implicit in the product surface rather than confirmed: an adult may install the PWA or hand over the device, but the app is not designed around adult supervision.

## Product Purpose

Note Nest is a playful, mobile-first first slice of music education for curious kids. It teaches the treble clef over the C4–C5 range and makes the child connect a written note to a real sound they produce.

Success means a child finishes a session having correctly matched notes by reading the staff, and having played them on a real piano with their own hands.

## Positioning

The microphone-guided practice loop: the app listens to a *real acoustic piano* through the device microphone and only advances when the child plays the pitch shown on the staff. It is recognition of physical playing, not a virtual-keyboard exercise — a neighbouring app that only renders an on-screen piano cannot truthfully copy this.

The pitch detection is explained in plain language (a YIN-style periodicity analysis reported as frequency, clarity, and level), which makes the mechanism visible rather than magic.

## Operating Context

- The child uses a phone or tablet, typically holding it on or near the piano, likely as an installed home-screen app.
- The centrepiece workflow needs a real piano or keyboard nearby, close to the device microphone, in a quiet room. This dependency is real and unavoidable — it shapes what the product can promise.
- Use is offline-capable from the first production visit; the app makes no third-party requests at runtime (self-hosted DM Sans and Nunito woff2 files, precached by the service worker).
- The interface is Swedish by default with a visible **Svenska / English** toggle; the choice persists in `localStorage` and is restored on the next visit.

## Capabilities and Constraints

Confirmed functionality: a guided treble-clef lesson; an interactive staff with accurate C4–C5 pitch positions (C4 is middle C, on a ledger line below the staff); a touch-friendly piano keyboard with black keys for the accidentals and selection highlighting; a white-note-only identification quiz; a microphone-guided practice mode; three songs (Blinka lilla stjärna, Spanien är ett land där man dansar tango, the opening of Für Elise); and a **Felsökning / Debug** tab that prints detected pitch, frequency, clarity, level, and the reason a reading was accepted or ignored.

Constraints and conventions:

- Scope is deliberately narrow: the C4–C5 range, one clef, eight white notes. This is a first slice, not a full curriculum.
- The quiz intentionally asks only for white notes, but shows the full keyboard so it looks like a real piano. Tapping a black key plays its pitch and points the child back to the staff instead of advancing the round.
- Web platform only. React 18 + TypeScript + Vite, with `vite-plugin-pwa` for the installable, offline shell.
- All user-facing strings live in `src/copy.tsx` as a single `COPY` object keyed by language; both languages must stay in step.
- The footer stamps a version resolved from the release tag at deploy time.
- Swedish terminology in use: *diskantklav* (treble clef), *mitt-C* (middle C), *ton* (pitch), *Felsökning* (debug).

Explicitly undecided:

- **Accessibility and inclusion** — the user was asked and recorded no requirement, so standard web defaults apply. Do not claim a conformance level.
- **Build path** (comp-first vs code-first) — no image generation is available in this session, so nothing was recorded and code-first is the only path.

## Brand Commitments

- The name is **Note Nest**, and the framing of pitches as friendly companions is intentional: the lesson is "Möt dina tonvänner" / "Meet your pitch friends."
- Voice: playful, warm, encouraging, zero-stakes. "Made for curious ears · No wrong notes here 🎵" / "Gjord för nyfikna öron · Inga fel toner här 🎵".
- Bilingual by design, Swedish-first, both languages equally maintained.
- Identity assets in the repo: `public/icon.svg`, `public/apple-touch-icon.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, with `#7165d7` as the recorded theme colour.
- The child is never blamed. Wrong answers are framed as "Almost!" / "Nästan!" with a redirect, never a failure state.

## Evidence on Hand

- Real, verified content: three complete public-domain song sequences in `src/songs.ts`, with note sequences checked as playable.
- A real pitch-detection implementation (`src/pitchDetector.ts`, `src/useMicrophone.ts`) with unit tests, not a mock.
- Genuine accessibility text for the musical surfaces: ARIA labels for the staff and keyboard exist in `src/copy.tsx`.

Absences that future work must not fabricate: there are no testimonials, named customers, usage statistics, partnerships, pricing, accreditation, or endorsements anywhere in this project. Do not invent any.

## Product Principles

1. **The child is alone; the interface must be the teacher.** Every instruction, label, and error state has to work without an adult translating it.
2. **Real playing beats simulated playing.** The differentiator is hearing an actual piano. Protect the microphone loop, and be honest about what it needs.
3. **One narrow promise, kept fully.** Eight notes, one clef, three songs. Deepen within the range before widening it.
4. **A wrong note is a redirect, never a failure.** Feedback always points the child back to the staff or keyboard and lets them try again immediately.
5. **Show the mechanism.** The Debug tab exists so the pitch detection is inspectable rather than magic.

## Accessibility & Inclusion

No product-specific requirement was established — the user was asked directly and recorded none. Standard web defaults apply; do not assert a conformance level until one is confirmed.

Two facts already hold in the codebase and should be preserved as defaults: the document language follows the on-screen language (`<html lang>` is kept in sync for screen readers), and the musical surfaces carry ARIA labels. Touch targets are sized for small hands.
