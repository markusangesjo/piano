import { useEffect, useMemo, useState } from 'react'

const NOTES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const
type Note = typeof NOTES[number]
const NOTE_INFO: Record<Note, { octave: number; y: number; color: string; hint: string }> = {
  A: { octave: 4, y: 130, color: '#f8a23a', hint: 'A is for apple — crisp and bright!' },
  B: { octave: 4, y: 110, color: '#ee6f8f', hint: 'B is for balloon — bounce up!' },
  C: { octave: 4, y: 90, color: '#7d70dc', hint: 'C is for cat — curious and clever.' },
  D: { octave: 4, y: 70, color: '#40bfa3', hint: 'D is for drum — tap a steady beat.' },
  E: { octave: 4, y: 50, color: '#efb342', hint: 'E is for egg — a tiny oval.' },
  F: { octave: 4, y: 30, color: '#ea8055', hint: 'F is for frog — find it on the pond!' },
  G: { octave: 4, y: 10, color: '#5ca3df', hint: 'G is for giggle — it sounds happy!' },
}

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

function Staff({ note }: { note: Note }) {
  const info = NOTE_INFO[note]
  return <div className="staff-wrap" aria-label={`Treble staff showing note ${note}`}>
    <svg className="staff" viewBox="0 0 500 170" role="img">
      <title>Treble staff with note {note}</title>
      <text x="26" y="116" className="clef">𝄞</text>
      {[50, 70, 90, 110, 130].map((y) => <line key={y} x1="92" y1={y} x2="472" y2={y} className="staff-line" />)}
      <ellipse cx="280" cy={info.y} rx="17" ry="12" fill={info.color} className="note-head" />
      <line x1="296" y1={info.y} x2="296" y2={info.y - 51} className="stem" />
      <circle cx="274" cy={info.y - 4} r="3" fill="white" opacity=".75" />
    </svg>
  </div>
}

function Piano({ active, onPick }: { active: Note; onPick: (note: Note) => void }) {
  return <div className="piano" aria-label="One octave piano keyboard">
    {NOTES.map((note) => <button key={note} className={`white-key ${active === note ? 'active' : ''}`} style={{ '--key-color': NOTE_INFO[note].color } as React.CSSProperties} onClick={() => { onPick(note); playTone(note) }} aria-label={`Play ${note}`}><span>{note}</span></button>)}
  </div>
}

function App() {
  const [tab, setTab] = useState<'learn' | 'quiz'>('learn')
  const [note, setNote] = useState<Note>('C')
  const [quizNote, setQuizNote] = useState<Note>('E')
  const [answer, setAnswer] = useState<Note | null>(null)
  const [streak, setStreak] = useState(0)
  const quizChoices = useMemo(() => [...NOTES].sort(() => Math.random() - 0.5), [quizNote])

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
      <a className="brand" href="#" aria-label="Note Nest home"><span className="brand-mark">♫</span><span>note nest</span></a>
      <div className="progress" aria-label="Lesson progress"><span className="progress-dot filled" /><span className="progress-line" /><span className="progress-dot" /><span className="progress-line" /><span className="progress-dot" /></div>
      <div className="streak" aria-label={`${streak} correct answers in a row`}>🔥 <b>{streak}</b></div>
    </header>
    <nav className="tabs" aria-label="Lesson sections"><button className={tab === 'learn' ? 'selected' : ''} onClick={() => setTab('learn')}>Learn a note</button><button className={tab === 'quiz' ? 'selected' : ''} onClick={() => setTab('quiz')}>Quick quiz <span>✦</span></button></nav>
    {tab === 'learn' ? <section className="page">
      <div className="intro"><p className="eyebrow">LESSON 01 · THE MUSICAL ALPHABET</p><h1>Meet your <em>note</em> friends.</h1><p className="lede">Music has just seven letter names. Let's learn to spot them, one tiny step at a time.</p></div>
      <div className="lesson-card">
        <div className="card-copy"><span className="step">1</span><div><h2>Every note has a name</h2><p>Notes use the first seven letters: <strong>A, B, C, D, E, F, G.</strong> They repeat like a merry little loop!</p></div></div>
        <div className="letter-row" aria-label="The seven note names">{NOTES.map((n) => <button key={n} className={note === n ? 'letter active' : 'letter'} style={{ '--note-color': NOTE_INFO[n].color } as React.CSSProperties} onClick={() => { setNote(n); playTone(n) }} aria-label={`Choose note ${n}`}><span>{n}</span><small>{n === 'A' ? 'apple' : n === 'B' ? 'balloon' : n === 'C' ? 'cat' : n === 'D' ? 'drum' : n === 'E' ? 'egg' : n === 'F' ? 'frog' : 'giggle'}</small></button>)}</div>
      </div>
      <div className="lesson-card staff-card">
        <div className="card-copy"><span className="step">2</span><div><h2>Spot it on the staff</h2><p>These five lines are a musical map. The note sits in a different place for each letter.</p></div></div>
        <Staff note={note} /><div className="note-caption" style={{ '--note-color': NOTE_INFO[note].color } as React.CSSProperties}><span className="caption-dot" />This note is <strong>{note}</strong> — {NOTE_INFO[note].hint}</div>
      </div>
      <div className="lesson-card keyboard-card">
        <div className="card-copy"><span className="step">3</span><div><h2>Play it on the piano</h2><p>Tap the matching key. Hear how every note has its own voice.</p></div></div>
        <Piano active={note} onPick={setNote} />
      </div>
      <button className="primary" onClick={() => setTab('quiz')}>I’m ready for a quiz <span>→</span></button>
    </section> : <section className="page quiz-page">
      <div className="intro"><p className="eyebrow">QUICK QUIZ · ROUND {streak + 1}</p><h1>Which note is <em>this</em>?</h1><p className="lede">Read the staff, then tap its letter on the piano.</p></div>
      <div className="quiz-card"><Staff note={quizNote} /><div className="quiz-prompt">Tap your answer</div><Piano active={answer ?? quizNote} onPick={chooseAnswer} />
        {answer && <div className={`feedback ${answer === quizNote ? 'correct' : 'oops'}`} role="status">{answer === quizNote ? <>✨ Nice! You found <strong>{quizNote}</strong>.</> : <>Almost! That was <strong>{answer}</strong>. Try the highlighted key.</>}</div>}
      </div>
      {answer && <button className="primary" onClick={nextQuestion}>{answer === quizNote ? 'Next note' : 'Try another'} <span>→</span></button>}
    </section>}
    <footer>Made for curious ears <span>·</span> No wrong notes here 🎵</footer>
  </main>
}

export default App
