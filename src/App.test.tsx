import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { resetAudioState } from './audio'
import { BLACK_KEYS, PITCHES, PITCH_INFO } from './pitch'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Note Nest lesson', () => {
  const originalAudioContext = window.AudioContext
  const originalWebkitAudioContext = (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  beforeEach(() => {
    window.localStorage.clear()
    return resetAudioState()
  })

  afterEach(async () => {
    await resetAudioState()
    if (originalAudioContext) Object.defineProperty(window, 'AudioContext', { configurable: true, writable: true, value: originalAudioContext })
    else Reflect.deleteProperty(window, 'AudioContext')
    if (originalWebkitAudioContext) Object.defineProperty(window, 'webkitAudioContext', { configurable: true, writable: true, value: originalWebkitAudioContext })
    else Reflect.deleteProperty(window, 'webkitAudioContext')
  })

  /**
   * Stubs the Web Audio + getUserMedia surface the microphone hook needs.
   * Pass driveFrames to capture animation frames so a test can decide when the
   * detection loop runs; `frequency()` is re-read on every frame.
   */
  const stubMicrophone = (options: { frequency?: () => number; driveFrames?: boolean } = {}) => {
    const { frequency = () => 261.63, driveFrames = false } = options
    let rafCallback: FrameRequestCallback | null = null

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      if (driveFrames) rafCallback = callback
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
      rafCallback = null
    })
    vi.stubGlobal('AudioContext', class {
      state = 'running'
      resume() {
        return Promise.resolve()
      }
      sampleRate = 44100
      createAnalyser() {
        return {
          fftSize: 2048,
          smoothingTimeConstant: 0,
          getFloatTimeDomainData(data: Float32Array) {
            const heardFrequency = frequency()
            for (let i = 0; i < data.length; i += 1) data[i] = Math.sin((2 * Math.PI * heardFrequency * i) / 44100) * 0.4
          },
        }
      }
      createMediaStreamSource() {
        return { connect: vi.fn() }
      }
      close() {
        return Promise.resolve()
      }
    })

    const trackStop = vi.fn()
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: trackStop }] })
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })

    const runFrames = (count: number) => {
      for (let i = 0; i < count; i += 1) {
        const callback = rafCallback
        if (!callback) break
        rafCallback = null
        callback(0)
      }
    }

    return { runFrames, getUserMedia, trackStop }
  }

  it('defaults to Swedish and shows the note alphabet and piano keys', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /möt dina tonvänner/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Spela C4, mitt-C' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Välj tonen G4' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Språk' })).toBeInTheDocument()
    expect(screen.getByText('Version v0.1.0')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('sv')
  })

  it('switches to English and persists the selection', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Byt språk till English' }))
    expect(screen.getByRole('heading', { name: /meet your pitch friends/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play C4, middle C' })).toBeInTheDocument()
    expect(window.localStorage.getItem('note-nest-language')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('moves to the quiz and advances after a correct answer', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /redo för quiz/i }))
    expect(screen.getByRole('heading', { name: /vilken ton är det här/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Diskantklav med tonen E4' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Spela E4' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Diskantklav med tonen E4' })).not.toBeInTheDocument()
  })

  it('shows feedback without revealing the correct key after a wrong answer', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /redo för quiz/i }))
    await user.click(screen.getByRole('button', { name: 'Spela A4' }))
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Spela E4' })).not.toHaveClass('active')
  })

  it('keeps the same note when the learner wants to try again', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /redo för quiz/i }))
    await user.click(screen.getByRole('button', { name: 'Spela A4' }))
    expect(screen.getByRole('status')).toHaveTextContent('Du tryckte på A4')

    await user.click(screen.getByRole('button', { name: /försök igen/i }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Diskantklav med tonen E4' })).toBeInTheDocument()
  })

  it('uses the treble staff positions and labels the C4 ledger line as middle C', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(PITCHES).toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'])
    expect(PITCH_INFO.E4.y).toBe(130)
    expect(PITCH_INFO.F4.y).toBe(120)
    expect(PITCH_INFO.C5.y).toBe(80)
    expect(screen.getByRole('button', { name: 'Spela C4, mitt-C' })).toBeInTheDocument()
    const svg = screen.getByRole('img', { name: 'Diskantklav med tonen C4' })
    expect(svg.querySelector('.ledger-line')).toHaveAttribute('y1', '150')
    await user.click(screen.getByRole('button', { name: 'Välj tonen E4' }))
    expect(svg.querySelector('.note-head')).toHaveAttribute('cy', '130')
  })

  it('renders all black keys, highlights a selected accidental, and marks middle C', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(BLACK_KEYS).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Spela C♯4 / D♭4' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Spela A♯4 / B♭4' })).toBeInTheDocument()
    expect(screen.getByText('mitt-C', { selector: '.middle-c-marker' })).toBeInTheDocument()
    const blackKey = screen.getByRole('button', { name: 'Spela F♯4 / G♭4' })
    await user.click(blackKey)
    expect(blackKey).toHaveClass('active')
  })

  it('keeps the quiz scoped to white keys', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /redo för quiz/i }))
    expect(screen.getByText('Quizet använder bara vita tangenter (C4–C5).')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Spela C♯4 / D♭4' })).not.toBeInTheDocument()
    expect(within(screen.getByLabelText('Pianoklaviatur från C4 till C5')).getAllByRole('button')).toHaveLength(PITCHES.length)
  })

  it('does not reveal the quiz answer before or after an incorrect selection', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /redo för quiz/i }))

    const targetKey = screen.getByRole('button', { name: 'Spela E4' })
    expect(targetKey).not.toHaveClass('active')

    await user.click(screen.getByRole('button', { name: 'Spela A4' }))
    expect(screen.getByRole('button', { name: 'Spela E4' })).not.toHaveClass('active')
    expect(screen.getByRole('button', { name: 'Spela A4' })).not.toHaveClass('active')
  })

  it('builds a fuller audio chain when a key is played', async () => {
    const user = userEvent.setup()
    const createOscillator = vi.fn(() => ({
      type: 'sine',
      frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      detune: { value: 0 },
      connect: vi.fn(function connect(this: object) { return this }),
      start: vi.fn(),
      stop: vi.fn(),
    }))
    const createGain = vi.fn(() => ({
      gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(function connect(this: object) { return this }),
    }))
    const createBiquadFilter = vi.fn(() => ({
      type: 'lowpass',
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      Q: { value: 0 },
      connect: vi.fn(function connect(this: object) { return this }),
    }))
    const createDynamicsCompressor = vi.fn(() => ({
      threshold: { value: 0 },
      knee: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 },
      connect: vi.fn(function connect(this: object) { return this }),
    }))

    class MockAudioContext {
      currentTime = 0
      state: AudioContextState = 'running'
      destination = {}
      resume = vi.fn(async () => undefined)
      close = vi.fn(async () => undefined)
      createOscillator = createOscillator
      createGain = createGain
      createBiquadFilter = createBiquadFilter
      createDynamicsCompressor = createDynamicsCompressor
    }

    Object.defineProperty(window, 'AudioContext', { configurable: true, writable: true, value: MockAudioContext as unknown as typeof AudioContext })

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Spela C4, mitt-C' }))

    expect(createOscillator).toHaveBeenCalledTimes(3)
    expect(createGain).toHaveBeenCalledTimes(5)
    expect(createBiquadFilter).toHaveBeenCalledTimes(1)
    expect(createDynamicsCompressor).toHaveBeenCalledTimes(1)
  })

  it('resumes a suspended audio context before creating the note graph', async () => {
    const user = userEvent.setup()
    const steps: string[] = []
    const createOscillator = vi.fn(() => {
      steps.push('createOscillator')
      return {
        type: 'sine',
        frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        detune: { value: 0 },
        connect: vi.fn(function connect(this: object) { return this }),
        start: vi.fn(),
        stop: vi.fn(),
      }
    })
    const createGain = vi.fn(() => ({
      gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(function connect(this: object) { return this }),
    }))
    const createBiquadFilter = vi.fn(() => ({
      type: 'lowpass',
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      Q: { value: 0 },
      connect: vi.fn(function connect(this: object) { return this }),
    }))
    const createDynamicsCompressor = vi.fn(() => ({
      threshold: { value: 0 },
      knee: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 },
      connect: vi.fn(function connect(this: object) { return this }),
    }))
    const resume = vi.fn(async () => {
      steps.push('resume:start')
      await Promise.resolve()
      steps.push('resume:end')
    })

    class MockAudioContext {
      currentTime = 0
      state: AudioContextState = 'suspended'
      destination = {}
      resume = resume
      close = vi.fn(async () => undefined)
      createOscillator = createOscillator
      createGain = createGain
      createBiquadFilter = createBiquadFilter
      createDynamicsCompressor = createDynamicsCompressor
    }

    Object.defineProperty(window, 'AudioContext', { configurable: true, writable: true, value: MockAudioContext as unknown as typeof AudioContext })

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Spela C4, mitt-C' }))

    expect(resume).toHaveBeenCalledTimes(1)
    expect(steps.indexOf('resume:end')).toBeLessThan(steps.indexOf('createOscillator'))
  })

  it('offers microphone-guided practice with a browser support fallback', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /spela med mikrofon/i }))
    expect(screen.getByRole('heading', { level: 1, name: /lyssna på ditt riktiga piano/i })).toBeInTheDocument()
    expect(screen.getByText('Starta mikrofonen och spela tonen nära enheten.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Starta mikrofon' }))
    expect(screen.getAllByText('Den här webbläsaren saknar mikrofonstöd för notigenkänning.')).toHaveLength(2)
  })

  it('offers a Twinkle Twinkle song mode with the melody notes in order', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Låtar' }))
    await user.click(screen.getByRole('button', { name: 'Blinka lilla stjärna' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Spela Blinka lilla stjärna' })).toBeInTheDocument()
    expect(screen.getByText('BLINKA LILLA STJÄRNA · NOT 1 AV 42')).toBeInTheDocument()
    expect(screen.getByText('Spela nästa ton: C4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Starta mikrofon' })).toBeInTheDocument()
    expect(screen.getByLabelText('Spela Blinka lilla stjärna').querySelectorAll('.song-sequence .current')).toHaveLength(1)
  })

  it('offers the requested Spanien song and the opening of Für Elise', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Låtar' }))
    await user.click(screen.getByRole('button', { name: 'Spanien är ett land där man dansar tango' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Spela Spanien är ett land där man dansar tango' })).toBeInTheDocument()
    expect(screen.getByText('SPANIEN ÄR ETT LAND DÄR MAN DANSAR TANGO · NOT 1 AV 11')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Låtar' }))
    await user.click(screen.getByRole('button', { name: 'Für Elise (första delen)' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Spela Für Elise (första delen)' })).toBeInTheDocument()
    expect(screen.getByText('FÜR ELISE (FÖRSTA DELEN) · NOT 1 AV 9')).toBeInTheDocument()
    expect(screen.getByText('Spela nästa ton: E4')).toBeInTheDocument()
  })

  it('shows a helpful message when microphone permission is denied', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('AudioContext', class {})
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')),
      },
    })

    render(<App />)
    await user.click(screen.getByRole('button', { name: /spela med mikrofon/i }))
    await user.click(screen.getByRole('button', { name: 'Starta mikrofon' }))

    await waitFor(() => {
      expect(screen.getAllByText('Mikrofonbehörighet nekades. Tillåt mikrofonen och försök igen.')).toHaveLength(2)
    })
    expect(screen.queryByText('Ingen stabil ton ännu')).not.toBeInTheDocument()
  })

  it('shows the listening state after microphone access starts', async () => {
    const user = userEvent.setup()
    const releaseWakeLock = vi.fn().mockResolvedValue(undefined)
    const requestWakeLock = vi.fn().mockResolvedValue({ release: releaseWakeLock })
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: requestWakeLock },
    })
    stubMicrophone()

    render(<App />)
    await user.click(screen.getByRole('button', { name: /spela med mikrofon/i }))
    await user.click(screen.getByRole('button', { name: 'Starta mikrofon' }))

    await waitFor(() => {
      expect(screen.getByText('Mikrofonen lyssnar. Spela tonen på ditt piano.')).toBeInTheDocument()
    })
    expect(requestWakeLock).toHaveBeenCalledWith('screen')
    expect(screen.getByRole('button', { name: 'Stoppa mikrofon' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Stoppa mikrofon' }))
    expect(releaseWakeLock).toHaveBeenCalledTimes(1)
  })

  it('starts microphone practice automatically when permission is already granted', async () => {
    const user = userEvent.setup()
    const { getUserMedia } = stubMicrophone()
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn().mockResolvedValue({ state: 'granted' }) },
    })

    render(<App />)
    await user.click(screen.getByRole('button', { name: /spela med mikrofon/i }))

    await waitFor(() => {
      expect(screen.getByText('Mikrofonen lyssnar. Spela tonen på ditt piano.')).toBeInTheDocument()
    })
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Stoppa mikrofon' })).toBeInTheDocument()
  })

  it('advances through microphone practice and finishes after the last correct pitch', async () => {
    vi.useFakeTimers()

    let currentFrequency = 261.63
    const { runFrames, trackStop } = stubMicrophone({ frequency: () => currentFrequency, driveFrames: true })

    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /spela med mikrofon/i }))
      await Promise.resolve()
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Starta mikrofon' }))
      await Promise.resolve()
    })

    const frequencies = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25]
    const expectedTargets = ['Spela D4 på ditt riktiga piano', 'Spela E4 på ditt riktiga piano', 'Spela F4 på ditt riktiga piano', 'Spela G4 på ditt riktiga piano', 'Spela A4 på ditt riktiga piano', 'Spela B4 på ditt riktiga piano', 'Spela C5 på ditt riktiga piano']

    for (let i = 0; i < frequencies.length; i += 1) {
      currentFrequency = frequencies[i]
      await act(async () => {
        runFrames(3)
        await vi.advanceTimersByTimeAsync(700)
        runFrames(1)
      })
      if (i < expectedTargets.length) {
        expect(screen.getByText(expectedTargets[i])).toBeInTheDocument()
      }
    }
    expect(screen.getByText('🎉 Du klarade hela mikrofonövningen!')).toBeInTheDocument()
    expect(trackStop).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Stoppa mikrofon' })).not.toBeInTheDocument()
  }, 10000)

  it('plays the whole Für Elise song, including the low B3 and A3 notes', async () => {
    vi.useFakeTimers()

    let currentFrequency = 329.63
    const { runFrames } = stubMicrophone({ frequency: () => currentFrequency, driveFrames: true })
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn().mockResolvedValue({ state: 'denied' }) },
    })

    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Låtar' }))
      await Promise.resolve()
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Für Elise (första delen)' }))
      await Promise.resolve()
    })

    const chips = [...screen.getByLabelText('Spela Für Elise (första delen)').querySelectorAll('.song-sequence span')]
    expect(chips.map((chip) => chip.textContent)).toEqual(['E', 'D#', 'E', 'D#', 'E', 'B', 'D', 'C', 'A'])

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Starta mikrofon' }))
      await Promise.resolve()
    })

    const frequencies = [329.63, 311.13, 329.63, 311.13, 329.63, 246.94, 293.66, 261.63, 220]
    const nextTargets = ['D#4', 'E4', 'D#4', 'E4', 'B3', 'D4', 'C4', 'A3']

    for (let i = 0; i < frequencies.length; i += 1) {
      currentFrequency = frequencies[i]
      await act(async () => {
        runFrames(3)
        await vi.advanceTimersByTimeAsync(700)
        runFrames(1)
      })
      if (i < nextTargets.length) {
        expect(screen.getByText(`Spela nästa ton: ${nextTargets[i]}`)).toBeInTheDocument()
      }
    }

    expect(screen.getByText('🎉 Du spelade hela Für Elise (första delen)!')).toBeInTheDocument()
  }, 10000)
})
