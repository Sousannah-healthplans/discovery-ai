import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useEffect, useState } from 'react';
import { fetchMySites } from '../lib/api';
import { BACKEND_URL } from '../lib/config';

export default function DashboardLayout({ variant='client', children }) {
  const [sites, setSites] = useState([])
  const baseUrl = BACKEND_URL
  const token = localStorage.getItem('authToken') || ''
  const currentProjectId = localStorage.getItem('projectId') || 'discovery-ai'

  useEffect(() => {
    if (!baseUrl || !token || variant !== 'client') return
    fetchMySites(baseUrl, token).then(list => setSites(list || [])).catch(()=>{})
  }, [baseUrl, token, variant])

  function onChangeProject(e) {
    const pid = e.target.value
    if (pid) localStorage.setItem('projectId', pid)
    else localStorage.removeItem('projectId')
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-gradient-to-b dark:from-cyan-950 dark:via-slate-950 dark:to-black dark:text-white overflow-x-hidden">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex min-w-0">
        <Sidebar variant={variant} />
        <main className="flex-1 px-0 md:px-6 min-w-0">
          {variant === 'client' && sites.length > 0 && (
            <div className="mb-4 flex items-center gap-3">
              <div className="text-sm text-slate-400">Project:</div>
              <select className="rounded-xl border border-white/10 bg-white/5 px-3 py-2" value={currentProjectId} onChange={onChangeProject}>
                {sites.map(s => (
                  <option key={s.projectId} value={s.projectId}>{s.name} • {s.domain}</option>
                ))}
              </select>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}


