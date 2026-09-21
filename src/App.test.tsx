import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App, { BLACK_KEYS, PITCHES, PITCH_INFO, resetAudioState } from './App'
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

  it('defaults to Swedish and shows the note alphabet and piano keys', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /möt dina tonvänner/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Spela C4, mitt-C' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Välj tonen G4' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Språk' })).toBeInTheDocument()
    expect(screen.getByText('Version v0.1.0')).toBeInTheDocument()
  })

  it('switches to English and persists the selection', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Byt språk till English' }))
    expect(screen.getByRole('heading', { name: /meet your pitch friends/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play C4, middle C' })).toBeInTheDocument()
    expect(window.localStorage.getItem('note-nest-language')).toBe('en')
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
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
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
          getFloatTimeDomainData: vi.fn(),
        }
      }
      createMediaStreamSource() {
        return { connect: vi.fn() }
      }
      close() {
        return Promise.resolve()
      }
    })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    })

    render(<App />)
    await user.click(screen.getByRole('button', { name: /spela med mikrofon/i }))
    await user.click(screen.getByRole('button', { name: 'Starta mikrofon' }))

    await waitFor(() => {
      expect(screen.getByText('Mikrofonen lyssnar. Spela tonen på ditt piano.')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Stoppa mikrofon' })).toBeInTheDocument()
  })

  it('advances through microphone practice and finishes after the last correct pitch', async () => {
    vi.useFakeTimers()

    let currentFrequency = 261.63
    const trackStop = vi.fn()
    let rafCallback: FrameRequestCallback | null = null

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallback = callback
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
            for (let i = 0; i < data.length; i += 1) data[i] = Math.sin((2 * Math.PI * currentFrequency * i) / 44100) * 0.4
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
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: trackStop }],
        }),
      },
    })

    const runFrames = (count: number) => {
      for (let i = 0; i < count; i += 1) {
        const callback = rafCallback
        if (!callback) break
        rafCallback = null
        callback(0)
      }
    }

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
})
