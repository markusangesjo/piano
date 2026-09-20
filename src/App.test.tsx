import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('Note Nest lesson', () => {
  it('shows the note alphabet and piano keys', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /meet your note friends/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play C' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose note G' })).toBeInTheDocument()
  })
  it('moves to the quiz and gives feedback for an answer', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /ready for a quiz/i }))
    expect(screen.getByRole('heading', { name: /which note is this/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Play A' }))
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
