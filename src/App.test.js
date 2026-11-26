import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { login } from './api/backend/auth';

jest.mock('./api/backend/auth', () => ({ login: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

test.each(['/', '/login', '/unknown-page', '/home'])(
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

test('opens Home after a successful dummy login', async () => {
  login.mockImplementationOnce(async () => {
    localStorage.setItem('access_token', 'demo-token');
    return { access_token: 'demo-token' };
  });
  window.history.replaceState({}, '', '/login');
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Sign in with Microsoft' }));

  expect(login).toHaveBeenCalledTimes(1);
  expect(await screen.findByRole('heading', { name: 'Hello' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/home');
});

test('shows a login error and allows another attempt', async () => {
  login.mockRejectedValueOnce(new Error('Invalid credentials'));
  window.history.replaceState({}, '', '/login');
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Sign in with Microsoft' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  expect(screen.getByRole('button')).toBeEnabled();
  expect(window.location.pathname).toBe('/login');
});

test('disables the button while login is pending', async () => {
  let rejectLogin;
  login.mockImplementationOnce(() => new Promise((resolve, reject) => {
    rejectLogin = reject;
  }));
  window.history.replaceState({}, '', '/login');
  render(<App />);

  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();

  rejectLogin(new Error('Request failed'));
  await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
});

test('opens Home directly when an access token is saved', () => {
  localStorage.setItem('access_token', 'demo-token');
  window.history.replaceState({}, '', '/home');
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument();
});
