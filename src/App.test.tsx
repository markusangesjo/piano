import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App, { BLACK_KEYS, PITCHES, PITCH_INFO, resetAudioState } from './App'

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
  })

  it('switches to English and persists the selection', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Byt språk till English' }))
    expect(screen.getByRole('heading', { name: /meet your pitch friends/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play C4, middle C' })).toBeInTheDocument()
    expect(window.localStorage.getItem('note-nest-language')).toBe('en')
  })

  it('moves to the quiz and gives feedback for an answer', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /redo för quiz/i }))
    expect(screen.getByRole('heading', { name: /vilken ton är det här/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Spela A4' }))
    expect(screen.getByRole('status')).toBeInTheDocument()
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
    expect(screen.getAllByRole('button', { name: /^Spela /i })).toHaveLength(PITCHES.length)
  })

  it('does not reveal the quiz answer before selection and highlights feedback afterward', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /redo för quiz/i }))

    const targetKey = screen.getByRole('button', { name: 'Spela E4' })
    expect(targetKey).not.toHaveClass('active')

    await user.click(screen.getByRole('button', { name: 'Spela A4' }))
    expect(screen.getByRole('button', { name: 'Spela E4' })).toHaveClass('active')
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
})
