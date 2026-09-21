import { useEffect, useState } from 'react'
import { playTone } from './audio'
import { Icon } from './components/Icon'
import { Piano } from './components/Piano'
import { Staff } from './components/Staff'
import { COPY } from './copy'
import { PITCHES, PITCH_INFO, PITCH_TO_MIDI, PRACTICE_SEQUENCE, isWhiteKey, pianoKeyLabel, pitchLabel, type PianoKey, type Pitch } from './pitch'
import { SONGS, type SongId } from './songs'
import type { Language, Tab } from './types'
import { useMicrophone } from './useMicrophone'

const LANGUAGE_KEY = 'note-nest-language'
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.1.0'

const UPCOMING_NOTES_SHOWN = 4

// The quiz always asks for a different note than the one on screen right now.
function pickNextQuizPitch(current: Pitch): Pitch {
  const alternatives = PITCHES.filter((candidate) => candidate !== current)
  return alternatives[Math.floor(Math.random() * alternatives.length)]
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
  const [answer, setAnswer] = useState<PianoKey | null>(null)
  const [streak, setStreak] = useState(0)
  const [selectedSongId, setSelectedSongId] = useState<SongId | null>(null)
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [practiceComplete, setPracticeComplete] = useState(false)

  const songMode = tab === 'song'
  const selectedSong = selectedSongId ? SONGS.find((song) => song.id === selectedSongId) ?? null : null
  const activeSequence = songMode && selectedSong ? selectedSong.sequence : PRACTICE_SEQUENCE
  const currentPracticePitch = activeSequence[practiceIndex] ?? activeSequence[activeSequence.length - 1]
  const upcomingPitches = activeSequence.slice(practiceIndex + 1, practiceIndex + 1 + UPCOMING_NOTES_SHOWN)

  // Keep <html lang> in sync so screen readers announce the language that is
  // actually on screen (index.html ships with the Swedish default).
  useEffect(() => {
    try { window.localStorage.setItem(LANGUAGE_KEY, language) } catch { /* storage is optional */ }
    document.documentElement.lang = language
  }, [language])

  // The listening loop lives in its own hook; App only decides which pitch the
  // learner has to play and what happens once that note has been matched.
  const advancePractice = () => {
    const nextIndex = practiceIndex + 1
    if (nextIndex >= activeSequence.length) {
      setPracticeComplete(true)
      return true
    }
    setPracticeIndex(nextIndex)
    return false
  }

  const {
    status: micStatus,
    heardPitch,
    heardCorrect,
    debugInfo,
    debugUnstable,
    start: startMicrophone,
    stop: stopMicrophone,
    reset: resetMicrophone,
  } = useMicrophone({
    expectedMidi: PITCH_TO_MIDI[currentPracticePitch],
    complete: practiceComplete,
    onPitchMatched: advancePractice,
  })

  const restartPractice = () => {
    setPracticeIndex(0)
    setPracticeComplete(false)
    resetMicrophone()
  }

  const openPracticeMode = (nextTab: 'practice' | 'song' | 'debug') => {
    stopMicrophone('idle')
    restartPractice()
    if (nextTab === 'song') setSelectedSongId(null)
    setTab(nextTab)
  }

  const chooseSong = (songId: SongId) => {
    stopMicrophone('idle')
    restartPractice()
    setSelectedSongId(songId)
    setTab('song')
  }

  const chooseAnswer = (choice: PianoKey) => {
    // The quiz keyboard shows the black keys too so that it looks like a real
    // piano, but the questions stay inside the eight white notes from the
    // lesson. A black key is therefore never the answer: it gets its own nudge
    // instead of the regular "almost" feedback.
    if (!isWhiteKey(choice)) {
      setStreak(0)
      setAnswer(choice)
      return
    }
    if (choice === quizPitch) {
      setStreak((s) => s + 1)
      void playTone(choice)
      nextQuestion()
    } else {
      setStreak(0)
      setAnswer(choice)
    }
  }

  // Clearing the feedback belongs to the question change itself rather than to
  // an effect on quizPitch, which would only schedule a second render.
  const nextQuestion = () => {
    setQuizPitch(pickNextQuizPitch(quizPitch))
    setAnswer(null)
  }

  // A wrong answer keeps the same note on screen so the learner can look at the
  // staff and try that note again instead of being moved on to a new one.
  const retryQuestion = () => setAnswer(null)


  useEffect(() => {
    if (tab !== 'practice' && tab !== 'song' && tab !== 'debug') return
    if (tab === 'song' && !selectedSongId) return

    let cancelled = false
    const startIfPermissionGranted = async () => {
      if (!navigator.permissions?.query) return

      try {
        const permission = await navigator.permissions.query({ name: 'microphone' })
        if (!cancelled && permission.state === 'granted') void startMicrophone(tab === 'debug')
      } catch {
        // Permission checks are optional; the button remains available as a fallback.
      }
    }

    void startIfPermissionGranted()
    return () => { cancelled = true }
  }, [tab, selectedSongId, startMicrophone])

  useEffect(() => {
    if ((tab !== 'practice' && tab !== 'song' && tab !== 'debug') && (micStatus === 'listening' || micStatus === 'requesting')) {
      stopMicrophone('idle')
    }
  }, [tab, micStatus, stopMicrophone])

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

  const songTitleText = selectedSong ? selectedSong.title[language] : ''
  const practiceTitle = songMode ? copy.songTitle(songTitleText) : copy.microphoneTitle
  const practiceLead = songMode ? copy.songLead : copy.practiceLead
  const practiceIntro = songMode ? copy.songIntro : copy.microphoneIntro
  const practiceTarget = songMode ? copy.songTarget(currentPracticePitch) : copy.target(currentPracticePitch)
  const practiceCompleteMessage = songMode ? copy.songCompleted(songTitleText) : copy.completed
  const restartLabel = songMode ? copy.restartSong : copy.restartPractice

  return <main>
    <header className="topbar">
      <a className="brand" href="#" aria-label={copy.home}><span className="brand-mark"><Icon name="note" /></span><span>note nest</span></a>
      <div className="progress" role="img" aria-label={copy.progress}><span className="progress-dot filled" /><span className="progress-line" /><span className="progress-dot" /><span className="progress-line" /><span className="progress-dot" /></div>
      <div className="streak" aria-label={copy.streak(streak)}><Icon name="flame" /><b>{streak}</b></div>
      <div className="language-toggle" role="group" aria-label={copy.language}><button type="button" className={language === 'sv' ? 'selected' : ''} aria-pressed={language === 'sv'} aria-label={copy.switchTo(copy.swedish)} onClick={() => setLanguage('sv')}>{copy.swedish}</button><button type="button" className={language === 'en' ? 'selected' : ''} aria-pressed={language === 'en'} aria-label={copy.switchTo(copy.english)} onClick={() => setLanguage('en')}>{copy.english}</button></div>
    </header>
    <nav className="tabs" aria-label={copy.sections}><button className={tab === 'learn' ? 'selected' : ''} aria-current={tab === 'learn' ? 'true' : undefined} onClick={() => setTab('learn')}>{copy.learn}</button><button className={tab === 'quiz' ? 'selected' : ''} aria-current={tab === 'quiz' ? 'true' : undefined} onClick={() => setTab('quiz')}>{copy.quiz} <span><Icon name="sparkle" /></span></button><button className={tab === 'practice' ? 'selected' : ''} aria-current={tab === 'practice' ? 'true' : undefined} onClick={() => openPracticeMode('practice')}>{copy.practice}</button><button className={tab === 'song' ? 'selected' : ''} aria-current={tab === 'song' ? 'true' : undefined} onClick={() => openPracticeMode('song')}>{copy.song}</button><button className={tab === 'debug' ? 'selected' : ''} aria-current={tab === 'debug' ? 'true' : undefined} onClick={() => openPracticeMode('debug')}>{copy.debug} <span><Icon name="bug" /></span></button></nav>
    {tab === 'learn' ? <section className="page">
      <div className="intro"><p className="eyebrow">{copy.lesson}</p><h1>{copy.meet}<em>{copy.note}</em></h1><p className="lede">{copy.lessonIntro}</p></div>
      <div className="lesson-card"><div className="card-copy"><span className="step">1</span><div><h2>{copy.every}</h2><p>{copy.seven}<strong>C4, D4, E4, F4, G4, A4, B4, C5.</strong> {copy.repeat}</p></div></div><div className="letter-row" aria-label={copy.names}>{PITCHES.map((p) => <button key={p} className={pitch === p ? 'letter active' : 'letter'} style={{ '--note-color': PITCH_INFO[p].color } as React.CSSProperties} onClick={() => { setPitch(p); setSelectedKey(p); void playTone(p) }} aria-label={copy.choose(p)}><span>{pitchLabel(p)}</span><small>{p === 'C4' ? (language === 'sv' ? 'mitt-C' : 'middle C') : `${PITCH_INFO[p].letter}${PITCH_INFO[p].octave}`}</small></button>)}</div></div>
      <div className="lesson-card staff-card"><div className="card-copy"><span className="step">2</span><div><h2>{copy.spot}</h2><p>{copy.map}</p></div></div><Staff pitch={pitch} copy={copy} /><div className="note-caption" style={{ '--note-color': PITCH_INFO[pitch].color } as React.CSSProperties}><span className="caption-dot" />{copy.thisNote(pitch)}</div></div>
      <div className="lesson-card keyboard-card"><div className="card-copy"><span className="step">3</span><div><h2>{copy.play}</h2><p>{copy.tap}</p></div></div><Piano active={selectedKey} onPick={(key) => { setSelectedKey(key); if (isWhiteKey(key)) setPitch(key) }} copy={copy} /></div>
      <button className="primary" onClick={() => setTab('quiz')}>{copy.ready} <span><Icon name="arrow" /></span></button>
    </section> : tab === 'quiz' ? <section className="page quiz-page">
      <div className="intro"><p className="eyebrow">{copy.round(streak + 1)}</p><h1 dangerouslySetInnerHTML={{ __html: copy.which }} /><p className="lede">{copy.read}</p></div>
      {/* The quiz never highlights a key — not even the one that was tapped —
          so the learner has to read the note on the staff instead. The
          keyboard still shows the black keys, so it looks like a real piano. */}
      <div className="quiz-card"><Staff pitch={quizPitch} copy={copy} /><div className="quiz-prompt">{copy.answer}</div><Piano active={null} onPick={chooseAnswer} copy={copy} /><p className="quiz-scope">{copy.quizScope}</p>{answer && <div className="feedback oops" role="status">{isWhiteKey(answer) ? copy.almost(answer) : copy.blackKeyAttempt(pianoKeyLabel(answer))}</div>}</div>
      {answer && <button className="primary" onClick={retryQuestion}>{copy.another} <span><Icon name="arrow" /></span></button>}
    </section> : tab === 'debug' ? <section className="page quiz-page">
      <div className="intro"><p className="eyebrow">{copy.debugEyebrow}</p><h1>{copy.debugTitle}</h1><p className="lede">{copy.debugLead}</p></div>
      <div className="quiz-card practice-card debug-card">
        <div className="card-copy"><span className="step"><Icon name="bug" /></span><div><h2>{copy.debugTitle}</h2><p>{copy.debugIntro}</p></div></div>
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
      {songMode && !selectedSong ? <>
        <div className="intro"><p className="eyebrow">{copy.song}</p><h1>{copy.chooseSong}</h1></div>
        <div className="song-picker">{SONGS.map((song) => <button key={song.id} type="button" className="song-option" onClick={() => chooseSong(song.id)}>{song.title[language]}</button>)}</div>
      </> : <>
        <div className="intro"><p className="eyebrow">{songMode ? copy.songLesson(songTitleText, practiceComplete ? activeSequence.length : practiceIndex + 1, activeSequence.length) : copy.practiceLesson(practiceComplete ? activeSequence.length : practiceIndex + 1, activeSequence.length)}</p><h1>{practiceTitle}</h1><p className="lede">{practiceLead}</p></div>
        <div className="quiz-card practice-card">
          <div className="card-copy"><span className="step"><Icon name={songMode ? 'note' : 'mic'} /></span><div><h2>{practiceTitle}</h2><p>{practiceIntro}</p></div></div>
          {songMode && selectedSong && <div className="song-sequence" aria-label={copy.songTitle(songTitleText)}>{selectedSong.sequence.map((note, index) => <span key={`${note}-${index}`} className={index === practiceIndex ? 'current' : index < practiceIndex ? 'played' : ''}>{note.replace(/\d+$/, '')}</span>)}</div>}
          {!practiceComplete && <><Staff pitch={currentPracticePitch} copy={copy} upcoming={upcomingPitches} /><div className="practice-target"><strong>{practiceTarget}</strong><span>{microphoneMessage}</span></div></>}
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
      </>}
    </section>}
    <footer>{copy.footer} <span>·</span> <span>{copy.version(`v${APP_VERSION}`)}</span></footer>
  </main>
}

export default App
