import { useEffect, useState } from 'react';

export default function MetricCard({ label, value, formatter, trend, trendUp }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = typeof value === 'number' ? value : 0;
    let frame = 0;
    const steps = 20;
    const tick = () => {
      frame += 1;
      const next = Math.round((target * frame) / steps);
      setDisplay(frame >= steps ? target : next);
      if (frame < steps) requestAnimationFrame(tick);
    };
    tick();
  }, [value]);

  return (
    <div className="rounded-2xl p-5 bg-white border border-slate-200 text-slate-800 dark:bg-white/5 dark:border-white/10 dark:text-white">
      <div className="flex justify-between items-start">
        <div className="text-sm text-slate-600 dark:text-cyan-200">{label}</div>
        {trend && (
          <div className={`text-xs font-medium flex items-center gap-1 ${
            trendUp ? 'text-green-500' : 'text-red-500'
          }`}>
            <span>{trendUp ? '↗' : '↘'}</span>
            {trend}
          </div>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold">{formatter ? formatter(display) : display}</div>
    </div>
  );
}


