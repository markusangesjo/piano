// Note-name templates for every semitone, used to label pitches across the
// full piano spectrum (not just the C4-C5 octave covered by MIDI_LABELS).
const NOTE_NAME_TEMPLATES: ReadonlyArray<(octave: number) => string> = [
  (o) => `C${o}`,
  (o) => `C♯${o} / D♭${o}`,
  (o) => `D${o}`,
  (o) => `D♯${o} / E♭${o}`,
  (o) => `E${o}`,
  (o) => `F${o}`,
  (o) => `F♯${o} / G♭${o}`,
  (o) => `G${o}`,
  (o) => `G♯${o} / A♭${o}`,
  (o) => `A${o}`,
  (o) => `A♯${o} / B♭${o}`,
  (o) => `B${o}`,
]
// A0 (lowest key on a standard 88-key piano) to C8 (highest key), in MIDI numbers.
const MIN_PIANO_MIDI = 21
const MAX_PIANO_MIDI = 108
export function midiToNoteLabel(midi: number): string | null {
  if (midi < MIN_PIANO_MIDI || midi > MAX_PIANO_MIDI) return null
  const octave = Math.floor(midi / 12) - 1
  const index = ((midi % 12) + 12) % 12
  return NOTE_NAME_TEMPLATES[index](octave)
}

export type PitchDetection = {
  frequency: number
  // clarity is 1 minus the winning CMNDF value: how confidently the detector
  // locked onto a single periodic pitch (closer to 1 is a cleaner, more
  // certain match; lower values mean a noisier or more ambiguous signal).
  clarity: number
  // rms is the input signal's loudness for the analysed window.
  rms: number
}

export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
  minFrequency = 196,
  maxFrequency = 660,
  minimumRms = 0.01,
  reusableDifference?: Float32Array,
  reusableCmndf?: Float32Array,
): PitchDetection | null {
  const bufferSize = buffer.length

  let rms = 0
  for (let i = 0; i < bufferSize; i += 1) rms += buffer[i] * buffer[i]
  rms = Math.sqrt(rms / bufferSize)
  if (rms < minimumRms) return null

  // A YIN-style detector (difference function + cumulative mean normalization)
  // tracks the true fundamental far more reliably than plain autocorrelation,
  // which tends to lock onto strong harmonics of real piano notes (an issue
  // most noticeable from G4 upward where those overtones sit inside range).
  // Defaults (196-660 Hz) give a tight margin around the app's playable range
  // (A3-C5); callers analysing the full piano spectrum (e.g. debug mode) pass
  // wider bounds together with a larger analyser buffer.
  const maxLag = Math.min(Math.floor(sampleRate / minFrequency), bufferSize - 1)
  const minLag = Math.max(2, Math.floor(sampleRate / maxFrequency))
  if (maxLag <= minLag) return null

  // Callers that analyse every animation frame can hand in scratch buffers so
  // no arrays are allocated per frame. Every entry that gets read is written
  // below (difference[0] is never read), so reuse cannot leak stale data.
  const difference = reusableDifference && reusableDifference.length >= maxLag + 1
    ? reusableDifference
    : new Float32Array(maxLag + 1)
  for (let lag = 1; lag <= maxLag; lag += 1) {
    let sum = 0
    const limit = bufferSize - lag
    for (let i = 0; i < limit; i += 1) {
      const delta = buffer[i] - buffer[i + lag]
      sum += delta * delta
    }
    difference[lag] = sum
  }

  const cmndf = reusableCmndf && reusableCmndf.length >= maxLag + 1
    ? reusableCmndf
    : new Float32Array(maxLag + 1)
  cmndf[0] = 1
  let runningSum = 0
  for (let lag = 1; lag <= maxLag; lag += 1) {
    runningSum += difference[lag]
    cmndf[lag] = runningSum === 0 ? 1 : (difference[lag] * lag) / runningSum
  }

  const threshold = 0.2
  let bestLag = -1
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    if (cmndf[lag] < threshold) {
      while (lag + 1 <= maxLag && cmndf[lag + 1] < cmndf[lag]) lag += 1
      bestLag = lag
      break
    }
  }

  if (bestLag === -1) {
    let bestValue = Infinity
    for (let lag = minLag; lag <= maxLag; lag += 1) {
      if (cmndf[lag] < bestValue) {
        bestValue = cmndf[lag]
        bestLag = lag
      }
    }
    if (bestLag === -1 || bestValue > 0.35) return null
  }

  // Parabolic interpolation around the winning lag for sub-sample precision.
  let refinedLag = bestLag
  const winningValue = cmndf[bestLag]
  if (bestLag > 1 && bestLag < maxLag) {
    const s0 = cmndf[bestLag - 1]
    const s1 = cmndf[bestLag]
    const s2 = cmndf[bestLag + 1]
    const denominator = s0 - 2 * s1 + s2
    if (denominator !== 0) {
      const delta = (s0 - s2) / (2 * denominator)
      if (delta > -1 && delta < 1) refinedLag = bestLag + delta
    }
  }

  if (refinedLag <= 0) return null
  return { frequency: sampleRate / refinedLag, clarity: Math.max(0, 1 - winningValue), rms }
}

export function frequencyToMidi(frequency: number) {
  return Math.round(69 + 12 * Math.log2(frequency / 440))
}
