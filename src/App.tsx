import { useEffect, useMemo, useState } from 'react'

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
const LANGUAGE_KEY = 'note-nest-language'
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
const ATTACK_TIME = 0.01
const PEAK_TIME = 0.08
const RELEASE_TIME = 1.2
const MASTER_VOLUME = 0.9

type BrowserAudioContext = typeof AudioContext
type AudioContextWindow = typeof window & { webkitAudioContext?: BrowserAudioContext }

let audioContext: AudioContext | null = null
let masterOutput: GainNode | null = null

const COPY = {
  sv: {
    home: 'Note Nest startsida', progress: 'Lektionsframsteg', streak: (n: number) => `${n} rätta svar i rad`,
    sections: 'Lektionsdelar', learn: 'Lär dig en ton', quiz: 'Snabbquiz', lesson: 'LEKTION 01 · DISKANTKLAVEN',
    meet: 'Möt dina ', note: 'tonvänner.', lessonIntro: 'Lär dig hitta tonerna C4–C5 på diskantklavens notlinjer och pianot.',
    every: 'Varje ton har ett namn', seven: 'Vi börjar med åtta toner från C4 till C5: ', repeat: 'De följer varandra steg för steg!',
    names: 'Tonerna C4 till C5', choose: (n: Pitch) => `Välj tonen ${n}`, spot: 'Hitta den på notlinjerna',
    map: 'Diskantklavens fem linjer är en musikalisk karta. C4 är mitt-C på en hjälplinje under notlinjerna.',
    play: 'Spela den på pianot', tap: 'Tryck på rätt tangent. Varje ton har sin egen frekvens och röst.', blackKey: (n: string) => `Spela ${n}`,
    ready: 'Jag är redo för quiz', keyboard: 'Pianoklaviatur från C4 till C5', middleC: 'mitt-C', quizScope: 'Quizet använder bara vita tangenter (C4–C5).',
    playNote: (n: Pitch) => n === 'C4' ? 'Spela C4, mitt-C' : `Spela ${n}`, staff: (n: Pitch) => `Diskantklav med tonen ${n}`, titleStaff: (n: Pitch) => `Diskantklav med tonen ${n}`,
    thisNote: (n: Pitch) => <>Den här tonen är <strong>{n}</strong>{n === 'C4' ? ' – mitt-C.' : '.'} {PITCH_INFO[n].hint.sv}</>,
    round: (n: number) => `SNABBQUIZ · RUNDA ${n}`, which: 'Vilken ton är <em>det här</em>?', read: 'Läs diskantklaven och tryck sedan på motsvarande tangent.',
    answer: 'Tryck på ditt svar', nice: (n: Pitch) => <>✨ Snyggt! Du hittade <strong>{n}</strong>.</>, almost: (n: Pitch) => <>Nästan! Det var <strong>{n}</strong>. Försök med den markerade tangenten.</>,
    next: 'Nästa ton', another: 'Försök igen', footer: <>Gjord för nyfikna öron <span>·</span> Inga fel toner här 🎵</>,
    language: 'Språk', swedish: 'Svenska', english: 'English', switchTo: (l: string) => `Byt språk till ${l}`,
  },
  en: {
    home: 'Note Nest home', progress: 'Lesson progress', streak: (n: number) => `${n} correct answers in a row`,
    sections: 'Lesson sections', learn: 'Learn a pitch', quiz: 'Quick quiz', lesson: 'LESSON 01 · TREBLE CLEF',
    meet: 'Meet your ', note: 'pitch friends.', lessonIntro: 'Learn to find pitches C4–C5 on the treble staff and piano.',
    every: 'Every pitch has a name', seven: 'We start with eight pitches from C4 to C5: ', repeat: 'They move up one step at a time!',
    names: 'Pitches C4 to C5', choose: (n: Pitch) => `Choose pitch ${n}`, spot: 'Spot it on the staff',
    map: 'The five treble-clef lines are a musical map. C4 is middle C on a ledger line below the staff.',
    play: 'Play it on the piano', tap: 'Tap the matching key. Every pitch has its own frequency and voice.', blackKey: (n: string) => `Play ${n}`,
    ready: 'I’m ready for a quiz', keyboard: 'Piano keyboard from C4 to C5', middleC: 'middle C', quizScope: 'The quiz uses white keys only (C4–C5).',
    playNote: (n: Pitch) => n === 'C4' ? 'Play C4, middle C' : `Play ${n}`, staff: (n: Pitch) => `Treble staff showing pitch ${n}`, titleStaff: (n: Pitch) => `Treble staff with pitch ${n}`,
    thisNote: (n: Pitch) => <>This pitch is <strong>{n}</strong>{n === 'C4' ? ' — middle C.' : '.'} {PITCH_INFO[n].hint.en}</>,
    round: (n: number) => `QUICK QUIZ · ROUND ${n}`, which: 'Which pitch is <em>this</em>?', read: 'Read the treble staff, then tap its matching piano key.',
    answer: 'Tap your answer', nice: (n: Pitch) => <>✨ Nice! You found <strong>{n}</strong>.</>, almost: (n: Pitch) => <>Almost! That was <strong>{n}</strong>. Try the highlighted key.</>,
    next: 'Next pitch', another: 'Try again', footer: <>Made for curious ears <span>·</span> No wrong notes here 🎵</>,
    language: 'Language', swedish: 'Svenska', english: 'English', switchTo: (l: string) => `Switch language to ${l}`,
  },
} as const

const getFrequency = (pitch: PianoKey) => pitch in PITCH_INFO ? PITCH_INFO[pitch as Pitch].frequency : BLACK_KEY_FREQUENCIES.get(pitch as BlackKey) ?? 0

function getAudioContext() {
  if (audioContext) return audioContext
  const AudioContextClass = window.AudioContext || (window as AudioContextWindow).webkitAudioContext
  if (!AudioContextClass) return null
  audioContext = new AudioContextClass()
  return audioContext
}

function getMasterOutput(context: AudioContext) {
  if (masterOutput) return masterOutput

  const compressor = context.createDynamicsCompressor()
  compressor.threshold.value = -18
  compressor.knee.value = 18
  compressor.ratio.value = 3
  compressor.attack.value = 0.003
  compressor.release.value = 0.2

  const gain = context.createGain()
  gain.gain.value = MASTER_VOLUME

  compressor.connect(gain).connect(context.destination)
  masterOutput = gain
  return masterOutput
}

export function resetAudioState() {
  audioContext = null
  masterOutput = null
}

function playTone(pitch: PianoKey) {
  try {
    const context = getAudioContext()
    if (!context) return
    if (context.state === 'suspended') void context.resume()

    const frequency = getFrequency(pitch)
    const now = context.currentTime
    const releaseAt = now + RELEASE_TIME
    const voiceMix = context.createGain()
    const filter = context.createBiquadFilter()

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(4200, now)
    filter.frequency.exponentialRampToValueAtTime(1800, releaseAt)
    filter.Q.value = 0.9

    voiceMix.gain.setValueAtTime(0.0001, now)
    voiceMix.gain.exponentialRampToValueAtTime(0.42, now + ATTACK_TIME)
    voiceMix.gain.exponentialRampToValueAtTime(0.26, now + PEAK_TIME)
    voiceMix.gain.exponentialRampToValueAtTime(0.0001, releaseAt)

    ;[
      { type: 'triangle' as OscillatorType, multiple: 1, level: 0.85, detune: 0 },
      { type: 'sine' as OscillatorType, multiple: 2, level: 0.22, detune: 3 },
      { type: 'sine' as OscillatorType, multiple: 3, level: 0.12, detune: -2 },
    ].forEach(({ type, multiple, level, detune }) => {
      const osc = context.createOscillator()
      const partialGain = context.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(frequency * 1.003 * multiple, now)
      osc.frequency.exponentialRampToValueAtTime(frequency * multiple, now + 0.03)
      osc.detune.value = detune
      partialGain.gain.value = level
      osc.connect(partialGain).connect(voiceMix)
      osc.start(now)
      osc.stop(releaseAt + 0.05)
    })

    voiceMix.connect(filter).connect(getMasterOutput(context))
  } catch { /* sound is a lovely extra, never a requirement */ }
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
    try { const saved = window.localStorage.getItem(LANGUAGE_KEY); return saved === 'en' || saved === 'sv' ? saved : 'sv' } catch { return 'sv' }
  })
  const copy = COPY[language]
  const [tab, setTab] = useState<'learn' | 'quiz'>('learn')
  const [pitch, setPitch] = useState<Pitch>('C4')
  const [selectedKey, setSelectedKey] = useState<PianoKey>('C4')
  const [quizPitch, setQuizPitch] = useState<Pitch>('E4')
  const [answer, setAnswer] = useState<Pitch | null>(null)
  const [streak, setStreak] = useState(0)
  const quizChoices = useMemo(() => [...PITCHES].sort(() => Math.random() - 0.5), [quizPitch])

  useEffect(() => { try { window.localStorage.setItem(LANGUAGE_KEY, language) } catch { /* storage is optional */ } }, [language])
  useEffect(() => { setAnswer(null) }, [quizPitch])
  const chooseAnswer = (choice: PianoKey) => { if (!PITCHES.includes(choice as Pitch)) return; const whiteChoice = choice as Pitch; setAnswer(whiteChoice); if (whiteChoice === quizPitch) { setStreak((s) => s + 1); playTone(whiteChoice) } else setStreak(0) }
  const nextQuestion = () => { setQuizPitch(quizChoices[Math.floor(Math.random() * quizChoices.length)]); setAnswer(null) }

  return <main>
    <header className="topbar">
      <a className="brand" href="#" aria-label={copy.home}><span className="brand-mark">♫</span><span>note nest</span></a>
      <div className="progress" aria-label={copy.progress}><span className="progress-dot filled" /><span className="progress-line" /><span className="progress-dot" /><span className="progress-line" /><span className="progress-dot" /></div>
      <div className="streak" aria-label={copy.streak(streak)}>🔥 <b>{streak}</b></div>
      <div className="language-toggle" role="group" aria-label={copy.language}><button type="button" className={language === 'sv' ? 'selected' : ''} aria-pressed={language === 'sv'} aria-label={copy.switchTo(copy.swedish)} onClick={() => setLanguage('sv')}>{copy.swedish}</button><button type="button" className={language === 'en' ? 'selected' : ''} aria-pressed={language === 'en'} aria-label={copy.switchTo(copy.english)} onClick={() => setLanguage('en')}>{copy.english}</button></div>
    </header>
    <nav className="tabs" aria-label={copy.sections}><button className={tab === 'learn' ? 'selected' : ''} onClick={() => setTab('learn')}>{copy.learn}</button><button className={tab === 'quiz' ? 'selected' : ''} onClick={() => setTab('quiz')}>{copy.quiz} <span>✦</span></button></nav>
    {tab === 'learn' ? <section className="page">
      <div className="intro"><p className="eyebrow">{copy.lesson}</p><h1>{copy.meet}<em>{copy.note}</em></h1><p className="lede">{copy.lessonIntro}</p></div>
      <div className="lesson-card"><div className="card-copy"><span className="step">1</span><div><h2>{copy.every}</h2><p>{copy.seven}<strong>C4, D4, E4, F4, G4, A4, B4, C5.</strong> {copy.repeat}</p></div></div><div className="letter-row" aria-label={copy.names}>{PITCHES.map((p) => <button key={p} className={pitch === p ? 'letter active' : 'letter'} style={{ '--note-color': PITCH_INFO[p].color } as React.CSSProperties} onClick={() => { setPitch(p); setSelectedKey(p); playTone(p) }} aria-label={copy.choose(p)}><span>{pitchLabel(p)}</span><small>{p === 'C4' ? (language === 'sv' ? 'mitt-C' : 'middle C') : `${PITCH_INFO[p].letter}${PITCH_INFO[p].octave}`}</small></button>)}</div></div>
      <div className="lesson-card staff-card"><div className="card-copy"><span className="step">2</span><div><h2>{copy.spot}</h2><p>{copy.map}</p></div></div><Staff pitch={pitch} copy={copy} /><div className="note-caption" style={{ '--note-color': PITCH_INFO[pitch].color } as React.CSSProperties}><span className="caption-dot" />{copy.thisNote(pitch)}</div></div>
      <div className="lesson-card keyboard-card"><div className="card-copy"><span className="step">3</span><div><h2>{copy.play}</h2><p>{copy.tap}</p></div></div><Piano active={selectedKey} onPick={(key) => { setSelectedKey(key); if (PITCHES.includes(key as Pitch)) setPitch(key as Pitch) }} copy={copy} /></div>
      <button className="primary" onClick={() => setTab('quiz')}>{copy.ready} <span>→</span></button>
    </section> : <section className="page quiz-page">
      <div className="intro"><p className="eyebrow">{copy.round(streak + 1)}</p><h1 dangerouslySetInnerHTML={{ __html: copy.which }} /><p className="lede">{copy.read}</p></div>
      <div className="quiz-card"><Staff pitch={quizPitch} copy={copy} /><div className="quiz-prompt">{copy.answer}</div><Piano active={answer ? (answer === quizPitch ? answer : quizPitch) : null} onPick={chooseAnswer} copy={copy} includeBlackKeys={false} /><p className="quiz-scope">{copy.quizScope}</p>{answer && <div className={`feedback ${answer === quizPitch ? 'correct' : 'oops'}`} role="status">{answer === quizPitch ? copy.nice(quizPitch) : copy.almost(answer)}</div>}</div>
      {answer && <button className="primary" onClick={nextQuestion}>{answer === quizPitch ? copy.next : copy.another} <span>→</span></button>}
    </section>}
    <footer>{copy.footer}</footer>
  </main>
}

export default App
