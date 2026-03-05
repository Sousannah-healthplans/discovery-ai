import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { adminFetchUsers } from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';

export default function AdminClients() {
  const [rows, setRows] = useState([])
  const baseUrl = BACKEND_URL
  const token = localStorage.getItem('authToken') || ''
  
  useEffect(() => {
    if (!baseUrl || !token) return
    adminFetchUsers(baseUrl, token).then(users => {
      setRows(users.map(u => ({ 
        id: u.userId, 
        name: `Extension User ${u.userId?.slice(0, 12)}`, 
        domain: 'browser-extension', 
        events: u.events || 0,
        firstSeen: u.firstTs ? new Date(u.firstTs).toLocaleDateString() : 'Unknown',
        lastSeen: u.lastTs ? new Date(u.lastTs).toLocaleDateString() : 'Unknown'
      })))
    }).catch(()=>{})
  }, [baseUrl, token])
  
  const columns = [
    { key: 'name', header: 'Extension User' },
    { key: 'domain', header: 'Type' },
    { key: 'events', header: 'Events' },
    { key: 'firstSeen', header: 'First Seen' },
    { key: 'lastSeen', header: 'Last Seen' },
    { key: 'id', header: 'Details', render: (v)=> <Link className="text-cyan-300" to={`/admin/clients/${v}`}>Open</Link> },
  ];
  
  return (
    <DashboardLayout variant="admin">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Extension Users</h2>
        <p className="text-slate-600 dark:text-slate-400">
          All users who have installed and registered the Discovery AI extension
        </p>
      </div>
      <DataTable rows={rows} columns={columns} searchKeys={["name","domain"]} />
    </DashboardLayout>
  );
}


