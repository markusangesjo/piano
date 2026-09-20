import { useEffect, useMemo, useState } from 'react'

const NOTES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const
type Note = typeof NOTES[number]
type Language = 'sv' | 'en'
const LANGUAGE_KEY = 'note-nest-language'
const NOTE_INFO: Record<Note, { octave: number; y: number; color: string; hint: Record<Language, string> }> = {
  A: { octave: 4, y: 130, color: '#f8a23a', hint: { sv: 'A är för äpple – krispigt och ljust!', en: 'A is for apple — crisp and bright!' } },
  B: { octave: 4, y: 110, color: '#ee6f8f', hint: { sv: 'B är för ballong – studsa upp!', en: 'B is for balloon — bounce up!' } },
  C: { octave: 4, y: 90, color: '#7d70dc', hint: { sv: 'C är för katt – nyfiken och klok.', en: 'C is for cat — curious and clever.' } },
  D: { octave: 4, y: 70, color: '#40bfa3', hint: { sv: 'D är för trumma – slå en stadig takt.', en: 'D is for drum — tap a steady beat.' } },
  E: { octave: 4, y: 50, color: '#efb342', hint: { sv: 'E är för ägg – en liten oval.', en: 'E is for egg — a tiny oval.' } },
  F: { octave: 4, y: 30, color: '#ea8055', hint: { sv: 'F är för groda – hitta den vid dammen!', en: 'F is for frog — find it on the pond!' } },
  G: { octave: 4, y: 10, color: '#5ca3df', hint: { sv: 'G är för fniss – det låter glatt!', en: 'G is for giggle — it sounds happy!' } },
}
const COPY = {
  sv: {
    home: 'Note Nest startsida', progress: 'Lektionsframsteg', streak: (n: number) => `${n} rätta svar i rad`,
    sections: 'Lektionsdelar', learn: 'Lär dig en ton', quiz: 'Snabbquiz', lesson: 'LEKTION 01 · DET MUSIKALISKA ALFABETET',
    meet: 'Möt dina ', note: 'tonvänner.', lessonIntro: 'Musik har bara sju bokstavsnamn. Lär dig hitta dem, ett litet steg i taget.',
    every: 'Varje ton har ett namn', seven: 'Toner använder de sju första bokstäverna: ', repeat: 'De upprepas i en liten glad loop!',
    names: 'De sju tonnamnen', choose: (n: Note) => `Välj tonen ${n}`, spot: 'Hitta den på notlinjerna',
    map: 'De fem linjerna är en musikalisk karta. Tonen sitter på olika plats för varje bokstav.',
    play: 'Spela den på pianot', tap: 'Tryck på rätt tangent. Hör hur varje ton har sin egen röst.',
    ready: 'Jag är redo för quiz', sevenLabel: 'De sju tonnamnen', keyboard: 'En oktavs pianoklaviatur',
    playNote: (n: Note) => `Spela ${n}`, staff: (n: Note) => `Notlinjer med tonen ${n}`, titleStaff: (n: Note) => `Notlinjer med tonen ${n}`,
    thisNote: (n: Note) => <>Den här tonen är <strong>{n}</strong> – {NOTE_INFO[n].hint.sv}</>,
    round: (n: number) => `SNABBQUIZ · RUNDA ${n}`, which: 'Vilken ton är <em>det här</em>?', read: 'Läs notlinjerna och tryck sedan på dess bokstav på pianot.',
    answer: 'Tryck på ditt svar', nice: (n: Note) => <>✨ Snyggt! Du hittade <strong>{n}</strong>.</>, almost: (n: Note) => <>Nästan! Det var <strong>{n}</strong>. Försök med den markerade tangenten.</>,
    next: 'Nästa ton', another: 'Försök igen', footer: <>Gjord för nyfikna öron <span>·</span> Inga fel toner här 🎵</>,
    language: 'Språk', swedish: 'Svenska', english: 'English', switchTo: (l: string) => `Byt språk till ${l}`,
    noteWords: { A: 'äpple', B: 'ballong', C: 'katt', D: 'trumma', E: 'ägg', F: 'groda', G: 'fniss' },
  },
  en: {
    home: 'Note Nest home', progress: 'Lesson progress', streak: (n: number) => `${n} correct answers in a row`,
    sections: 'Lesson sections', learn: 'Learn a note', quiz: 'Quick quiz', lesson: 'LESSON 01 · THE MUSICAL ALPHABET',
    meet: 'Meet your ', note: 'note friends.', lessonIntro: "Music has just seven letter names. Let's learn to spot them, one tiny step at a time.",
    every: 'Every note has a name', seven: 'Notes use the first seven letters: ', repeat: 'They repeat like a merry little loop!',
    names: 'The seven note names', choose: (n: Note) => `Choose note ${n}`, spot: 'Spot it on the staff',
    map: 'These five lines are a musical map. The note sits in a different place for each letter.',
    play: 'Play it on the piano', tap: 'Tap the matching key. Hear how every note has its own voice.',
    ready: 'I’m ready for a quiz', sevenLabel: 'The seven note names', keyboard: 'One octave piano keyboard',
    playNote: (n: Note) => `Play ${n}`, staff: (n: Note) => `Treble staff showing note ${n}`, titleStaff: (n: Note) => `Treble staff with note ${n}`,
    thisNote: (n: Note) => <>This note is <strong>{n}</strong> — {NOTE_INFO[n].hint.en}</>,
    round: (n: number) => `QUICK QUIZ · ROUND ${n}`, which: 'Which note is <em>this</em>?', read: 'Read the staff, then tap its letter on the piano.',
    answer: 'Tap your answer', nice: (n: Note) => <>✨ Nice! You found <strong>{n}</strong>.</>, almost: (n: Note) => <>Almost! That was <strong>{n}</strong>. Try the highlighted key.</>,
    next: 'Next note', another: 'Try another', footer: <>Made for curious ears <span>·</span> No wrong notes here 🎵</>,
    language: 'Language', swedish: 'Svenska', english: 'English', switchTo: (l: string) => `Switch language to ${l}`,
    noteWords: { A: 'apple', B: 'balloon', C: 'cat', D: 'drum', E: 'egg', F: 'frog', G: 'giggle' },
  },
} as const

const KEY_WIDTH = 52

function playTone(note: Note) {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    const osc = context.createOscillator()
    const gain = context.createGain()
    const frequencies: Record<Note, number> = { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392, A: 440, B: 493.88 }
    osc.frequency.value = frequencies[note]
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

function Staff({ note, copy }: { note: Note; copy: typeof COPY[Language] }) {
  const info = NOTE_INFO[note]
  return <div className="staff-wrap" aria-label={copy.staff(note)}>
    <svg className="staff" viewBox="0 0 500 170" role="img">
      <title>{copy.titleStaff(note)}</title>
      <text x="26" y="116" className="clef">𝄞</text>
      {[50, 70, 90, 110, 130].map((y) => <line key={y} x1="92" y1={y} x2="472" y2={y} className="staff-line" />)}
      <ellipse cx="280" cy={info.y} rx="17" ry="12" fill={info.color} className="note-head" />
      <line x1="296" y1={info.y} x2="296" y2={info.y - 51} className="stem" />
      <circle cx="274" cy={info.y - 4} r="3" fill="white" opacity=".75" />
    </svg>
  </div>
}

function Piano({ active, onPick, copy }: { active: Note; onPick: (note: Note) => void; copy: typeof COPY[Language] }) {
  return <div className="piano" aria-label={copy.keyboard}>
    {NOTES.map((note) => <button key={note} className={`white-key ${active === note ? 'active' : ''}`} style={{ '--key-color': NOTE_INFO[note].color } as React.CSSProperties} onClick={() => { onPick(note); playTone(note) }} aria-label={copy.playNote(note)}><span>{note}</span></button>)}
  </div>
}

function App() {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = window.localStorage.getItem(LANGUAGE_KEY)
      return saved === 'en' || saved === 'sv' ? saved : 'sv'
    } catch { return 'sv' }
  })
  const copy = COPY[language]
  const [tab, setTab] = useState<'learn' | 'quiz'>('learn')
  const [note, setNote] = useState<Note>('C')
  const [quizNote, setQuizNote] = useState<Note>('E')
  const [answer, setAnswer] = useState<Note | null>(null)
  const [streak, setStreak] = useState(0)
  const quizChoices = useMemo(() => [...NOTES].sort(() => Math.random() - 0.5), [quizNote])

  useEffect(() => { try { window.localStorage.setItem(LANGUAGE_KEY, language) } catch { /* storage is optional */ } }, [language])
  useEffect(() => { setAnswer(null) }, [quizNote])
  const chooseAnswer = (choice: Note) => {
    setAnswer(choice)
    if (choice === quizNote) { setStreak((s) => s + 1); playTone(choice) } else setStreak(0)
  }
  const nextQuestion = () => {
    setQuizNote(NOTES[Math.floor(Math.random() * NOTES.length)])
    setAnswer(null)
  }

  return <main>
    <header className="topbar">
      <a className="brand" href="#" aria-label={copy.home}><span className="brand-mark">♫</span><span>note nest</span></a>
      <div className="progress" aria-label={copy.progress}><span className="progress-dot filled" /><span className="progress-line" /><span className="progress-dot" /><span className="progress-line" /><span className="progress-dot" /></div>
      <div className="streak" aria-label={copy.streak(streak)}>🔥 <b>{streak}</b></div>
      <div className="language-toggle" role="group" aria-label={copy.language}>
        <button type="button" className={language === 'sv' ? 'selected' : ''} aria-pressed={language === 'sv'} aria-label={copy.switchTo(copy.swedish)} onClick={() => setLanguage('sv')}>{copy.swedish}</button>
        <button type="button" className={language === 'en' ? 'selected' : ''} aria-pressed={language === 'en'} aria-label={copy.switchTo(copy.english)} onClick={() => setLanguage('en')}>{copy.english}</button>
      </div>
    </header>
    <nav className="tabs" aria-label={copy.sections}><button className={tab === 'learn' ? 'selected' : ''} onClick={() => setTab('learn')}>{copy.learn}</button><button className={tab === 'quiz' ? 'selected' : ''} onClick={() => setTab('quiz')}>{copy.quiz} <span>✦</span></button></nav>
    {tab === 'learn' ? <section className="page">
      <div className="intro"><p className="eyebrow">{copy.lesson}</p><h1>{copy.meet}<em>{copy.note}</em></h1><p className="lede">{copy.lessonIntro}</p></div>
      <div className="lesson-card">
        <div className="card-copy"><span className="step">1</span><div><h2>{copy.every}</h2><p>{copy.seven}<strong>A, B, C, D, E, F, G.</strong> {copy.repeat}</p></div></div>
        <div className="letter-row" aria-label={copy.names}>{NOTES.map((n) => <button key={n} className={note === n ? 'letter active' : 'letter'} style={{ '--note-color': NOTE_INFO[n].color } as React.CSSProperties} onClick={() => { setNote(n); playTone(n) }} aria-label={copy.choose(n)}><span>{n}</span><small>{copy.noteWords[n]}</small></button>)}</div>
      </div>
      <div className="lesson-card staff-card">
        <div className="card-copy"><span className="step">2</span><div><h2>{copy.spot}</h2><p>{copy.map}</p></div></div>
        <Staff note={note} copy={copy} /><div className="note-caption" style={{ '--note-color': NOTE_INFO[note].color } as React.CSSProperties}><span className="caption-dot" />{copy.thisNote(note)}</div>
      </div>
      <div className="lesson-card keyboard-card">
        <div className="card-copy"><span className="step">3</span><div><h2>{copy.play}</h2><p>{copy.tap}</p></div></div>
        <Piano active={note} onPick={setNote} copy={copy} />
      </div>
      <button className="primary" onClick={() => setTab('quiz')}>{copy.ready} <span>→</span></button>
    </section> : <section className="page quiz-page">
      <div className="intro"><p className="eyebrow">{copy.round(streak + 1)}</p><h1 dangerouslySetInnerHTML={{ __html: copy.which }} /><p className="lede">{copy.read}</p></div>
      <div className="quiz-card"><Staff note={quizNote} copy={copy} /><div className="quiz-prompt">{copy.answer}</div><Piano active={answer ?? quizNote} onPick={chooseAnswer} copy={copy} />
        {answer && <div className={`feedback ${answer === quizNote ? 'correct' : 'oops'}`} role="status">{answer === quizNote ? copy.nice(quizNote) : copy.almost(answer)}</div>}
      </div>
      {answer && <button className="primary" onClick={nextQuestion}>{answer === quizNote ? copy.next : copy.another} <span>→</span></button>}
    </section>}
    <footer>{copy.footer}</footer>
  </main>
}

export default App
