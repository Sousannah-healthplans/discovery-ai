import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import { useEffect, useState, useCallback } from 'react';
import { createClaim, deleteClaim, listClaims } from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';

export default function ClientClaims() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ claimId: '', amount: '', description: '' })
  const baseUrl = BACKEND_URL
  const projectId = localStorage.getItem('projectId') || 'discovery-ai'
  const token = localStorage.getItem('authToken') || ''

  const refresh = useCallback(() => {
    if (!baseUrl || !token) return
    listClaims(baseUrl, token, projectId).then(items => {
      setRows(items.map(c => ({ id: c._id, claimId: c.claimId, status: c.status, amount: c.amount, description: c.description })))
    }).catch(()=>{})
  }, [baseUrl, token, projectId])

  useEffect(() => { refresh() }, [refresh])

  async function onCreate(e) {
    e.preventDefault()
    if (!form.claimId) return
    await createClaim(baseUrl, token, { ...form, projectId }, undefined, projectId)
    setForm({ claimId: '', amount: '', description: '' })
    refresh()
  }

  async function onDelete(id) {
    await deleteClaim(baseUrl, token, id, undefined, projectId)
    refresh()
  }

  const columns = [
    { key: 'claimId', header: 'Claim ID' },
    { key: 'status', header: 'Status' },
    { key: 'amount', header: 'Amount' },
    { key: 'description', header: 'Description' },
    { key: 'actions', header: 'Actions', render: (v, r) => (<button className="text-red-300" onClick={() => onDelete(r.id)}>Delete</button>) },
  ]

  return (
    <DashboardLayout variant="client">
      <h2 className="text-xl font-bold mb-4">Claims</h2>
      <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-4 items-end mb-4">
        <div>
          <div className="text-sm mb-1">Claim ID</div>
          <input className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" value={form.claimId} onChange={e=>setForm(f=>({ ...f, claimId: e.target.value }))} />
        </div>
        <div>
          <div className="text-sm mb-1">Amount</div>
          <input className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" value={form.amount} onChange={e=>setForm(f=>({ ...f, amount: e.target.value }))} />
        </div>
        <div className="md:col-span-2">
          <div className="text-sm mb-1">Description</div>
          <input className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2" value={form.description} onChange={e=>setForm(f=>({ ...f, description: e.target.value }))} />
        </div>
        <div>
          <button className="rounded-xl px-4 py-2 bg-cyan-600">Create</button>
        </div>
      </form>
      <DataTable rows={rows} columns={columns} searchKeys={["claimId","status","description"]} />
    </DashboardLayout>
  );
}



