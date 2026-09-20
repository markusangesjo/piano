import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App, { PITCHES, PITCH_INFO } from './App'

describe('Note Nest lesson', () => {
  beforeEach(() => {
    window.localStorage.clear()
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
})
