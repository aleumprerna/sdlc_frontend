import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import { BASE_URL } from '../api/utils';

jest.mock('../api/backend/auth', () => ({ getCurrentUser: async () => null }));

const originalFetch = global.fetch;
const existingProject = { id: 'existing', name: 'Existing project', status: 'in_review' };

function renderHome() {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Home /></MemoryRouter>);
}

function respond(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify(data),
  };
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});

beforeEach(() => {
  localStorage.setItem('access_token', 'project-token');
  global.fetch = jest.fn().mockResolvedValue(respond([]));
});

afterEach(() => {
  global.fetch = originalFetch;
  localStorage.clear();
});

async function openForm() {
  await screen.findByText('No projects yet');
  fireEvent.click(screen.getByRole('button', { name: '+ New project' }));
  return screen.getByRole('dialog');
}

test('loads backend projects with the access token, maps statuses and filters names', async () => {
  fetch.mockResolvedValueOnce(respond([existingProject]));
  renderHome();
  expect(screen.getByText('Loading projects...')).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Existing project' })).toBeInTheDocument();
  expect(screen.getByText('In Review')).toHaveClass('project-status-in-review');
  expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/projects?limit=100&offset=0`, expect.objectContaining({
    method: 'GET', headers: expect.objectContaining({ authorization: 'Bearer project-token' }),
  }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } });
  expect(screen.getByText('No projects found')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'EXISTING' } });
  expect(screen.getByRole('heading', { name: 'Existing project' })).toBeInTheDocument();
});

test('fetches subsequent pages so the project list is complete', async () => {
  const firstPage = Array.from({ length: 100 }, (_, id) => ({ id: String(id), name: `Project ${id}`, status: 'discovery' }));
  fetch.mockResolvedValueOnce(respond(firstPage)).mockResolvedValueOnce(respond([existingProject]));
  renderHome();
  expect(await screen.findByRole('heading', { name: 'Existing project' })).toBeInTheDocument();
  expect(screen.getAllByRole('article')).toHaveLength(101);
  expect(fetch.mock.calls[1][0]).toBe(`${BASE_URL}/api/v1/projects?limit=100&offset=100`);
});

test('posts all form fields and refreshes the project list after creation', async () => {
  renderHome();
  const dialog = await openForm();
  fireEvent.change(within(dialog).getByLabelText('Project name'), { target: { value: '  New implementation  ' } });
  fireEvent.change(within(dialog).getByLabelText('Start date'), { target: { value: '2026-11-05' } });
  fireEvent.change(within(dialog).getByLabelText('Client'), { target: { value: 'Northwind' } });
  fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: 'Delivery project' } });
  fireEvent.change(within(dialog).getByLabelText('Project context'), { target: { value: 'Kick-off done' } });
  const created = { id: 'new-id', name: 'New implementation', status: 'discovery' };
  let finishCreate;
  fetch.mockImplementationOnce(() => new Promise((resolve) => { finishCreate = resolve; }));
  fetch.mockResolvedValueOnce(respond([created]));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create project' }));
  expect(within(dialog).getByRole('button', { name: 'Creating...' })).toBeDisabled();
  expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
  expect(fetch).toHaveBeenNthCalledWith(2, `${BASE_URL}/api/v1/projects`, expect.objectContaining({
    method: 'POST',
    headers: expect.objectContaining({ authorization: 'Bearer project-token', 'content-type': 'application/json' }),
    body: JSON.stringify({ name: 'New implementation', start_date: '2026-11-05', client_name: 'Northwind', description: 'Delivery project', project_context: 'Kick-off done', status: 'discovery' }),
  }));
  finishCreate(respond(created, 201));
  await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
  expect(await screen.findByRole('heading', { name: 'New implementation' })).toBeInTheDocument();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
});

test('keeps failed form values, displays backend validation and allows retry', async () => {
  renderHome();
  const dialog = await openForm();
  fireEvent.change(within(dialog).getByLabelText('Project name'), { target: { value: 'My project' } });
  fetch.mockResolvedValueOnce(respond({ detail: [{ loc: ['body', 'start_date'], msg: 'Invalid date' }] }, 422));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create project' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('start_date: Invalid date');
  expect(dialog).toHaveAttribute('open');
  expect(within(dialog).getByLabelText('Project name')).toHaveValue('My project');
  expect(within(dialog).getByRole('button', { name: 'Create project' })).toBeEnabled();
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('shows a list failure instead of an empty state and retries', async () => {
  fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  renderHome();
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the backend');
  expect(screen.queryByText('No projects yet')).not.toBeInTheDocument();
  fetch.mockResolvedValueOnce(respond([existingProject]));
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('heading', { name: 'Existing project' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('preserves the created project when refreshing fails and sends null optional fields', async () => {
  renderHome();
  const dialog = await openForm();
  fireEvent.change(within(dialog).getByLabelText('Project name'), { target: { value: 'Saved project' } });
  fetch.mockResolvedValueOnce(respond({ id: 'saved', name: 'Saved project', status: 'discovery' }, 201));
  fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create project' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the backend');
  expect(screen.getByRole('heading', { name: 'Saved project' })).toBeInTheDocument();
  const payload = JSON.parse(fetch.mock.calls[1][1].body);
  expect(payload).toEqual(expect.objectContaining({ client_name: null, description: null, project_context: null }));
  expect(dialog).not.toHaveAttribute('open');
});

test('cancel closes the form without creating a project', async () => {
  renderHome();
  const dialog = await openForm();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(dialog).not.toHaveAttribute('open');
  expect(fetch).toHaveBeenCalledTimes(1);
});
