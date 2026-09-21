import type { Language } from './types'

export const PITCHES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'] as const
export type Pitch = typeof PITCHES[number]
export const BLACK_KEYS = [
  { id: 'C#4/Db4', label: 'C♯4 / D♭4', frequency: 277.18 },
  { id: 'D#4/Eb4', label: 'D♯4 / E♭4', frequency: 311.13 },
  { id: 'F#4/Gb4', label: 'F♯4 / G♭4', frequency: 369.99 },
  { id: 'G#4/Ab4', label: 'G♯4 / A♭4', frequency: 415.3 },
  { id: 'A#4/Bb4', label: 'A♯4 / B♭4', frequency: 466.16 },
] as const
export type BlackKey = typeof BLACK_KEYS[number]['id']
export type PianoKey = Pitch | BlackKey
export type SongPitch = Pitch | 'A3' | 'B3' | 'D#4'

export const PRACTICE_SEQUENCE = [...PITCHES] as const

export const PITCH_TO_MIDI: Record<SongPitch, number> = { A3: 57, B3: 59, C4: 60, D4: 62, 'D#4': 63, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71, C5: 72 }
// Labels for every pitch the app asks the learner to play: the C4-C5 practice
// octave plus the A3/B3 notes used by the songs. A detected MIDI number missing
// from this map is intentionally reported as "no stable pitch yet", so anything
// outside the supported range (a stray low/high octave reading) never counts.
export const MIDI_LABELS: Record<number, string> = {
  57: 'A3',
  59: 'B3',
  60: 'C4',
  61: 'C♯4 / D♭4',
  62: 'D4',
  63: 'D♯4 / E♭4',
  64: 'E4',
  65: 'F4',
  66: 'F♯4 / G♭4',
  67: 'G4',
  68: 'G♯4 / A♭4',
  69: 'A4',
  70: 'A♯4 / B♭4',
  71: 'B4',
  72: 'C5',
}

export const PITCH_INFO: Record<SongPitch, { letter: string; octave: number; y: number; frequency: number; color: string; hint: Record<Language, string> }> = {
  A3: { letter: 'A', octave: 3, y: 170, frequency: 220, color: '#f8a23a', hint: { sv: 'A3 ligger under mitt-C.', en: 'A3 is below middle C.' } },
  B3: { letter: 'B', octave: 3, y: 160, frequency: 246.94, color: '#ee6f8f', hint: { sv: 'B3 ligger under mitt-C.', en: 'B3 is below middle C.' } },
  C4: { letter: 'C', octave: 4, y: 150, frequency: 261.63, color: '#7d70dc', hint: { sv: 'C4 är mitt-C – precis mitt på pianot.', en: 'C4 is middle C — right at the heart of the piano.' } },
  D4: { letter: 'D', octave: 4, y: 140, frequency: 293.66, color: '#40bfa3', hint: { sv: 'D4 ligger i utrymmet under notlinjerna.', en: 'D4 sits in the space below the staff.' } },
  'D#4': { letter: 'D♯', octave: 4, y: 140, frequency: 311.13, color: '#40bfa3', hint: { sv: 'D♯4 är den svarta tangenten mellan D4 och E4.', en: 'D♯4 is the black key between D4 and E4.' } },
  E4: { letter: 'E', octave: 4, y: 130, frequency: 329.63, color: '#efb342', hint: { sv: 'E4 ligger på den nedersta linjen.', en: 'E4 sits on the bottom line.' } },
  F4: { letter: 'F', octave: 4, y: 120, frequency: 349.23, color: '#ea8055', hint: { sv: 'F4 ligger i det första utrymmet.', en: 'F4 sits in the first space.' } },
  G4: { letter: 'G', octave: 4, y: 110, frequency: 392, color: '#5ca3df', hint: { sv: 'G4 ligger på den mittersta linjen.', en: 'G4 sits on the middle line.' } },
  A4: { letter: 'A', octave: 4, y: 100, frequency: 440, color: '#f8a23a', hint: { sv: 'A4 ligger i det andra utrymmet.', en: 'A4 sits in the second space.' } },
  B4: { letter: 'B', octave: 4, y: 90, frequency: 493.88, color: '#ee6f8f', hint: { sv: 'B4 ligger på den näst översta linjen.', en: 'B4 sits on the second line from the top.' } },
  C5: { letter: 'C', octave: 5, y: 80, frequency: 523.25, color: '#9b7bd8', hint: { sv: 'C5 ligger i det översta utrymmet.', en: 'C5 sits in the top space.' } },
}

export const getPitchInfo = (pitch: Pitch) => PITCH_INFO[pitch]
export const pitchLabel = (pitch: Pitch) => pitch
const BLACK_KEY_FREQUENCIES = new Map(BLACK_KEYS.map((key) => [key.id, key.frequency] as const))

export const getFrequency = (pitch: PianoKey) => pitch in PITCH_INFO ? PITCH_INFO[pitch as Pitch].frequency : BLACK_KEY_FREQUENCIES.get(pitch as BlackKey) ?? null
