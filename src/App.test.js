import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test.each(['/', '/login', '/unknown-page'])(
  'opens the login page from %s',
  (path) => {
    window.history.replaceState({}, '', path);
    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'AI for SDLC' })
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  }
);

test('explains that Microsoft authentication needs configuration', () => {
  window.history.replaceState({}, '', '/login');
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Sign in with Microsoft' }));

  expect(screen.getByRole('status')).toHaveTextContent(
    'Microsoft sign-in is not configured yet.'
  );
});
