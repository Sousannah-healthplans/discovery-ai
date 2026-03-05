import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];

export default function SessionAnalytics({ actions }) {
  const chartData = useMemo(() => {
    // Event type distribution
    const eventTypes = {};
    actions.forEach(action => {
      eventTypes[action.type] = (eventTypes[action.type] || 0) + 1;
    });

    const eventTypeData = Object.entries(eventTypes).map(([type, count]) => ({
      type: type.replace('_', ' ').toUpperCase(),
      count,
      percentage: Math.round((count / actions.length) * 100)
    })).sort((a, b) => b.count - a.count);

    // Timeline data (events over time)
    const timelineData = [];
    const timeGroups = {};
    
    actions.forEach(action => {
      const time = new Date(action.ts);
      const timeKey = `${time.getHours()}:${Math.floor(time.getMinutes() / 5) * 5}`;
      timeGroups[timeKey] = (timeGroups[timeKey] || 0) + 1;
    });

    Object.entries(timeGroups).forEach(([time, count]) => {
      timelineData.push({ time, count });
    });

    // Activity heatmap (events by minute)
    const activityData = [];
    const startTime = actions.length > 0 ? new Date(actions[actions.length - 1].ts) : new Date();
    const endTime = actions.length > 0 ? new Date(actions[0].ts) : new Date();
    
    for (let i = 0; i < Math.ceil((endTime - startTime) / (1000 * 60)); i++) {
      const minuteStart = new Date(startTime.getTime() + i * 60 * 1000);
      const minuteEnd = new Date(minuteStart.getTime() + 60 * 1000);
      
      const eventsInMinute = actions.filter(action => {
        const actionTime = new Date(action.ts);
        return actionTime >= minuteStart && actionTime < minuteEnd;
      }).length;
      
      activityData.push({
        minute: i,
        events: eventsInMinute,
        time: minuteStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      });
    }

    return {
      eventTypes: eventTypeData,
      timeline: timelineData.sort((a, b) => a.time.localeCompare(b.time)),
      activity: activityData
    };
  }, [actions]);

  if (actions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        <p>No data available for analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Type Distribution */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Event Type Distribution</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.eventTypes.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="type" 
                  stroke="#9ca3af"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb'
                  }}
                />
                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.eventTypes.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percentage }) => `${type}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {chartData.eventTypes.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.activity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9ca3af"
                fontSize={12}
                interval="preserveStartEnd"
              />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f9fafb'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="events" 
                stroke="#06b6d4" 
                strokeWidth={2}
                dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#06b6d4', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Event Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {chartData.eventTypes.slice(0, 4).map((event, index) => (
          <div key={event.type} className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {event.type}
              </span>
            </div>
            <div className="text-2xl font-bold text-cyan-400">{event.count}</div>
            <div className="text-xs text-slate-500 dark:text-slate-500">
              {event.percentage}% of total
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
