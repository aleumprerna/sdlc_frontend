import { login } from './auth';
import { DUMMY_CREDENTIALS, DUMMY_LOGIN_ENDPOINT, getAccessToken, postApi } from '../utils';

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  DUMMY_CREDENTIALS: { username: 'configured-user', password: 'configured-password' },
  postApi: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

test('posts dummy credentials without authentication and saves the returned token', async () => {
  const response = { access_token: 'demo-token', user: { id: 1 } };
  postApi.mockResolvedValueOnce(response);

  await expect(login({ username: 'test-user', password: 'test-password' })).resolves.toBe(response);
  expect(postApi).toHaveBeenCalledWith(DUMMY_LOGIN_ENDPOINT, {
    username: 'test-user', password: 'test-password',
  }, { auth: false });
  expect(getAccessToken()).toBe('demo-token');
});

test('uses the shared dummy credentials when login is called without arguments', async () => {
  postApi.mockResolvedValueOnce({ access_token: 'demo-token' });

  await login();

  expect(postApi).toHaveBeenCalledWith(DUMMY_LOGIN_ENDPOINT, DUMMY_CREDENTIALS, { auth: false });
  expect(getAccessToken()).toBe('demo-token');
});

test('does not store a token when the backend rejects login', async () => {
  postApi.mockRejectedValueOnce(new Error('Invalid credentials'));

  await expect(login({ username: 'test-user', password: 'wrong-password' })).rejects.toThrow('Invalid credentials');
  expect(getAccessToken()).toBeNull();
});

test('rejects a successful response that has no access token', async () => {
  postApi.mockResolvedValueOnce({ user: { id: 1 } });

  await expect(login({ username: 'test-user', password: 'test-password' })).rejects.toThrow('did not include an access token');
  expect(getAccessToken()).toBeNull();
});

test('does not send a request when credentials are missing', async () => {
  await expect(login({})).rejects.toThrow('credentials are missing');
  expect(postApi).not.toHaveBeenCalled();
});
