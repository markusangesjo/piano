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
type Tab = 'learn' | 'quiz' | 'practice'
type MicrophoneStatus = 'idle' | 'requesting' | 'listening' | 'unsupported' | 'denied' | 'error' | 'completed'

const LANGUAGE_KEY = 'note-nest-language'
const PRACTICE_SEQUENCE = [...PITCHES] as const
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

const COPY = {
  sv: {
    home: 'Note Nest startsida',
    progress: 'Lektionsframsteg',
    streak: (n: number) => `${n} rätta svar i rad`,
    sections: 'Lektionsdelar',
    learn: 'Lär dig en ton',
    quiz: 'Snabbquiz',
    practice: 'Spela med mikrofon',
    lesson: 'LEKTION 01 · DISKANTKLAVEN',
    practiceLesson: (step: number, total: number) => `GUIDAD ÖVNING · STEG ${step} AV ${total}`,
    meet: 'Möt dina ',
    note: 'tonvänner.',
    practiceLead: 'Låt mobilen lyssna medan du spelar samma ton på ett riktigt piano nära mikrofonen.',
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
    footer: <>Gjord för nyfikna öron <span>·</span> Inga fel toner här 🎵</>,
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
    lesson: 'LESSON 01 · TREBLE CLEF',
    practiceLesson: (step: number, total: number) => `GUIDED PRACTICE · STEP ${step} OF ${total}`,
    meet: 'Meet your ',
    note: 'pitch friends.',
    practiceLead: 'Let the device listen while you play the same pitch on a real piano near the microphone.',
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
    footer: <>Made for curious ears <span>·</span> No wrong notes here 🎵</>,
    language: 'Language',
    swedish: 'Svenska',
    english: 'English',
    switchTo: (l: string) => `Switch language to ${l}`,
  },
} as const

function playTone(pitch: PianoKey) {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    const osc = context.createOscillator()
    const gain = context.createGain()
    osc.frequency.value = pitch in PITCH_INFO ? PITCH_INFO[pitch as Pitch].frequency : BLACK_KEYS.find((key) => key.id === pitch)?.frequency ?? 0
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.24, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.65)
    osc.connect(gain).connect(context.destination)
    osc.start()
    osc.stop(context.currentTime + 0.7)
    osc.addEventListener('ended', () => void context.close())
  } catch { /* sound is a lovely extra, never a requirement */ }
}

function detectPitch(buffer: Float32Array, sampleRate: number) {
  let rms = 0
  for (let i = 0; i < buffer.length; i += 1) rms += buffer[i] * buffer[i]
  rms = Math.sqrt(rms / buffer.length)
  if (rms < 0.015) return null

  const minLag = Math.floor(sampleRate / 550)
  const maxLag = Math.floor(sampleRate / 250)
  let bestLag = -1
  let bestCorrelation = 0

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < buffer.length - lag; i += 1) {
      const a = buffer[i]
      const b = buffer[i + lag]
      correlation += a * b
      normA += a * a
      normB += b * b
    }

    const normalized = correlation / Math.sqrt(normA * normB)
    if (normalized > bestCorrelation) {
      bestCorrelation = normalized
      bestLag = lag
    }
  }

  return bestLag > 0 && bestCorrelation > 0.85 ? sampleRate / bestLag : null
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
    {PITCHES.map((pitch) => <button key={pitch} className={`white-key ${active === pitch ? 'active' : ''}`} style={{ '--key-color': PITCH_INFO[pitch].color } as React.CSSProperties} onClick={() => { onPick(pitch); playTone(pitch) }} aria-label={copy.playNote(pitch)}><span>{pitch}</span>{pitch === 'C4' && <small className="middle-c-marker">{copy.middleC}</small>}</button>)}
    {includeBlackKeys && BLACK_KEYS.map((key, index) => <button key={key.id} className={`black-key ${active === key.id ? 'active' : ''}`} style={{ left: `${((index === 0 ? 1 : index === 1 ? 2 : index + 2) * 100) / 8}%` }} onClick={() => { onPick(key.id); playTone(key.id) }} aria-label={copy.blackKey(key.label)}><span>{key.label}</span></button>)}
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
  const quizChoices = useMemo(() => [...PITCHES].sort(() => Math.random() - 0.5), [quizPitch])
  const currentPracticePitch = PRACTICE_SEQUENCE[practiceIndex]
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const advanceTimeoutRef = useRef<number | null>(null)
  const microphoneSessionRef = useRef(0)
  const lastMidiRef = useRef<number | null>(null)
  const stableFramesRef = useRef(0)
  const practiceIndexRef = useRef(practiceIndex)
  const expectedMidiRef = useRef(PITCH_TO_MIDI[currentPracticePitch])
  const practiceCompleteRef = useRef(practiceComplete)
  const matchedRef = useRef(false)

  useEffect(() => { try { window.localStorage.setItem(LANGUAGE_KEY, language) } catch { /* storage is optional */ } }, [language])
  useEffect(() => { setAnswer(null) }, [quizPitch])
  useEffect(() => { practiceIndexRef.current = practiceIndex }, [practiceIndex])
  useEffect(() => { expectedMidiRef.current = PITCH_TO_MIDI[currentPracticePitch] }, [currentPracticePitch])
  useEffect(() => { practiceCompleteRef.current = practiceComplete }, [practiceComplete])
  useEffect(() => {
    if (tab !== 'practice' && (micStatus === 'listening' || micStatus === 'requesting')) {
      stopMicrophone()
    }
  }, [tab, micStatus])
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (advanceTimeoutRef.current) window.clearTimeout(advanceTimeoutRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (audioContextRef.current) void audioContextRef.current.close()
  }, [])

  const teardownMicrophone = () => {
    microphoneSessionRef.current += 1
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (advanceTimeoutRef.current) window.clearTimeout(advanceTimeoutRef.current)
    advanceTimeoutRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    analyserRef.current = null
    if (audioContextRef.current) void audioContextRef.current.close()
    audioContextRef.current = null
    lastMidiRef.current = null
    stableFramesRef.current = 0
    matchedRef.current = false
  }

  const stopMicrophone = (nextStatus: MicrophoneStatus = practiceCompleteRef.current ? 'completed' : 'idle') => {
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

  const chooseAnswer = (choice: PianoKey) => {
    if (!PITCHES.includes(choice as Pitch)) return
    const whiteChoice = choice as Pitch
    setAnswer(whiteChoice)
    if (whiteChoice === quizPitch) {
      setStreak((s) => s + 1)
      playTone(whiteChoice)
    } else {
      setStreak(0)
    }
  }

  const nextQuestion = () => {
    setQuizPitch(quizChoices[Math.floor(Math.random() * quizChoices.length)])
    setAnswer(null)
  }

  const startMicrophone = async () => {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!navigator.mediaDevices?.getUserMedia || !AudioContextClass) {
      setMicStatus('unsupported')
      return
    }

    teardownMicrophone()
    const sessionId = microphoneSessionRef.current
    setMicStatus('requesting')
    setHeardPitch(null)
    setHeardCorrect(null)

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
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
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

      const buffer = new Float32Array(analyser.fftSize)
      const listen = () => {
        const activeAnalyser = analyserRef.current
        if (!activeAnalyser || practiceCompleteRef.current) return

        activeAnalyser.getFloatTimeDomainData(buffer)
        const frequency = detectPitch(buffer, audioContext.sampleRate)

        if (!frequency) {
          stableFramesRef.current = 0
          lastMidiRef.current = null
          rafRef.current = requestAnimationFrame(listen)
          return
        }

        const midi = frequencyToMidi(frequency)
        const label = MIDI_LABELS[midi]

        if (!label) {
          stableFramesRef.current = 0
          lastMidiRef.current = null
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
          setHeardPitch(label)
          const isCorrect = midi === expectedMidiRef.current
          setHeardCorrect(isCorrect)

          if (isCorrect && !matchedRef.current) {
            matchedRef.current = true
            advanceTimeoutRef.current = window.setTimeout(() => {
              setHeardPitch(null)
              setHeardCorrect(null)
              const nextIndex = practiceIndexRef.current + 1
              if (nextIndex >= PRACTICE_SEQUENCE.length) {
                practiceCompleteRef.current = true
                setPracticeComplete(true)
                stopMicrophone()
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

  return <main>
    <header className="topbar">
      <a className="brand" href="#" aria-label={copy.home}><span className="brand-mark">♫</span><span>note nest</span></a>
      <div className="progress" aria-label={copy.progress}><span className="progress-dot filled" /><span className="progress-line" /><span className="progress-dot" /><span className="progress-line" /><span className="progress-dot" /></div>
      <div className="streak" aria-label={copy.streak(streak)}>🔥 <b>{streak}</b></div>
      <div className="language-toggle" role="group" aria-label={copy.language}><button type="button" className={language === 'sv' ? 'selected' : ''} aria-pressed={language === 'sv'} aria-label={copy.switchTo(copy.swedish)} onClick={() => setLanguage('sv')}>{copy.swedish}</button><button type="button" className={language === 'en' ? 'selected' : ''} aria-pressed={language === 'en'} aria-label={copy.switchTo(copy.english)} onClick={() => setLanguage('en')}>{copy.english}</button></div>
    </header>
    <nav className="tabs" aria-label={copy.sections}><button className={tab === 'learn' ? 'selected' : ''} onClick={() => setTab('learn')}>{copy.learn}</button><button className={tab === 'quiz' ? 'selected' : ''} onClick={() => setTab('quiz')}>{copy.quiz} <span>✦</span></button><button className={tab === 'practice' ? 'selected' : ''} onClick={() => setTab('practice')}>{copy.practice}</button></nav>
    {tab === 'learn' ? <section className="page">
      <div className="intro"><p className="eyebrow">{copy.lesson}</p><h1>{copy.meet}<em>{copy.note}</em></h1><p className="lede">{copy.lessonIntro}</p></div>
      <div className="lesson-card"><div className="card-copy"><span className="step">1</span><div><h2>{copy.every}</h2><p>{copy.seven}<strong>C4, D4, E4, F4, G4, A4, B4, C5.</strong> {copy.repeat}</p></div></div><div className="letter-row" aria-label={copy.names}>{PITCHES.map((p) => <button key={p} className={pitch === p ? 'letter active' : 'letter'} style={{ '--note-color': PITCH_INFO[p].color } as React.CSSProperties} onClick={() => { setPitch(p); setSelectedKey(p); playTone(p) }} aria-label={copy.choose(p)}><span>{pitchLabel(p)}</span><small>{p === 'C4' ? (language === 'sv' ? 'mitt-C' : 'middle C') : `${PITCH_INFO[p].letter}${PITCH_INFO[p].octave}`}</small></button>)}</div></div>
      <div className="lesson-card staff-card"><div className="card-copy"><span className="step">2</span><div><h2>{copy.spot}</h2><p>{copy.map}</p></div></div><Staff pitch={pitch} copy={copy} /><div className="note-caption" style={{ '--note-color': PITCH_INFO[pitch].color } as React.CSSProperties}><span className="caption-dot" />{copy.thisNote(pitch)}</div></div>
      <div className="lesson-card keyboard-card"><div className="card-copy"><span className="step">3</span><div><h2>{copy.play}</h2><p>{copy.tap}</p></div></div><Piano active={selectedKey} onPick={(key) => { setSelectedKey(key); if (PITCHES.includes(key as Pitch)) setPitch(key as Pitch) }} copy={copy} /></div>
      <button className="primary" onClick={() => setTab('quiz')}>{copy.ready} <span>→</span></button>
    </section> : tab === 'quiz' ? <section className="page quiz-page">
      <div className="intro"><p className="eyebrow">{copy.round(streak + 1)}</p><h1 dangerouslySetInnerHTML={{ __html: copy.which }} /><p className="lede">{copy.read}</p></div>
      <div className="quiz-card"><Staff pitch={quizPitch} copy={copy} /><div className="quiz-prompt">{copy.answer}</div><Piano active={answer ? (answer === quizPitch ? answer : quizPitch) : null} onPick={chooseAnswer} copy={copy} includeBlackKeys={false} /><p className="quiz-scope">{copy.quizScope}</p>{answer && <div className={`feedback ${answer === quizPitch ? 'correct' : 'oops'}`} role="status">{answer === quizPitch ? copy.nice(quizPitch) : copy.almost(answer)}</div>}</div>
      {answer && <button className="primary" onClick={nextQuestion}>{answer === quizPitch ? copy.next : copy.another} <span>→</span></button>}
    </section> : <section className="page quiz-page">
      <div className="intro"><p className="eyebrow">{copy.practiceLesson(practiceComplete ? PRACTICE_SEQUENCE.length : practiceIndex + 1, PRACTICE_SEQUENCE.length)}</p><h1>{copy.microphoneTitle}</h1><p className="lede">{copy.practiceLead}</p></div>
      <div className="quiz-card practice-card">
        <div className="card-copy"><span className="step">🎙</span><div><h2>{copy.microphoneTitle}</h2><p>{copy.microphoneIntro}</p></div></div>
        {!practiceComplete && <><Staff pitch={currentPracticePitch} copy={copy} /><div className="practice-target"><strong>{copy.target(currentPracticePitch)}</strong><span>{microphoneMessage}</span></div></>}
        {practiceComplete && <div className="practice-complete" role="status">{copy.completed}</div>}
        <div className={`feedback practice-feedback ${heardCorrect === true ? 'correct' : heardCorrect === false ? 'oops' : ''}`} role="status">
          <strong>{copy.detected}:</strong> {heardPitchLabel}
          <small>{practiceFeedback}</small>
        </div>
        <div className="practice-actions">
          {!practiceComplete && <button className="primary" type="button" onClick={micStatus === 'listening' ? () => stopMicrophone() : startMicrophone}>{micStatus === 'listening' ? copy.microphoneStop : copy.microphoneButton}</button>}
          <button className="secondary" type="button" onClick={() => { stopMicrophone(); restartPractice() }}>{copy.restartPractice}</button>
        </div>
      </div>
    </section>}
    <footer>{copy.footer}</footer>
  </main>
}

export default App
