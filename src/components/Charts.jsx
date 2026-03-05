import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

export function SessionsLine({ data }) {
  return (
    <div className="rounded-2xl p-4 bg-white border border-slate-200 h-72 dark:bg-white/5 dark:border-white/10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" stroke="#64748B" tickLine={false} axisLine={false} />
          <YAxis stroke="#64748B" tickLine={false} axisLine={false} />
          <Tooltip cursor={{ stroke: '#111827' }} />
          <Line type="monotone" dataKey="sessions" stroke="#22d3ee" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const COLORS = ['#06b6d4', '#f97316', '#84cc16'];
export function DevicePie({ data }) {
  return (
    <div className="rounded-2xl p-4 bg-white border border-slate-200 h-72 dark:bg-white/5 dark:border-white/10">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}


