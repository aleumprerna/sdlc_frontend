import { getApi, getByIdApi, postApi, updateApi, PROJECTS_ENDPOINT } from '../utils';

const PAGE_SIZE = 100;

export async function listProjects(options = {}) {
  const projects = [];
  let page;
  do {
    page = await getApi(PROJECTS_ENDPOINT, {
      ...options,
      params: { limit: PAGE_SIZE, offset: projects.length },
    });
    if (!Array.isArray(page)) {
      throw new Error('The API returned an invalid project list.');
    }
    projects.push(...page);
  } while (page.length === PAGE_SIZE);
  return projects;
}

export function createProject(data) {
  return postApi(PROJECTS_ENDPOINT, { ...data, status: 'discovery' });
}

export function getProject(projectId, options) {
  return getByIdApi(PROJECTS_ENDPOINT, projectId, options);
}

export function updateProjectStatus(projectId, status) {
  return updateApi(`${PROJECTS_ENDPOINT}/${encodeURIComponent(projectId)}/status`, { status });
}

function documentUploadsEndpoint(projectId) {
  return `${PROJECTS_ENDPOINT}/${encodeURIComponent(projectId)}/document-uploads`;
}

export async function listProjectDocumentUploads(projectId, { signal } = {}) {
  const uploads = [];
  let page;
  do {
    page = await getApi(documentUploadsEndpoint(projectId), {
      signal,
      params: { limit: PAGE_SIZE, offset: uploads.length },
    });
    if (!Array.isArray(page)) {
      throw new Error('The API returned an invalid upload list.');
    }
    uploads.push(...page);
  } while (page.length === PAGE_SIZE);
  return uploads;
}

export function uploadProjectDocument(projectId, file, { docId, ...options } = {}) {
  const data = new FormData();
  data.append('file', file);
  data.append('title', file.name);
  if (docId) data.append('doc_id', docId);
  return postApi(documentUploadsEndpoint(projectId), data, options);
}

export function getProjectDocumentOriginal(projectId, upload, options) {
  const versionPath = `document-indexes/${encodeURIComponent(upload.id)}/versions/${encodeURIComponent(upload.version_id)}`;
  const endpoint = `${PROJECTS_ENDPOINT}/${encodeURIComponent(projectId)}/${versionPath}/original`;
  return getApi(endpoint, { ...options, responseType: 'blob', headers: { accept: 'application/octet-stream, application/pdf' } });
}
