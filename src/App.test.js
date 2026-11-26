import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { getCurrentUser, login } from './api/backend/auth';
import { BASE_URL } from './api/utils';

jest.mock('./api/backend/auth', () => ({
  ...jest.requireActual('./api/backend/auth'),
  login: jest.fn(),
  getCurrentUser: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  getCurrentUser.mockResolvedValue(null);
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
  expect(await screen.findByRole('heading', { name: 'Projects' })).toBeInTheDocument();
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

  expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
});

test('shows the signed-in profile and clears access when logging out', async () => {
  const originalFetch = global.fetch;
  const user = { name: 'Jordan Rivera', email: 'jordan.rivera@example.com' };
  getCurrentUser.mockImplementationOnce(jest.requireActual('./api/backend/auth').getCurrentUser);
  global.fetch = jest.fn((url) => {
    if (url.endsWith('/auth/logout')) return Promise.reject(new TypeError('Failed to fetch'));
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify(url.endsWith('/auth/me') ? { user } : []),
    });
  });

  try {
    localStorage.setItem('access_token', 'demo-token');
    window.history.replaceState({}, '', '/home');
    const { unmount } = render(<App />);

    const avatar = screen.getByRole('button', { name: 'Account menu' });
    await waitFor(() => expect(avatar).toHaveTextContent('JR'));
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/auth/me`, expect.objectContaining({
      method: 'GET', headers: expect.objectContaining({ authorization: 'Bearer demo-token' }),
    }));
    fireEvent.click(avatar);
    const logoutButton = screen.getByRole('button', { name: 'Log out' });
    expect(screen.getByText(user.name)).toBeVisible();
    expect(screen.getByText(user.email)).toBeVisible();
    fireEvent.keyDown(logoutButton, { key: 'Escape' });
    expect(avatar).toHaveFocus();
    expect(avatar).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(avatar);
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/auth/logout`, expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ authorization: 'Bearer demo-token' }),
    }));
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(await screen.findByRole('button', { name: 'Sign in with Microsoft' })).toBeInTheDocument();

    unmount();
    window.history.replaceState({}, '', '/home');
    render(<App />);
    expect(window.location.pathname).toBe('/login');
  } finally {
    global.fetch = originalFetch;
  }
});

test('loads saved uploads and refreshes the list after posting a file with its filename as the title', async () => {
  const originalFetch = global.fetch;
  const project = { id: 'project-123', name: 'Northwind rollout', status: 'discovery', start_date: '2026-10-20' };
  const file = new File(['Project notes'], 'Workshop notes.txt', { type: 'text/plain' });
  const savedUpload = {
    doc_id: 'saved-1', version_id: 'saved-v2', title: 'Saved notes.txt', source: 'uploaded', created_at: '2026-10-19T10:00:00Z', version_no: 2,
  };
  const newUpload = {
    doc_id: 'uploaded-1', version_id: 'uploaded-v1', title: file.name, source: 'uploaded', created_at: '2026-10-20T10:00:00Z', version_no: 1,
  };
  const versionFile = new File(['Updated notes'], 'Revised notes.txt', { type: 'text/plain' });
  const nextVersion = { ...newUpload, version_id: 'uploaded-v2', title: versionFile.name, version_no: 2 };
  const response = (data, status = 200) => ({
    ok: true,
    status,
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify(data),
  });
  global.fetch = jest.fn()
    .mockResolvedValueOnce(response([project]))
    .mockResolvedValueOnce(response(project))
    .mockResolvedValueOnce(response([savedUpload]))
    .mockResolvedValueOnce(response({ ...newUpload, state: 'indexed' }, 201))
    .mockResolvedValueOnce(response([newUpload, savedUpload]))
    .mockResolvedValueOnce(response({ ...nextVersion, state: 'indexed' }, 201))
    .mockResolvedValueOnce(response([nextVersion, savedUpload]));

  try {
    localStorage.setItem('access_token', 'demo-token');
    window.history.replaceState({}, '', '/home');
    render(<App />);
    fireEvent.click(await screen.findByRole('link', { name: project.name }));

    expect(await screen.findByRole('heading', { name: project.name })).toBeInTheDocument();
    expect(window.location.pathname).toBe(`/projects/${project.id}`);
    const endpoint = `${BASE_URL}/api/v1/projects/${project.id}`;
    expect(fetch).toHaveBeenCalledWith(endpoint, expect.objectContaining({
      method: 'GET', headers: expect.objectContaining({ authorization: 'Bearer demo-token' }),
    }));
    expect(await screen.findByRole('rowheader', { name: savedUpload.title })).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    const listUrl = `${endpoint}/document-uploads?limit=100&offset=0`;
    const listRequest = expect.objectContaining({
      method: 'GET', headers: expect.objectContaining({ authorization: 'Bearer demo-token' }),
    });
    expect(fetch).toHaveBeenNthCalledWith(3, listUrl, listRequest);

    const input = screen.getByLabelText('Project document files');
    const openPicker = jest.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Browse files' }));
    expect(openPicker).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByRole('rowheader', { name: file.name })).toBeInTheDocument();
    const [url, request] = fetch.mock.calls[3];
    expect(url).toBe(`${endpoint}/document-uploads`);
    expect(request.method).toBe('POST');
    expect(request.headers.authorization).toBe('Bearer demo-token');
    expect(request.headers['content-type']).toBeUndefined();
    expect(request.body.get('file')).toBe(file);
    expect(request.body.get('title')).toBe(file.name);
    expect(request.body.has('doc_id')).toBe(false);
    await waitFor(() => expect(fetch).toHaveBeenNthCalledWith(5, listUrl, listRequest));
    expect(screen.getAllByRole('rowheader', { name: file.name })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: `Actions for ${file.name}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Upload new version' }));
    fireEvent.change(screen.getByLabelText('New document version'), { target: { files: [versionFile] } });
    expect(await screen.findByRole('rowheader', { name: versionFile.name })).toBeInTheDocument();
    expect(screen.queryByRole('rowheader', { name: file.name })).not.toBeInTheDocument();
    const [versionUrl, versionRequest] = fetch.mock.calls[5];
    expect(versionUrl).toBe(`${endpoint}/document-uploads`);
    expect(versionRequest.method).toBe('POST');
    expect(versionRequest.body.get('file')).toBe(versionFile);
    expect(versionRequest.body.get('title')).toBe(versionFile.name);
    expect(versionRequest.body.get('doc_id')).toBe(newUpload.doc_id);
  } finally {
    global.fetch = originalFetch;
  }
});

test('saves a selected status with PUT and restores the saved status if a later update fails', async () => {
  const originalFetch = global.fetch;
  const project = { id: 'project-123', name: 'Northwind rollout', status: 'discovery' };
  const response = (data, status = 200) => ({
    ok: status < 400,
    status,
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify(data),
  });
  let confirmStatus;
  global.fetch = jest.fn()
    .mockResolvedValueOnce(response(project))
    .mockResolvedValueOnce(response([]))
    .mockImplementationOnce(() => new Promise((resolve) => { confirmStatus = resolve; }))
    .mockResolvedValueOnce(response({ detail: 'Status update rejected' }, 409));

  try {
    localStorage.setItem('access_token', 'demo-token');
    window.history.replaceState({}, '', `/projects/${project.id}`);
    render(<App />);

    const select = await screen.findByRole('combobox', { name: 'Project status' });
    expect(select).toHaveValue('discovery');
    fireEvent.change(select, { target: { value: 'in_review' } });
    expect(select).toBeDisabled();
    expect(fetch).toHaveBeenLastCalledWith(`${BASE_URL}/api/v1/projects/${project.id}/status`, expect.objectContaining({
      method: 'PUT',
      headers: expect.objectContaining({ authorization: 'Bearer demo-token', 'content-type': 'application/json' }),
      body: JSON.stringify({ status: 'in_review' }),
    }));
    confirmStatus(response({ ...project, status: 'in_review' }));
    await waitFor(() => expect(select).toBeEnabled());
    expect(select).toHaveValue('in_review');

    fireEvent.change(select, { target: { value: 'signed_off' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Status update rejected');
    expect(select).toBeEnabled();
    expect(select).toHaveValue('in_review');
  } finally {
    global.fetch = originalFetch;
  }
});
