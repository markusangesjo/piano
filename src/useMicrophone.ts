import { useCallback, useEffect, useRef, useState } from 'react'
import { MIDI_LABELS } from './pitch'
import { detectPitch, frequencyToMidi, midiToNoteLabel } from './pitchDetector'
import type { MicrophoneStatus } from './types'

// How long the last debug reading stays on screen after the sound stops.
const DEBUG_FEEDBACK_TIMEOUT_MS = 3000
// How long a correct pitch is held before the lesson advances, so the learner
// gets to enjoy the "nice!" state before the next note appears.
const ADVANCE_DELAY_MS = 700

export type MicrophoneReading = { label: string; frequency: number; clarity: number; rms: number }
export type UnstableReading = { frequency: number; clarity: number }

type MicrophoneOptions = {
  /** MIDI number the learner has to play to move on. */
  expectedMidi: number
  /** True once the current sequence is finished; stops the analysis loop. */
  complete: boolean
  /**
   * Called after a correct pitch has been held for the settle delay. Return
   * true when the whole sequence is finished so listening can stop.
   */
  onPitchMatched: () => boolean | void
}

/**
 * Owns the microphone session: permission, analyser, wake lock and the
 * pitch-reading animation loop. The lesson itself stays in the component and
 * only tells the hook which pitch is expected and what to do after a match.
 */
export function useMicrophone({ expectedMidi, complete, onPitchMatched }: MicrophoneOptions) {
  const [status, setStatus] = useState<MicrophoneStatus>('idle')
  const [heardPitch, setHeardPitch] = useState<string | null>(null)
  const [heardCorrect, setHeardCorrect] = useState<boolean | null>(null)
  const [debugInfo, setDebugInfo] = useState<MicrophoneReading | null>(null)
  const [debugUnstable, setDebugUnstable] = useState<UnstableReading | null>(null)

  const statusRef = useRef(status)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const advanceTimeoutRef = useRef<number | null>(null)
  const debugClearTimeoutRef = useRef<number | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const microphoneSessionRef = useRef(0)
  const lastMidiRef = useRef<number | null>(null)
  const stableFramesRef = useRef(0)
  const matchedRef = useRef(false)
  const debugModeRef = useRef(false)
  const expectedMidiRef = useRef(expectedMidi)
  const completeRef = useRef(complete)
  const onPitchMatchedRef = useRef(onPitchMatched)

  useEffect(() => { statusRef.current = status }, [status])
  useEffect(() => { expectedMidiRef.current = expectedMidi }, [expectedMidi])
  useEffect(() => { completeRef.current = complete }, [complete])
  // Track the newest callback without tearing down the running listen loop.
  useEffect(() => { onPitchMatchedRef.current = onPitchMatched })

  const releaseWakeLock = useCallback(async () => {
    const wakeLock = wakeLockRef.current
    wakeLockRef.current = null
    if (wakeLock) await wakeLock.release()
  }, [])

  const requestWakeLock = useCallback(async () => {
    if (!navigator.wakeLock || wakeLockRef.current || document.visibilityState !== 'visible') return
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch {
      // Wake Lock is optional and may be denied by the browser or device.
    }
  }, [])

  const releaseResources = useCallback(() => {
    microphoneSessionRef.current += 1
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (advanceTimeoutRef.current) window.clearTimeout(advanceTimeoutRef.current)
    advanceTimeoutRef.current = null
    if (debugClearTimeoutRef.current) window.clearTimeout(debugClearTimeoutRef.current)
    debugClearTimeoutRef.current = null
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
  }, [releaseWakeLock])

  const teardown = useCallback(() => {
    releaseResources()
    setDebugInfo(null)
    setDebugUnstable(null)
  }, [releaseResources])

  const stop = useCallback((nextStatus: MicrophoneStatus = 'idle') => {
    teardown()
    setStatus(nextStatus)
  }, [teardown])

  const reset = useCallback(() => {
    lastMidiRef.current = null
    stableFramesRef.current = 0
    matchedRef.current = false
    setHeardPitch(null)
    setHeardCorrect(null)
  }, [])
  const start = useCallback(async (debugMode = false) => {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!navigator.mediaDevices?.getUserMedia || !AudioContextClass) {
      setStatus('unsupported')
      return
    }

    teardown()
    debugModeRef.current = debugMode
    const sessionId = microphoneSessionRef.current
    setStatus('requesting')
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
      if (audioContext.state === 'suspended') await audioContext.resume()
      const analyser = audioContext.createAnalyser()
      // A smaller window shortens how long a new note has to sound before it
      // dominates the analysis buffer, which noticeably cuts detection latency.
      // Debug mode trades a bit of that latency for a much larger window so
      // the low end of the piano (down to A0) has enough samples to resolve.
      analyser.fftSize = debugMode ? 4096 : 1024
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
      setStatus('listening')
      void requestWakeLock()

      const buffer = new Float32Array(analyser.fftSize)
      // Scratch buffers sized for the widest search band (debug mode reaches
      // down to A0), reused every frame so the loop allocates nothing per frame.
      const maxLag = Math.min(Math.floor(audioContext.sampleRate / 24), analyser.fftSize - 1)
      const difference = new Float32Array(maxLag + 1)
      const cmndf = new Float32Array(maxLag + 1)
      // Debug mode analyses the full 88-key spectrum (A0-C8); other modes stay
      // tightly tuned to the app's playable range (G3 headroom below the lowest
      // song note A3, up to C5) to avoid octave errors. The extra headroom keeps
      // A3 (220 Hz) comfortably inside the search band: with a 220 Hz floor the
      // shortest resolvable lag maps to ~220.5 Hz, so the lowest song note would
      // sit right on the edge of what the detector could ever report.
      const minFrequency = debugMode ? 24 : 196
      const maxFrequency = debugMode ? 4300 : 660
      let debugFrame = 0
      const listen = () => {
        const activeAnalyser = analyserRef.current
        if (!activeAnalyser || completeRef.current) return
        if (debugModeRef.current) {
          debugFrame += 1
          // The debug search band is far wider than a lesson frame, so it only
          // analyses every other frame (~30 Hz) to keep the UI smooth.
          if (debugFrame % 2 === 0) {
            rafRef.current = requestAnimationFrame(listen)
            return
          }
        }

        activeAnalyser.getFloatTimeDomainData(buffer)
        const minimumRms = debugMode ? 0.003 : 0.01
        const detection = detectPitch(buffer, audioContext.sampleRate, minFrequency, maxFrequency, minimumRms, difference, cmndf)

        if (!detection) {
          stableFramesRef.current = 0
          lastMidiRef.current = null
          if (debugModeRef.current) {
            setDebugUnstable(null)
            if (!debugClearTimeoutRef.current) {
              debugClearTimeoutRef.current = window.setTimeout(() => {
                setDebugInfo(null)
                debugClearTimeoutRef.current = null
              }, DEBUG_FEEDBACK_TIMEOUT_MS)
            }
          }
          rafRef.current = requestAnimationFrame(listen)
          return
        }

        const { frequency, clarity, rms } = detection
        if (debugClearTimeoutRef.current) {
          window.clearTimeout(debugClearTimeoutRef.current)
          debugClearTimeoutRef.current = null
        }
        const midi = frequencyToMidi(frequency)
        const label = debugModeRef.current ? midiToNoteLabel(midi) : MIDI_LABELS[midi]

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
                advanceTimeoutRef.current = null
                setHeardPitch(null)
                setHeardCorrect(null)
                const sequenceFinished = onPitchMatchedRef.current()
                lastMidiRef.current = null
                stableFramesRef.current = 0
                matchedRef.current = false
                if (sequenceFinished) {
                  teardown()
                  setStatus('completed')
                }
              }, ADVANCE_DELAY_MS)
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
      teardown()
      if (!shouldReportFailure) return
      if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
        setStatus('denied')
      } else {
        setStatus('error')
      }
    }
  }, [requestWakeLock, teardown])

  useEffect(() => {
    const reacquireWakeLock = () => {
      if (document.visibilityState === 'visible' && statusRef.current === 'listening') void requestWakeLock()
    }
    document.addEventListener('visibilitychange', reacquireWakeLock)
    return () => {
      document.removeEventListener('visibilitychange', reacquireWakeLock)
      void releaseWakeLock()
    }
  }, [releaseWakeLock, requestWakeLock])

  // Release the microphone, analyser and wake lock when the app unmounts.
  useEffect(() => () => releaseResources(), [releaseResources])

  return { status, heardPitch, heardCorrect, debugInfo, debugUnstable, start, stop, reset }
}