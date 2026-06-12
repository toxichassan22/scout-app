import { useEffect, useMemo, useState } from 'react';

const getRemaining = (target) => {
  const diff = target - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    done: false,
  };
};

const pad = (n) => String(n).padStart(2, '0');

const Countdown = ({ targetDate }) => {
  const target = useMemo(() => new Date(targetDate).getTime(), [targetDate]);
  const [time, setTime] = useState(() => getRemaining(target));

  useEffect(() => {
    const id = setInterval(() => setTime(getRemaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const units = [
    { label: 'يوم', value: time.days },
    { label: 'ساعة', value: pad(time.hours) },
    { label: 'دقيقة', value: pad(time.minutes) },
    { label: 'ثانية', value: pad(time.seconds) },
  ];

  if (time.done) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-5 py-2.5 text-sm font-bold text-amber-400 shadow-glow-amber">
        🎉 انطلق المهرجان الآن
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3" dir="rtl">
      {units.map((unit) => (
        <div
          key={unit.label}
          className="card-sheen rounded-xl border border-emerald-500/15 bg-white/[0.03] p-3 sm:p-4 text-center transition duration-300 hover:border-primary/40 hover:-translate-y-0.5"
        >
          <p className="text-2xl sm:text-3xl font-bold tabular-nums text-white drop-shadow-[0_0_14px_rgba(16,185,129,0.35)]">
            {unit.value}
          </p>
          <p className="mt-1 text-[10px] sm:text-xs text-slate-500">{unit.label}</p>
        </div>
      ))}
    </div>
  );
};

export default Countdown;
