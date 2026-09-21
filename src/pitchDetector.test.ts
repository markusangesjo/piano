import { describe, expect, it } from 'vitest'
import { detectPitch, frequencyToMidi, midiToNoteLabel } from './pitchDetector'

const sineWave = (frequency: number, { sampleRate = 44100, length = 2048, amplitude = 0.4 } = {}) => {
  const buffer = new Float32Array(length)
  for (let i = 0; i < length; i += 1) buffer[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * amplitude
  return buffer
}

describe('detectPitch', () => {
  it('resolves every note of the C4-C5 practice range', () => {
    for (const frequency of [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25]) {
      const detection = detectPitch(sineWave(frequency), 44100, 196, 660, 0.01)
      expect(frequencyToMidi(detection?.frequency ?? 0)).toBe(frequencyToMidi(frequency))
    }
  })

  it('resolves the low A3 and B3 notes used by the songs', () => {
    expect(frequencyToMidi(detectPitch(sineWave(220), 44100, 196, 660, 0.01)?.frequency ?? 0)).toBe(57)
    expect(frequencyToMidi(detectPitch(sineWave(246.94), 44100, 196, 660, 0.01)?.frequency ?? 0)).toBe(59)
  })

  it('reports nothing for silence', () => {
    expect(detectPitch(new Float32Array(2048), 44100, 196, 660, 0.01)).toBeNull()
  })

  it('documents how notes far above the band fold down', () => {
    // Known limitation of a lag-limited YIN search: a note well above the search
    // band can fold down onto its subharmonic, so C6 (1046 Hz) reads as C5. The
    // band starts at A3 - the lowest note any lesson or song asks for - and C5
    // is a real target, so this is a pre-existing trade-off rather than a bug;
    // the test pins the behaviour down so it cannot change unnoticed.
    const detection = detectPitch(sineWave(1046.5), 44100, 196, 660, 0.01)
    expect(frequencyToMidi(detection?.frequency ?? 0)).toBe(72)
  })

  it('reuses caller-provided scratch buffers across frames', () => {
    const difference = new Float32Array(1024)
    const cmndf = new Float32Array(1024)
    const first = detectPitch(sineWave(440), 44100, 196, 660, 0.01, difference, cmndf)
    const second = detectPitch(sineWave(220), 44100, 196, 660, 0.01, difference, cmndf)
    expect(frequencyToMidi(first?.frequency ?? 0)).toBe(69)
    expect(frequencyToMidi(second?.frequency ?? 0)).toBe(57)
  })
})

describe('midiToNoteLabel', () => {
  it('labels the notes below the practice octave by name', () => {
    expect(midiToNoteLabel(57)).toBe('A3')
    expect(midiToNoteLabel(59)).toBe('B3')
    expect(midiToNoteLabel(60)).toBe('C4')
    expect(midiToNoteLabel(72)).toBe('C5')
  })

  it('rejects anything outside the 88-key piano range', () => {
    expect(midiToNoteLabel(20)).toBeNull()
    expect(midiToNoteLabel(109)).toBeNull()
  })
})
