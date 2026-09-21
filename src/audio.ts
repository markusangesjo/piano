import { getFrequency, type PianoKey } from './pitch'

const ATTACK_TIME = 0.018
const PEAK_TIME = 0.11
const RELEASE_TIME = 1.65
const MASTER_VOLUME = 0.82

type BrowserAudioContext = typeof AudioContext
type AudioContextWindow = typeof window & { webkitAudioContext?: BrowserAudioContext }

let audioContext: AudioContext | null = null
let masterOutput: GainNode | null = null
let masterOutputContext: AudioContext | null = null
let closingAudioContext: AudioContext | null = null
let closingAudioContextPromise: Promise<void> | null = null

function getAudioContext() {
  if (audioContext) return audioContext
  const AudioContextClass = window.AudioContext || (window as AudioContextWindow).webkitAudioContext
  if (!AudioContextClass) return null
  audioContext = new AudioContextClass()
  return audioContext
}

function getMasterOutput(context: AudioContext) {
  if (masterOutput && masterOutputContext === context) return masterOutput

  const compressor = context.createDynamicsCompressor()
  compressor.threshold.value = -22
  compressor.knee.value = 24
  compressor.ratio.value = 2.2
  compressor.attack.value = 0.012
  compressor.release.value = 0.32

  const gain = context.createGain()
  gain.gain.value = MASTER_VOLUME

  compressor.connect(gain).connect(context.destination)
  masterOutput = gain
  masterOutputContext = context
  return masterOutput
}

export async function resetAudioState() {
  const context = audioContext
  audioContext = null
  masterOutput = null
  masterOutputContext = null
  if (!context || context.state === 'closed') return
  if (closingAudioContext === context && closingAudioContextPromise) {
    await closingAudioContextPromise
    return
  }

  closingAudioContext = context
  const closePromise = context.close()
  closingAudioContextPromise = closePromise.finally(() => {
    if (closingAudioContext === context && closingAudioContextPromise === closePromise) {
      closingAudioContext = null
      closingAudioContextPromise = null
    }
  })
  await closingAudioContextPromise
}

export async function playTone(pitch: PianoKey) {
  try {
    const context = getAudioContext()
    if (!context) return
    if (context.state === 'suspended') await context.resume()

    const frequency = getFrequency(pitch)
    if (!frequency) return
    const now = context.currentTime
    const releaseAt = now + RELEASE_TIME
    const voiceMix = context.createGain()
    const filter = context.createBiquadFilter()

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(3200, now)
    filter.frequency.exponentialRampToValueAtTime(1450, releaseAt)
    filter.Q.value = 0.55

    voiceMix.gain.setValueAtTime(0.0001, now)
    voiceMix.gain.exponentialRampToValueAtTime(0.38, now + ATTACK_TIME)
    voiceMix.gain.exponentialRampToValueAtTime(0.22, now + PEAK_TIME)
    voiceMix.gain.exponentialRampToValueAtTime(0.0001, releaseAt)

    ;[
      { type: 'triangle' as OscillatorType, multiple: 1, level: 0.95, startRatio: 1.002 },
      { type: 'sine' as OscillatorType, multiple: 2, level: 0.16, startRatio: 1.003 },
      { type: 'sine' as OscillatorType, multiple: 3, level: 0.045, startRatio: 0.998 },
    ].forEach(({ type, multiple, level, startRatio }) => {
      const osc = context.createOscillator()
      const partialGain = context.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(frequency * startRatio * multiple, now)
      osc.frequency.exponentialRampToValueAtTime(frequency * multiple, now + 0.03)
      partialGain.gain.value = level
      osc.connect(partialGain).connect(voiceMix)
      osc.start(now)
      osc.stop(releaseAt + 0.05)
    })

    voiceMix.connect(filter).connect(getMasterOutput(context))
  } catch { /* sound is a lovely extra, never a requirement */ }
}
