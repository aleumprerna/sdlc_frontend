import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createProject, listProjects } from '../api/backend/projects';
import { formatApiError } from '../api/utils';
import Header from './Header';
import ProjectStatus from './ProjectStatus';
import './Home.css';

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function Home() {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const projectDialog = useRef(null);
  const listRequest = useRef(null);
  const creating = useRef(false);
  const visibleProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const loadProjects = useCallback(async () => {
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    setIsLoading(true);
    setListError('');
    try {
      const result = await listProjects({ signal: controller.signal });
      if (!controller.signal.aborted) setProjects(result);
    } catch (error) {
      if (!controller.signal.aborted) setListError(formatApiError(error));
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
    return () => listRequest.current?.abort();
  }, [loadProjects]);

  function closeDialog() {
    if (!creating.current) projectDialog.current.close();
  }

  async function handleCreateProject(event) {
    event.preventDefault();
    if (creating.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = data.get('projectName').trim();
    if (!name) {
      setCreateError('Enter a project name.');
      return;
    }

    creating.current = true;
    setIsCreating(true);
    setCreateError('');
    try {
      const project = await createProject({
        name,
        start_date: data.get('startDate'),
        client_name: data.get('client').trim() || null,
        description: data.get('description').trim() || null,
        project_context: data.get('projectContext').trim() || null,
      });
      setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
      setSearch('');
      form.reset();
      projectDialog.current.close();
      loadProjects();
    } catch (error) {
      setCreateError(formatApiError(error));
    } finally {
      creating.current = false;
      setIsCreating(false);
    }
  }

  return (
    <div className="home-page">
      <Header />
      <main className="home-content" aria-labelledby="projects-title">
        <div className="projects-toolbar">
          <h1 id="projects-title">Projects</h1>
          <div className="projects-actions">
            <input
              className="project-search"
              type="search"
              aria-label="Search by project name"
              placeholder="Search by project name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button className="new-project-button" type="button" onClick={() => {
              setCreateError('');
              projectDialog.current.showModal();
            }}>
              + New project
            </button>
          </div>
        </div>

        {listError && (
          <div className="projects-error" role="alert">
            <p>{listError}</p>
            <button className="cancel-project-button" type="button" onClick={loadProjects}>Retry</button>
          </div>
        )}
        {isLoading && <p role="status">Loading projects...</p>}
        {visibleProjects.length ? (
          <div className="projects-grid" aria-busy={isLoading}>
            {visibleProjects.map((project) => (
              <article className="project-card" key={project.id}>
                <h2><Link to={`/projects/${encodeURIComponent(project.id)}`}>{project.name}</Link></h2>
                <ProjectStatus status={project.status} />
              </article>
            ))}
          </div>
        ) : !isLoading && !listError && (
          <div className="projects-empty" role="status">
            <h2>{!search.trim() ? 'No projects yet' : 'No projects found'}</h2>
            <p>{!search.trim() ? 'Create a new project to get started.' : 'Try searching for another project name.'}</p>
          </div>
        )}
      </main>

      <dialog className="new-project-dialog" ref={projectDialog} aria-labelledby="new-project-title"
        onCancel={(event) => { if (creating.current) event.preventDefault(); }}>
        <form onSubmit={handleCreateProject} aria-busy={isCreating}>
          <div className="new-project-dialog-header">
            <h2 id="new-project-title">New project</h2>
            <button className="cancel-project-button" type="button" onClick={closeDialog} disabled={isCreating}>Close</button>
          </div>
          <fieldset className="new-project-fields" disabled={isCreating}>
            <label htmlFor="project-name">Project name</label>
            <p id="project-name-hint">Required</p>
            <input id="project-name" name="projectName" placeholder="For example: Northwind ITSM Implementation" aria-describedby="project-name-hint" required autoFocus />

            <label htmlFor="project-start-date">Start date</label>
            <p id="project-date-hint">Required</p>
            <input id="project-start-date" name="startDate" type="date" defaultValue={today()} aria-describedby="project-date-hint" required />

            <label htmlFor="project-client">Client</label>
            <p id="project-client-hint">Optional</p>
            <input id="project-client" name="client" aria-describedby="project-client-hint" />

            <label htmlFor="project-description">Description</label>
            <p id="project-description-hint">Optional. Short text for people.</p>
            <textarea id="project-description" name="description" rows={2} aria-describedby="project-description-hint" />

            <label htmlFor="project-context">Project context</label>
            <p id="project-context-hint">Optional. Only the AI reads this. Progress so far, special notes, hints.</p>
            <textarea id="project-context" name="projectContext" rows={3} placeholder="For example: SOW signed. Kick-off done. Client IT lead not named yet." aria-describedby="project-context-hint" />
          </fieldset>
          {createError && <p className="project-create-error" role="alert">{createError}</p>}
          <div className="new-project-dialog-actions">
            <button className="cancel-project-button" type="button" onClick={closeDialog} disabled={isCreating}>Cancel</button>
            <button className="new-project-button" type="submit" disabled={isCreating}>{isCreating ? 'Creating...' : 'Create project'}</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

export default Home;
