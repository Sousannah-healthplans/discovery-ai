export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch (e) {
    return iso;
  }
}

export const roles = {
  ADMIN: 'admin',
  PROJECT_MANAGER: 'project_manager',
  CLIENT: 'client',
};


