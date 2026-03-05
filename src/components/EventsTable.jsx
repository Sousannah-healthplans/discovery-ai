import DataTable from './DataTable';

export default function EventsTable({ events }) {
  const columns = [
    { key: 'ts', header: 'Time', render: (v) => new Date(v).toLocaleString() },
    { key: 'sessionId', header: 'Session' },
    { key: 'type', header: 'Type' },
    { key: 'summary', header: 'Details' },
  ];
  const rows = (events || []).map(e => ({
    id: String(e._id || `${e.sessionId}_${e.ts}`),
    ts: e.ts,
    sessionId: e.sessionId,
    type: e.type,
    summary: e.data && (e.data.selector || e.data.path || e.data.label || e.data.text || ''),
  }))
  return <DataTable rows={rows} columns={columns} searchKeys={["sessionId","type","summary"]} />
}






