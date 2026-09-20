import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('Note Nest lesson', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to Swedish and shows the note alphabet and piano keys', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /möt dina tonvänner/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Spela C' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Välj tonen G' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Språk' })).toBeInTheDocument()
  })

  it('switches to English and persists the selection', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Byt språk till English' }))
    expect(screen.getByRole('heading', { name: /meet your note friends/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play C' })).toBeInTheDocument()
    expect(window.localStorage.getItem('note-nest-language')).toBe('en')
  })

  it('moves to the quiz and gives feedback for an answer', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /redo för quiz/i }))
    expect(screen.getByRole('heading', { name: /vilken ton är det här/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Spela A' }))
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
