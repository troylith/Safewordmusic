import { render, screen } from '@testing-library/react'
import Home from '../pages/index'

describe('Home page', () => {
  it('renders the heading and tagline', () => {
    render(<Home />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to Safewørd')
    expect(screen.getByText('Dark. Clean. Real.')).toBeInTheDocument()
  })

  it('links to Instagram in a new tab', () => {
    render(<Home />)

    const link = screen.getByRole('link', { name: 'Follow on Instagram' })
    expect(link).toHaveAttribute('href', 'https://instagram.com')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders the same markup on repeated renders', () => {
    const { container, unmount } = render(<Home />)
    const first = container.innerHTML
    unmount()

    const { container: second } = render(<Home />)
    expect(second.innerHTML).toBe(first)
  })
})
