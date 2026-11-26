export const projectStatusLabels = {
  discovery: 'Discovery',
  in_review: 'In Review',
  signed_off: 'Signed-off',
};

export default function ProjectStatus({ status }) {
  return (
    <span className={`project-status project-status-${status.replace(/_/g, '-')}`}>
      {projectStatusLabels[status] || status}
    </span>
  );
}
