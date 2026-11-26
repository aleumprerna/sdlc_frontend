import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProject, getProjectDocumentOriginal, listProjectDocumentUploads, updateProjectStatus, uploadProjectDocument } from '../api/backend/projects';
import { formatApiError } from '../api/utils';
import DocumentActions from './DocumentActions';
import Header from './Header';
import { projectStatusLabels } from './ProjectStatus';
import './ProjectDetails.css';

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
const acceptedFiles = '.pdf,.docx,.xlsx,.pptx,.txt,.md';

function saveOriginal(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function ProjectDocuments({ projectId }) {
  const [uploads, setUploads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [uploadingFile, setUploadingFile] = useState('');
  const [uploadErrors, setUploadErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [readingOriginal, setReadingOriginal] = useState(false);
  const [originalError, setOriginalError] = useState('');
  const [preview, setPreview] = useState(null);
  const fileInput = useRef(null);
  const versionInput = useRef(null);
  const versionDocumentId = useRef(null);
  const previewDialog = useRef(null);
  const listRequest = useRef(null);
  const uploadRequest = useRef(null);
  const originalRequest = useRef(null);

  const loadUploads = useCallback(async () => {
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    setIsLoading(true);
    setListError('');
    try {
      const result = await listProjectDocumentUploads(projectId, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setUploads((current) => {
        // The list omits processing state. Keep it if the upload returned it for this version.
        const states = new Map(current.map((upload) => [upload.version_id, upload.state]));
        return result.map((upload) => ({ ...upload, state: upload.state ?? states.get(upload.version_id) }));
      });
    } catch (error) {
      if (!controller.signal.aborted) setListError(formatApiError(error));
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadUploads();
    return () => {
      listRequest.current?.abort();
      uploadRequest.current?.abort();
      originalRequest.current?.abort();
    };
  }, [loadUploads]);

  useEffect(() => {
    if (!preview) return;
    previewDialog.current.showModal();
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  async function readOriginal(upload, openPdf) {
    if (originalRequest.current) return;
    const controller = new AbortController();
    originalRequest.current = controller;
    setReadingOriginal(true);
    setOriginalError('');
    try {
      const blob = await getProjectDocumentOriginal(projectId, upload, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const title = upload.title || 'Untitled document';
      if (openPdf) {
        setPreview({ title, url: URL.createObjectURL(blob) });
      } else {
        const extension = `.${upload.file_type}`;
        const filename = title.toLowerCase().endsWith(extension) ? title : `${title}${extension}`;
        saveOriginal(blob, filename);
      }
    } catch (error) {
      if (!controller.signal.aborted) setOriginalError(formatApiError(error));
    } finally {
      originalRequest.current = null;
      if (!controller.signal.aborted) setReadingOriginal(false);
    }
  }

  async function uploadFiles(files, docId) {
    if (!files.length || uploadRequest.current) return;
    const controller = new AbortController();
    uploadRequest.current = controller;
    setUploadErrors([]);
    try {
      for (const file of files) {
        if (controller.signal.aborted) return;
        setUploadingFile(file.name);
        try {
          const upload = await uploadProjectDocument(projectId, file, { docId, signal: controller.signal });
          if (!controller.signal.aborted) {
            listRequest.current?.abort();
            setUploads((current) => [upload, ...current.filter((item) => item.doc_id !== upload.doc_id)]);
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            setUploadErrors((current) => [...current, { name: file.name, message: formatApiError(error) }]);
          }
        }
      }
    } finally {
      uploadRequest.current = null;
      if (!controller.signal.aborted) {
        setUploadingFile('');
        loadUploads();
      }
    }
  }

  const rows = uploads.map((upload) => ({
    upload,
    id: upload.doc_id,
    title: upload.title || 'Untitled document',
    source: upload.source || 'uploaded',
    date: upload.created_at,
    status: upload.state === 'indexed' ? 'ready' : upload.state,
    version: `v${upload.version_no}`,
  }));

  return (
    <section aria-label="Documents">
      <input ref={versionInput} type="file" aria-label="New document version" accept={acceptedFiles} hidden
        onChange={(event) => {
          const file = event.currentTarget.files[0];
          const docId = versionDocumentId.current;
          event.currentTarget.value = '';
          if (file && docId) uploadFiles([file], docId);
        }} />
      <div className={`project-dropzone${isDragging ? ' project-dropzone-active' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!uploadRequest.current) setIsDragging(true);
        }}
        onDragLeave={(event) => {
          if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
            setIsDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          uploadFiles(Array.from(event.dataTransfer.files));
        }}>
        <input ref={fileInput} type="file" aria-label="Project document files" accept={acceptedFiles} multiple hidden
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files);
            event.currentTarget.value = '';
            uploadFiles(files);
          }} />
        <p><strong>Drop files here</strong> or <button type="button" className="project-browse" aria-describedby="project-file-types" disabled={Boolean(uploadingFile)}
          onClick={() => fileInput.current.click()}>browse</button></p>
        <p id="project-file-types">PDF, Word, Excel, PowerPoint, text, or Markdown</p>
        {uploadingFile && <p role="status">Uploading {uploadingFile}…</p>}
      </div>
      {readingOriginal && <p role="status">Retrieving original…</p>}
      {originalError && <p className="project-details-error" role="alert">Unable to retrieve the original. {originalError}</p>}
      {uploadErrors.length > 0 && (
        <ul className="project-details-error" role="alert">
          {uploadErrors.map(({ name, message }, index) => <li key={`${name}-${index}`}>{name} — {message}</li>)}
        </ul>
      )}
      {listError && (
        <div className="project-details-error" role="alert">
          <p>Unable to load uploads. {listError}</p>
          <button type="button" className="cancel-project-button" onClick={loadUploads}>Retry</button>
        </div>
      )}
      {isLoading && <p role="status">Loading uploads…</p>}
      {(rows.length > 0 || (!isLoading && !listError)) && (
        <div className="project-document-summary">
          <p aria-live="polite">{rows.length} {rows.length === 1 ? 'document' : 'documents'}</p>
        </div>
      )}
      {rows.length > 0 && (
        <div className="project-document-table">
          <table aria-label="Project documents">
            <thead><tr><th scope="col">Name</th><th scope="col">Source</th><th scope="col">Date</th><th scope="col">Status</th><th scope="col">Version</th><th scope="col" aria-label="Actions" /></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.title}</th>
                  <td>{row.source.replace(/_/g, ' ')}</td>
                  <td><time dateTime={row.date}>{dateFormat.format(new Date(row.date))}</time></td>
                  <td>{row.status ? <span className={`document-status document-status-${row.status}`}>{row.status.replace(/_/g, ' ')}</span> : '—'}</td>
                  <td>{row.version}</td>
                  <td className="document-actions-cell">
                    <DocumentActions title={row.title} isPdf={row.upload.file_type === 'pdf'}
                      reading={readingOriginal} uploading={Boolean(uploadingFile)}
                      onOpen={() => readOriginal(row.upload, true)}
                      onDownload={() => readOriginal(row.upload, false)}
                      onNewVersion={() => {
                        versionDocumentId.current = row.id;
                        versionInput.current.click();
                      }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!rows.length && !isLoading && !listError && <p className="project-documents-empty">No documents to display.</p>}
      <dialog ref={previewDialog} className="document-preview" aria-label="Original PDF" onClose={() => setPreview(null)}>
        {preview && <>
          <div className="document-preview-header">
            <h3>{preview.title}</h3>
            <button type="button" className="cancel-project-button" onClick={() => previewDialog.current.close()}>Close</button>
          </div>
          <iframe title={preview.title} src={preview.url} />
        </>}
      </dialog>
    </section>
  );
}

function ProjectPage({ projectId }) {
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [statusError, setStatusError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    getProject(projectId, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setProject(result);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(formatApiError(requestError));
      });
    return () => controller.abort();
  }, [projectId, attempt]);

  async function changeStatus(event) {
    const status = event.target.value;
    if (pendingStatus !== null || status === project.status) return;

    setPendingStatus(status);
    setStatusError('');
    try {
      const updatedProject = await updateProjectStatus(projectId, status);
      setProject(updatedProject);
    } catch (requestError) {
      setStatusError(formatApiError(requestError));
    } finally {
      setPendingStatus(null);
    }
  }

  return (
    <div className="project-details-page">
      <Header />
      <main className="project-details-content">
        <Link className="project-back-link" to="/home">← Projects</Link>
        {!project && !error && <p role="status">Loading project…</p>}
        {error && (
          <div className="project-details-error" role="alert">
            <p>{error}</p>
            <button type="button" className="cancel-project-button" onClick={() => setAttempt((value) => value + 1)}>Retry</button>
          </div>
        )}
        {project && (
          <>
            <div className="project-details-heading">
              <div>
                <h1>{project.name}</h1>
                {(project.client_name || project.start_date) && (
                  <p>{[
                    project.client_name,
                    project.start_date && `Started ${dateFormat.format(new Date(project.start_date))}`,
                  ].filter(Boolean).join(' · ')}</p>
                )}
              </div>
              <div className="project-status-control">
                <select
                  className="project-status-select"
                  aria-label="Project status"
                  aria-describedby={statusError ? 'project-status-error' : undefined}
                  value={pendingStatus ?? project.status}
                  disabled={pendingStatus !== null}
                  onChange={changeStatus}
                >
                  {Object.entries(projectStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {pendingStatus !== null && <span role="status">Saving status…</span>}
              </div>
            </div>
            {statusError && (
              <p id="project-status-error" className="project-details-error" role="alert">
                Unable to update project status. {statusError}
              </p>
            )}
            <div className="project-details-section-title"><h2>Documents</h2></div>
            <ProjectDocuments projectId={projectId} />
          </>
        )}
      </main>
    </div>
  );
}

export default function ProjectDetails() {
  const { projectId } = useParams();
  return <ProjectPage key={projectId} projectId={projectId} />;
}
