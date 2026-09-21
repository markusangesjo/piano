import { useEffect, useMemo, useRef, useState } from 'react'

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
type PianoKey = Pitch | BlackKey
type Language = 'sv' | 'en'
type Tab = 'learn' | 'quiz' | 'practice' | 'song' | 'debug'
type MicrophoneStatus = 'idle' | 'requesting' | 'listening' | 'unsupported' | 'denied' | 'error' | 'completed'

const LANGUAGE_KEY = 'note-nest-language'
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.1.0'
const PRACTICE_SEQUENCE = [...PITCHES] as const
const SONG_SEQUENCE = ['C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4', 'G4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'G4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4'] as const
const PITCH_TO_MIDI: Record<Pitch, number> = { C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71, C5: 72 }
const MIDI_LABELS: Record<number, string> = {
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

export const PITCH_INFO: Record<Pitch, { letter: string; octave: number; y: number; frequency: number; color: string; hint: Record<Language, string> }> = {
  C4: { letter: 'C', octave: 4, y: 150, frequency: 261.63, color: '#7d70dc', hint: { sv: 'C4 är mitt-C – precis mitt på pianot.', en: 'C4 is middle C — right at the heart of the piano.' } },
  D4: { letter: 'D', octave: 4, y: 140, frequency: 293.66, color: '#40bfa3', hint: { sv: 'D4 ligger i utrymmet under notlinjerna.', en: 'D4 sits in the space below the staff.' } },
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

const COPY = {
  sv: {
    home: 'Note Nest startsida',
    progress: 'Lektionsframsteg',
    streak: (n: number) => `${n} rätta svar i rad`,
    sections: 'Lektionsdelar',
    learn: 'Lär dig en ton',
    quiz: 'Snabbquiz',
    practice: 'Spela med mikrofon',
    song: 'Blinka lilla stjärna',
    lesson: 'LEKTION 01 · DISKANTKLAVEN',
    practiceLesson: (step: number, total: number) => `GUIDAD ÖVNING · STEG ${step} AV ${total}`,
    songLesson: (step: number, total: number) => `BLINKA LILLA STJÄRNA · NOT ${step} AV ${total}`,
    meet: 'Möt dina ',
    note: 'tonvänner.',
    practiceLead: 'Låt mobilen lyssna medan du spelar samma ton på ett riktigt piano nära mikrofonen.',
    songTitle: 'Spela Blinka lilla stjärna',
    songLead: 'Följ noterna en i taget. Appen lyssnar och går vidare när du spelar rätt ton.',
    lessonIntro: 'Lär dig hitta tonerna C4–C5 på diskantklavens notlinjer och pianot.',
    every: 'Varje ton har ett namn',
    seven: 'Vi börjar med åtta toner från C4 till C5: ',
    repeat: 'De följer varandra steg för steg!',
    names: 'Tonerna C4 till C5',
    choose: (n: Pitch) => `Välj tonen ${n}`,
    spot: 'Hitta den på notlinjerna',
    map: 'Diskantklavens fem linjer är en musikalisk karta. C4 är mitt-C på en hjälplinje under notlinjerna.',
    play: 'Spela den på pianot',
    tap: 'Tryck på rätt tangent. Varje ton har sin egen frekvens och röst.',
    blackKey: (n: string) => `Spela ${n}`,
    ready: 'Jag är redo för quiz',
    keyboard: 'Pianoklaviatur från C4 till C5',
    middleC: 'mitt-C',
    quizScope: 'Quizet använder bara vita tangenter (C4–C5).',
    playNote: (n: Pitch) => n === 'C4' ? 'Spela C4, mitt-C' : `Spela ${n}`,
    staff: (n: Pitch) => `Diskantklav med tonen ${n}`,
    titleStaff: (n: Pitch) => `Diskantklav med tonen ${n}`,
    thisNote: (n: Pitch) => <>Den här tonen är <strong>{n}</strong>{n === 'C4' ? ' – mitt-C.' : '.'} {PITCH_INFO[n].hint.sv}</>,
    round: (n: number) => `SNABBQUIZ · RUNDA ${n}`,
    which: 'Vilken ton är <em>det här</em>?',
    read: 'Läs diskantklaven och tryck sedan på motsvarande tangent.',
    answer: 'Tryck på ditt svar',
    nice: (n: Pitch) => <>✨ Snyggt! Du hittade <strong>{n}</strong>.</>,
    almost: (n: Pitch) => <>Nästan! Det var <strong>{n}</strong>. Försök med den markerade tangenten.</>,
    next: 'Nästa ton',
    another: 'Försök igen',
    microphoneTitle: 'Lyssna på ditt riktiga piano',
    microphoneIntro: 'Appen jämför tonen den hör med noten på skärmen och går bara vidare när du spelar rätt.',
    microphoneButton: 'Starta mikrofon',
    microphoneStop: 'Stoppa mikrofon',
    microphoneWaiting: 'Väntar på mikrofonbehörighet…',
    microphoneReady: 'Mikrofonen lyssnar. Spela tonen på ditt piano.',
    microphoneIdle: 'Starta mikrofonen och spela tonen nära enheten.',
    microphoneUnsupported: 'Den här webbläsaren saknar mikrofonstöd för notigenkänning.',
    microphoneDenied: 'Mikrofonbehörighet nekades. Tillåt mikrofonen och försök igen.',
    microphoneError: 'Kunde inte starta mikrofonlyssning just nu.',
    microphoneCompleted: 'Mikrofonövningen är klar.',
    target: (n: Pitch) => `Spela ${n} på ditt riktiga piano`,
    detected: 'Hörd ton',
    detectedNone: 'Ingen stabil ton ännu',
    detectedCorrect: 'Rätt ton — vi går vidare!',
    detectedWrong: 'Inte rätt ton ännu — försök igen.',
    completed: '🎉 Du klarade hela mikrofonövningen!',
    restartPractice: 'Börja om övningen',
    songIntro: 'Spela melodin på ditt riktiga piano. Börja med tonen som visas på notlinjerna.',
    songTarget: (n: Pitch) => `Spela nästa ton: ${n}`,
    songCompleted: '🎉 Du spelade hela Blinka lilla stjärna!',
    restartSong: 'Börja om låten',
    debug: 'Felsökning',
    debugEyebrow: 'FELSÖKNINGSLÄGE · TONIGENKÄNNING',
    debugTitle: 'Se hur appen hör din ton',
    debugLead: 'Spela en ton på ditt riktiga piano nära mikrofonen. Ingen övning att klara — bara ren analys av vad appen hör och varför.',
    debugIntro: 'Starta mikrofonen och spela valfri tangent. Resultatet uppdateras löpande, ton för ton.',
    debugIdle: 'Starta mikrofonen och spela en ton.',
    debugWaiting: 'Lyssnar … spela en ton på pianot.',
    debugNote: 'Hörd ton',
    debugFrequencyLabel: 'Uppmätt frekvens',
    debugConfidenceLabel: 'Tydlighet',
    debugLevelLabel: 'Ljudnivå (RMS)',
    debugReason: (label: string, hz: string, pct: number, rms: string) => `Appen känner igen ${label} eftersom ljudvågen upprepar sig med ett mönster som motsvarar ${hz} Hz. En YIN-baserad periodicitetsanalys (CMNDF) hittade den bästa matchningen med ${pct}% tydlighet, och ljudnivån (RMS ${rms}) var stark nog för att lita på mätningen.`,
    debugUnstable: (hz: string, pct: number) => `Precis nu är signalen för svag eller otydlig för en säker tonbestämning (frekvens ${hz} Hz, tydlighet bara ${pct}%).`,
    footer: <>Gjord för nyfikna öron <span>·</span> Inga fel toner här 🎵</>,
    version: (version: string) => `Version ${version}`,
    language: 'Språk',
    swedish: 'Svenska',
    english: 'English',
    switchTo: (l: string) => `Byt språk till ${l}`,
  },
  en: {
    home: 'Note Nest home',
    progress: 'Lesson progress',
    streak: (n: number) => `${n} correct answers in a row`,
    sections: 'Lesson sections',
    learn: 'Learn a pitch',
    quiz: 'Quick quiz',
    practice: 'Play with microphone',
    song: 'Twinkle Twinkle Little Star',
    lesson: 'LESSON 01 · TREBLE CLEF',
    practiceLesson: (step: number, total: number) => `GUIDED PRACTICE · STEP ${step} OF ${total}`,
    songLesson: (step: number, total: number) => `TWINKLE TWINKLE · NOTE ${step} OF ${total}`,
    meet: 'Meet your ',
    note: 'pitch friends.',
    practiceLead: 'Let the device listen while you play the same pitch on a real piano near the microphone.',
    songTitle: 'Play Twinkle Twinkle Little Star',
    songLead: 'Follow the notes one at a time. The app listens and moves on when you play the right pitch.',
    lessonIntro: 'Learn to find pitches C4–C5 on the treble staff and piano.',
    every: 'Every pitch has a name',
    seven: 'We start with eight pitches from C4 to C5: ',
    repeat: 'They move up one step at a time!',
    names: 'Pitches C4 to C5',
    choose: (n: Pitch) => `Choose pitch ${n}`,
    spot: 'Spot it on the staff',
    map: 'The five treble-clef lines are a musical map. C4 is middle C on a ledger line below the staff.',
    play: 'Play it on the piano',
    tap: 'Tap the matching key. Every pitch has its own frequency and voice.',
    blackKey: (n: string) => `Play ${n}`,
    ready: 'I’m ready for a quiz',
    keyboard: 'Piano keyboard from C4 to C5',
    middleC: 'middle C',
    quizScope: 'The quiz uses white keys only (C4–C5).',
    playNote: (n: Pitch) => n === 'C4' ? 'Play C4, middle C' : `Play ${n}`,
    staff: (n: Pitch) => `Treble staff showing pitch ${n}`,
    titleStaff: (n: Pitch) => `Treble staff with pitch ${n}`,
    thisNote: (n: Pitch) => <>This pitch is <strong>{n}</strong>{n === 'C4' ? ' — middle C.' : '.'} {PITCH_INFO[n].hint.en}</>,
    round: (n: number) => `QUICK QUIZ · ROUND ${n}`,
    which: 'Which pitch is <em>this</em>?',
    read: 'Read the treble staff, then tap its matching piano key.',
    answer: 'Tap your answer',
    nice: (n: Pitch) => <>✨ Nice! You found <strong>{n}</strong>.</>,
    almost: (n: Pitch) => <>Almost! That was <strong>{n}</strong>. Try the highlighted key.</>,
    next: 'Next pitch',
    another: 'Try again',
    microphoneTitle: 'Listen to your real piano',
    microphoneIntro: 'The app compares the heard pitch with the note on screen and only advances when you play the correct one.',
    microphoneButton: 'Start microphone',
    microphoneStop: 'Stop microphone',
    microphoneWaiting: 'Waiting for microphone permission…',
    microphoneReady: 'The microphone is listening. Play the pitch on your piano.',
    microphoneIdle: 'Start the microphone and play the pitch close to the device.',
    microphoneUnsupported: 'This browser does not support microphone pitch detection.',
    microphoneDenied: 'Microphone permission was denied. Allow it and try again.',
    microphoneError: 'Could not start microphone listening right now.',
    microphoneCompleted: 'The microphone practice is complete.',
    target: (n: Pitch) => `Play ${n} on your real piano`,
    detected: 'Heard pitch',
    detectedNone: 'No stable pitch yet',
    detectedCorrect: 'Correct pitch — moving on!',
    detectedWrong: 'Not the right pitch yet — try again.',
    completed: '🎉 You finished the whole microphone practice!',
    restartPractice: 'Restart practice',
    songIntro: 'Play the melody on your real piano. Start with the note shown on the staff.',
    songTarget: (n: Pitch) => `Play the next note: ${n}`,
    songCompleted: '🎉 You played the whole Twinkle Twinkle Little Star!',
    restartSong: 'Restart song',
    debug: 'Debug',
    debugEyebrow: 'DEBUG MODE · PITCH DETECTION',
    debugTitle: 'See how the app hears your pitch',
    debugLead: 'Play a note on your real piano near the microphone. There is nothing to complete — just a live look at what the app hears and why.',
    debugIntro: 'Start the microphone and play any key. The result updates continuously, note by note.',
    debugIdle: 'Start the microphone and play a note.',
    debugWaiting: 'Listening … play a note on the piano.',
    debugNote: 'Detected pitch',
    debugFrequencyLabel: 'Measured frequency',
    debugConfidenceLabel: 'Confidence',
    debugLevelLabel: 'Sound level (RMS)',
    debugReason: (label: string, hz: string, pct: number, rms: string) => `The app recognizes ${label} because the sound wave repeats in a pattern matching ${hz} Hz. A YIN-style periodicity analysis (CMNDF) found the best match with ${pct}% confidence, and the sound level (RMS ${rms}) was strong enough to trust the reading.`,
    debugUnstable: (hz: string, pct: number) => `Right now the signal is too weak or unclear for a confident pitch reading (frequency ${hz} Hz, only ${pct}% confidence).`,
    footer: <>Made for curious ears <span>·</span> No wrong notes here 🎵</>,
    version: (version: string) => `Version ${version}`,
    language: 'Language',
    swedish: 'Svenska',
    english: 'English',
    switchTo: (l: string) => `Switch language to ${l}`,
  },
} as const

const getFrequency = (pitch: PianoKey) => pitch in PITCH_INFO ? PITCH_INFO[pitch as Pitch].frequency : BLACK_KEY_FREQUENCIES.get(pitch as BlackKey) ?? null

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

async function playTone(pitch: PianoKey) {
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

type PitchDetection = {
  frequency: number
  // clarity is 1 minus the winning CMNDF value: how confidently the detector
  // locked onto a single periodic pitch (closer to 1 is a cleaner, more
  // certain match; lower values mean a noisier or more ambiguous signal).
  clarity: number
  // rms is the input signal's loudness for the analysed window.
  rms: number
}

function detectPitch(buffer: Float32Array, sampleRate: number): PitchDetection | null {
  const bufferSize = buffer.length

  let rms = 0
  for (let i = 0; i < bufferSize; i += 1) rms += buffer[i] * buffer[i]
  rms = Math.sqrt(rms / bufferSize)
  if (rms < 0.01) return null

  // A YIN-style detector (difference function + cumulative mean normalization)
  // tracks the true fundamental far more reliably than plain autocorrelation,
  // which tends to lock onto strong harmonics of real piano notes (an issue
  // most noticeable from G4 upward where those overtones sit inside range).
  const minFrequency = 220 // margin below C4
  const maxFrequency = 660 // margin above C5
  const maxLag = Math.min(Math.floor(sampleRate / minFrequency), bufferSize - 1)
  const minLag = Math.max(2, Math.floor(sampleRate / maxFrequency))
  if (maxLag <= minLag) return null

  const difference = new Float32Array(maxLag + 1)
  for (let lag = 1; lag <= maxLag; lag += 1) {
    let sum = 0
    const limit = bufferSize - lag
    for (let i = 0; i < limit; i += 1) {
      const delta = buffer[i] - buffer[i + lag]
      sum += delta * delta
    }
    difference[lag] = sum
  }

  const cmndf = new Float32Array(maxLag + 1)
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

function frequencyToMidi(frequency: number) {
  return Math.round(69 + 12 * Math.log2(frequency / 440))
}

function Staff({ pitch, copy }: { pitch: Pitch; copy: typeof COPY[Language] }) {
  const info = PITCH_INFO[pitch]
  return <div className="staff-wrap" aria-label={copy.staff(pitch)}>
    <svg className="staff" viewBox="0 0 500 180" role="img">
      <title>{copy.titleStaff(pitch)}</title>
      <text x="26" y="116" className="clef">𝄞</text>
      {[50, 70, 90, 110, 130].map((y) => <line key={y} x1="92" y1={y} x2="472" y2={y} className="staff-line" />)}
      {pitch === 'C4' && <line x1="257" y1="150" x2="303" y2="150" className="ledger-line" />}
      <ellipse cx="280" cy={info.y} rx="17" ry="12" fill={info.color} className="note-head" />
      <line x1="296" y1={info.y} x2="296" y2={info.y - 51} className="stem" />
      <circle cx="274" cy={info.y - 4} r="3" fill="white" opacity=".75" />
    </svg>
  </div>
}

function Piano({ active, onPick, copy, includeBlackKeys = true }: { active: PianoKey | null; onPick: (pitch: PianoKey) => void; copy: typeof COPY[Language]; includeBlackKeys?: boolean }) {
  return <div className={`piano ${includeBlackKeys ? 'has-black-keys' : ''}`} aria-label={copy.keyboard}>
    {PITCHES.map((pitch) => <button key={pitch} className={`white-key ${active === pitch ? 'active' : ''}`} style={{ '--key-color': PITCH_INFO[pitch].color } as React.CSSProperties} onClick={() => { onPick(pitch); void playTone(pitch) }} aria-label={copy.playNote(pitch)}><span>{pitch}</span>{pitch === 'C4' && <small className="middle-c-marker">{copy.middleC}</small>}</button>)}
    {includeBlackKeys && BLACK_KEYS.map((key, index) => <button key={key.id} className={`black-key ${active === key.id ? 'active' : ''}`} style={{ left: `${((index === 0 ? 1 : index === 1 ? 2 : index + 2) * 100) / 8}%` }} onClick={() => { onPick(key.id); void playTone(key.id) }} aria-label={copy.blackKey(key.label)}><span>{key.label}</span></button>)}
  </div>
}

function App() {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = window.localStorage.getItem(LANGUAGE_KEY)
      return saved === 'en' || saved === 'sv' ? saved : 'sv'
    } catch {
      return 'sv'
    }
  })
  const copy = COPY[language]
  const [tab, setTab] = useState<Tab>('learn')
  const [pitch, setPitch] = useState<Pitch>('C4')
  const [selectedKey, setSelectedKey] = useState<PianoKey>('C4')
  const [quizPitch, setQuizPitch] = useState<Pitch>('E4')
  const [answer, setAnswer] = useState<Pitch | null>(null)
  const [streak, setStreak] = useState(0)
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [practiceComplete, setPracticeComplete] = useState(false)
  const [micStatus, setMicStatus] = useState<MicrophoneStatus>('idle')
  const [heardPitch, setHeardPitch] = useState<string | null>(null)
  const [heardCorrect, setHeardCorrect] = useState<boolean | null>(null)
  const [debugInfo, setDebugInfo] = useState<{ label: string; frequency: number; clarity: number; rms: number } | null>(null)
  const [debugUnstable, setDebugUnstable] = useState<{ frequency: number; clarity: number } | null>(null)
  const quizChoices = useMemo(() => [...PITCHES].sort(() => Math.random() - 0.5), [quizPitch])
  const micStatusRef = useRef(micStatus)
  const songMode = tab === 'song'
  const activeSequence = songMode ? SONG_SEQUENCE : PRACTICE_SEQUENCE
  const currentPracticePitch = activeSequence[practiceIndex] ?? activeSequence[activeSequence.length - 1]
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const advanceTimeoutRef = useRef<number | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const microphoneSessionRef = useRef(0)
  const lastMidiRef = useRef<number | null>(null)
  const stableFramesRef = useRef(0)
  const practiceIndexRef = useRef(practiceIndex)
  const expectedMidiRef = useRef(PITCH_TO_MIDI[currentPracticePitch])
  const practiceCompleteRef = useRef(practiceComplete)
  const matchedRef = useRef(false)
  const debugModeRef = useRef(false)

  micStatusRef.current = micStatus
  useEffect(() => { try { window.localStorage.setItem(LANGUAGE_KEY, language) } catch { /* storage is optional */ } }, [language])
  useEffect(() => { setAnswer(null) }, [quizPitch])
  useEffect(() => { practiceIndexRef.current = practiceIndex }, [practiceIndex])
  useEffect(() => { expectedMidiRef.current = PITCH_TO_MIDI[currentPracticePitch] }, [currentPracticePitch])
  useEffect(() => { practiceCompleteRef.current = practiceComplete }, [practiceComplete])
  useEffect(() => {
    if ((tab !== 'practice' && tab !== 'song' && tab !== 'debug') && (micStatus === 'listening' || micStatus === 'requesting')) {
      stopMicrophone('idle')
    }
  }, [tab, micStatus])
  useEffect(() => {
    const reacquireWakeLock = () => {
      if (document.visibilityState === 'visible' && micStatusRef.current === 'listening') void requestWakeLock()
    }
    document.addEventListener('visibilitychange', reacquireWakeLock)
    return () => {
      document.removeEventListener('visibilitychange', reacquireWakeLock)
      void releaseWakeLock()
    }
  }, [])
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (advanceTimeoutRef.current) window.clearTimeout(advanceTimeoutRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (audioContextRef.current) void audioContextRef.current.close()
    void releaseWakeLock()
  }, [])

  const requestWakeLock = async () => {
    if (!navigator.wakeLock || wakeLockRef.current || document.visibilityState !== 'visible') return
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch {
      // Wake Lock is optional and may be denied by the browser or device.
    }
  }

  const releaseWakeLock = async () => {
    const wakeLock = wakeLockRef.current
    wakeLockRef.current = null
    if (wakeLock) await wakeLock.release()
  }

  const teardownMicrophone = () => {
    microphoneSessionRef.current += 1
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (advanceTimeoutRef.current) window.clearTimeout(advanceTimeoutRef.current)
    advanceTimeoutRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    analyserRef.current = null
    void releaseWakeLock()
    if (audioContextRef.current) void audioContextRef.current.close()
    audioContextRef.current = null
    lastMidiRef.current = null
    stableFramesRef.current = 0
    matchedRef.current = false
    debugModeRef.current = false
    setDebugInfo(null)
    setDebugUnstable(null)
  }

  const stopMicrophone = (nextStatus: MicrophoneStatus) => {
    teardownMicrophone()
    setMicStatus(nextStatus)
  }

  const restartPractice = () => {
    practiceCompleteRef.current = false
    setPracticeIndex(0)
    setPracticeComplete(false)
    setHeardPitch(null)
    setHeardCorrect(null)
    matchedRef.current = false
  }

  const openPracticeMode = (nextTab: 'practice' | 'song' | 'debug') => {
    stopMicrophone('idle')
    restartPractice()
    setTab(nextTab)
  }

  const chooseAnswer = (choice: PianoKey) => {
    if (!PITCHES.includes(choice as Pitch)) return
    const whiteChoice = choice as Pitch
    if (whiteChoice === quizPitch) {
      setStreak((s) => s + 1)
      void playTone(whiteChoice)
      nextQuestion()
    } else {
      setStreak(0)
      setAnswer(whiteChoice)
    }
  }

  const nextQuestion = () => {
    const nextChoices = quizChoices.filter((choice) => choice !== quizPitch)
    setQuizPitch(nextChoices[Math.floor(Math.random() * nextChoices.length)])
    setAnswer(null)
  }

  const startMicrophone = async (debugMode = false) => {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!navigator.mediaDevices?.getUserMedia || !AudioContextClass) {
      setMicStatus('unsupported')
      return
    }

    teardownMicrophone()
    debugModeRef.current = debugMode
    const sessionId = microphoneSessionRef.current
    setMicStatus('requesting')
    setHeardPitch(null)
    setHeardCorrect(null)
    setDebugInfo(null)
    setDebugUnstable(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      if (sessionId !== microphoneSessionRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      const audioContext = new AudioContextClass()
      if (audioContext.state === 'suspended') await audioContext.resume()
      const analyser = audioContext.createAnalyser()
      // A smaller window shortens how long a new note has to sound before it
      // dominates the analysis buffer, which noticeably cuts detection latency.
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.2

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      if (sessionId !== microphoneSessionRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        void audioContext.close()
        return
      }

      streamRef.current = stream
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      setMicStatus('listening')
      void requestWakeLock()

      const buffer = new Float32Array(analyser.fftSize)
      const listen = () => {
        const activeAnalyser = analyserRef.current
        if (!activeAnalyser || practiceCompleteRef.current) return

        activeAnalyser.getFloatTimeDomainData(buffer)
        const detection = detectPitch(buffer, audioContext.sampleRate)

        if (!detection) {
          stableFramesRef.current = 0
          lastMidiRef.current = null
          if (debugModeRef.current) {
            setDebugInfo(null)
            setDebugUnstable(null)
          }
          rafRef.current = requestAnimationFrame(listen)
          return
        }

        const { frequency, clarity, rms } = detection
        const midi = frequencyToMidi(frequency)
        const label = MIDI_LABELS[midi]

        if (!label) {
          stableFramesRef.current = 0
          lastMidiRef.current = null
          if (debugModeRef.current) setDebugUnstable({ frequency, clarity })
          rafRef.current = requestAnimationFrame(listen)
          return
        }

        if (lastMidiRef.current === midi) {
          stableFramesRef.current += 1
        } else {
          lastMidiRef.current = midi
          stableFramesRef.current = 1
        }

        if (stableFramesRef.current >= 2) {
          if (debugModeRef.current) {
            setDebugUnstable(null)
            setDebugInfo({ label, frequency, clarity, rms })
          } else {
            setHeardPitch(label)
            const isCorrect = midi === expectedMidiRef.current
            setHeardCorrect(isCorrect)

            if (isCorrect && !matchedRef.current) {
              matchedRef.current = true
              advanceTimeoutRef.current = window.setTimeout(() => {
                setHeardPitch(null)
                setHeardCorrect(null)
                const nextIndex = practiceIndexRef.current + 1
                if (nextIndex >= activeSequence.length) {
                  practiceCompleteRef.current = true
                  setPracticeComplete(true)
                  stopMicrophone('completed')
                } else {
                  setPracticeIndex(nextIndex)
                }
                lastMidiRef.current = null
                stableFramesRef.current = 0
                matchedRef.current = false
                advanceTimeoutRef.current = null
              }, 700)
            }
          }
        } else if (debugModeRef.current) {
          setDebugUnstable({ frequency, clarity })
        }

        rafRef.current = requestAnimationFrame(listen)
      }

      rafRef.current = requestAnimationFrame(listen)
    } catch (error) {
      const shouldReportFailure = sessionId === microphoneSessionRef.current
      teardownMicrophone()
      if (!shouldReportFailure) return
      if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
        setMicStatus('denied')
      } else {
        setMicStatus('error')
      }
    }
  }

  const microphoneMessage = micStatus === 'requesting'
    ? copy.microphoneWaiting
    : micStatus === 'listening'
      ? copy.microphoneReady
      : micStatus === 'unsupported'
        ? copy.microphoneUnsupported
        : micStatus === 'denied'
          ? copy.microphoneDenied
          : micStatus === 'error'
            ? copy.microphoneError
          : micStatus === 'completed'
            ? copy.microphoneCompleted
            : copy.microphoneIdle

  const heardPitchLabel = micStatus === 'unsupported' || micStatus === 'denied' || micStatus === 'error' || micStatus === 'requesting' || micStatus === 'completed'
    ? '—'
    : heardPitch ?? copy.detectedNone

  const practiceFeedback = micStatus === 'requesting'
    ? copy.microphoneWaiting
    : micStatus === 'unsupported'
      ? copy.microphoneUnsupported
      : micStatus === 'denied'
        ? copy.microphoneDenied
        : micStatus === 'error'
          ? copy.microphoneError
          : micStatus === 'completed'
            ? copy.microphoneCompleted
            : heardCorrect === true
              ? copy.detectedCorrect
              : heardCorrect === false
                ? copy.detectedWrong
                : copy.detectedNone

  const practiceTitle = songMode ? copy.songTitle : copy.microphoneTitle
  const practiceLead = songMode ? copy.songLead : copy.practiceLead
  const practiceIntro = songMode ? copy.songIntro : copy.microphoneIntro
  const practiceTarget = songMode ? copy.songTarget(currentPracticePitch) : copy.target(currentPracticePitch)
  const practiceCompleteMessage = songMode ? copy.songCompleted : copy.completed
  const restartLabel = songMode ? copy.restartSong : copy.restartPractice

  return <main>
    <header className="topbar">
      <a className="brand" href="#" aria-label={copy.home}><span className="brand-mark">♫</span><span>note nest</span></a>
      <div className="progress" aria-label={copy.progress}><span className="progress-dot filled" /><span className="progress-line" /><span className="progress-dot" /><span className="progress-line" /><span className="progress-dot" /></div>
      <div className="streak" aria-label={copy.streak(streak)}>🔥 <b>{streak}</b></div>
      <div className="language-toggle" role="group" aria-label={copy.language}><button type="button" className={language === 'sv' ? 'selected' : ''} aria-pressed={language === 'sv'} aria-label={copy.switchTo(copy.swedish)} onClick={() => setLanguage('sv')}>{copy.swedish}</button><button type="button" className={language === 'en' ? 'selected' : ''} aria-pressed={language === 'en'} aria-label={copy.switchTo(copy.english)} onClick={() => setLanguage('en')}>{copy.english}</button></div>
    </header>
    <nav className="tabs" aria-label={copy.sections}><button className={tab === 'learn' ? 'selected' : ''} onClick={() => setTab('learn')}>{copy.learn}</button><button className={tab === 'quiz' ? 'selected' : ''} onClick={() => setTab('quiz')}>{copy.quiz} <span>✦</span></button><button className={tab === 'practice' ? 'selected' : ''} onClick={() => openPracticeMode('practice')}>{copy.practice}</button><button className={tab === 'song' ? 'selected' : ''} onClick={() => openPracticeMode('song')}>{copy.song}</button><button className={tab === 'debug' ? 'selected' : ''} onClick={() => openPracticeMode('debug')}>{copy.debug} <span>🐞</span></button></nav>
    {tab === 'learn' ? <section className="page">
      <div className="intro"><p className="eyebrow">{copy.lesson}</p><h1>{copy.meet}<em>{copy.note}</em></h1><p className="lede">{copy.lessonIntro}</p></div>
      <div className="lesson-card"><div className="card-copy"><span className="step">1</span><div><h2>{copy.every}</h2><p>{copy.seven}<strong>C4, D4, E4, F4, G4, A4, B4, C5.</strong> {copy.repeat}</p></div></div><div className="letter-row" aria-label={copy.names}>{PITCHES.map((p) => <button key={p} className={pitch === p ? 'letter active' : 'letter'} style={{ '--note-color': PITCH_INFO[p].color } as React.CSSProperties} onClick={() => { setPitch(p); setSelectedKey(p); void playTone(p) }} aria-label={copy.choose(p)}><span>{pitchLabel(p)}</span><small>{p === 'C4' ? (language === 'sv' ? 'mitt-C' : 'middle C') : `${PITCH_INFO[p].letter}${PITCH_INFO[p].octave}`}</small></button>)}</div></div>
      <div className="lesson-card staff-card"><div className="card-copy"><span className="step">2</span><div><h2>{copy.spot}</h2><p>{copy.map}</p></div></div><Staff pitch={pitch} copy={copy} /><div className="note-caption" style={{ '--note-color': PITCH_INFO[pitch].color } as React.CSSProperties}><span className="caption-dot" />{copy.thisNote(pitch)}</div></div>
      <div className="lesson-card keyboard-card"><div className="card-copy"><span className="step">3</span><div><h2>{copy.play}</h2><p>{copy.tap}</p></div></div><Piano active={selectedKey} onPick={(key) => { setSelectedKey(key); if (PITCHES.includes(key as Pitch)) setPitch(key as Pitch) }} copy={copy} /></div>
      <button className="primary" onClick={() => setTab('quiz')}>{copy.ready} <span>→</span></button>
    </section> : tab === 'quiz' ? <section className="page quiz-page">
      <div className="intro"><p className="eyebrow">{copy.round(streak + 1)}</p><h1 dangerouslySetInnerHTML={{ __html: copy.which }} /><p className="lede">{copy.read}</p></div>
      <div className="quiz-card"><Staff pitch={quizPitch} copy={copy} /><div className="quiz-prompt">{copy.answer}</div><Piano active={answer === quizPitch ? answer : null} onPick={chooseAnswer} copy={copy} includeBlackKeys={false} /><p className="quiz-scope">{copy.quizScope}</p>{answer && <div className="feedback oops" role="status">{copy.almost(answer)}</div>}</div>
      {answer && <button className="primary" onClick={nextQuestion}>{answer === quizPitch ? copy.next : copy.another} <span>→</span></button>}
    </section> : tab === 'debug' ? <section className="page quiz-page">
      <div className="intro"><p className="eyebrow">{copy.debugEyebrow}</p><h1>{copy.debugTitle}</h1><p className="lede">{copy.debugLead}</p></div>
      <div className="quiz-card practice-card debug-card">
        <div className="card-copy"><span className="step">🐞</span><div><h2>{copy.debugTitle}</h2><p>{copy.debugIntro}</p></div></div>
        <div className="feedback practice-feedback debug-feedback" role="status">
          {debugInfo ? <>
            <strong>{copy.debugNote}:</strong> {debugInfo.label}
            <dl className="debug-details">
              <div><dt>{copy.debugFrequencyLabel}</dt><dd>{debugInfo.frequency.toFixed(1)} Hz</dd></div>
              <div><dt>{copy.debugConfidenceLabel}</dt><dd>{Math.round(debugInfo.clarity * 100)}%</dd></div>
              <div><dt>{copy.debugLevelLabel}</dt><dd>{debugInfo.rms.toFixed(3)}</dd></div>
            </dl>
            <small>{copy.debugReason(debugInfo.label, debugInfo.frequency.toFixed(1), Math.round(debugInfo.clarity * 100), debugInfo.rms.toFixed(3))}</small>
          </> : micStatus === 'requesting' ? <small>{copy.microphoneWaiting}</small>
            : micStatus === 'unsupported' ? <small>{copy.microphoneUnsupported}</small>
              : micStatus === 'denied' ? <small>{copy.microphoneDenied}</small>
                : micStatus === 'error' ? <small>{copy.microphoneError}</small>
                  : debugUnstable ? <small>{copy.debugUnstable(debugUnstable.frequency.toFixed(1), Math.round(debugUnstable.clarity * 100))}</small>
                    : micStatus === 'listening' ? <small>{copy.debugWaiting}</small>
                      : <small>{copy.debugIdle}</small>}
        </div>
        <div className="practice-actions">
          <button className="primary" type="button" onClick={micStatus === 'listening' ? () => stopMicrophone('idle') : () => startMicrophone(true)}>{micStatus === 'listening' ? copy.microphoneStop : copy.microphoneButton}</button>
        </div>
      </div>
    </section> : <section className="page quiz-page">
      <div className="intro"><p className="eyebrow">{songMode ? copy.songLesson(practiceComplete ? SONG_SEQUENCE.length : practiceIndex + 1, SONG_SEQUENCE.length) : copy.practiceLesson(practiceComplete ? PRACTICE_SEQUENCE.length : practiceIndex + 1, PRACTICE_SEQUENCE.length)}</p><h1>{practiceTitle}</h1><p className="lede">{practiceLead}</p></div>
      <div className="quiz-card practice-card">
        <div className="card-copy"><span className="step">{songMode ? '♫' : '🎙'}</span><div><h2>{practiceTitle}</h2><p>{practiceIntro}</p></div></div>
        {songMode && <div className="song-sequence" aria-label={copy.songTitle}>{SONG_SEQUENCE.map((note, index) => <span key={`${note}-${index}`} className={index === practiceIndex ? 'current' : index < practiceIndex ? 'played' : ''}>{note.replace('4', '').replace('5', '')}</span>)}</div>}
        {!practiceComplete && <><Staff pitch={currentPracticePitch} copy={copy} /><div className="practice-target"><strong>{practiceTarget}</strong><span>{microphoneMessage}</span></div></>}
        {practiceComplete && <div className="practice-complete" role="status">{practiceCompleteMessage}</div>}
        <div className={`feedback practice-feedback ${heardCorrect === true ? 'correct' : heardCorrect === false ? 'oops' : ''}`} role="status">
          <strong>{copy.detected}:</strong> {heardPitchLabel}
          <small>{practiceFeedback}</small>
        </div>
        <div className="practice-actions">
          {!practiceComplete && <button className="primary" type="button" onClick={micStatus === 'listening' ? () => stopMicrophone('idle') : () => startMicrophone()}>{micStatus === 'listening' ? copy.microphoneStop : copy.microphoneButton}</button>}
          <button className="secondary" type="button" onClick={() => { stopMicrophone('idle'); restartPractice() }}>{restartLabel}</button>
        </div>
      </div>
    </section>}
    <footer>{copy.footer} <span>·</span> <span>{copy.version(`v${APP_VERSION}`)}</span></footer>
  </main>
}


export default App
