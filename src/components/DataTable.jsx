import { useMemo, useState } from 'react';

export default function DataTable({ rows, columns, searchKeys=['id'], onRowClick }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(()=>{
    const term = q.toLowerCase();
    if (!term) return rows;
    return rows.filter(r => searchKeys.some(k => String(r[k]||'').toLowerCase().includes(term)));
  }, [rows, q, searchKeys]);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden dark:bg-white/5 dark:border-white/10">
      <div className="p-3">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..." className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 dark:bg-black/40 dark:border-white/10 dark:text-white" />
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-white/5">
            <tr>
              {columns.map(c=> <th key={c.key} className="text-left px-3 py-2 font-semibold text-slate-700 dark:text-cyan-200">{c.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r,idx)=> (
              <tr 
                key={idx} 
                className={`border-t border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick && onRowClick(r)}
              >
                {columns.map(c=> <td key={c.key} className="px-3 py-2">{c.render? c.render(r[c.key], r): r[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


