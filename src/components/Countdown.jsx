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
    { label: 'أيام', value: time.days },
    { label: 'ساعات', value: pad(time.hours) },
    { label: 'دقائق', value: pad(time.minutes) },
    { label: 'ثوانٍ', value: pad(time.seconds) },
  ];

  if (time.done) {
    return (
      <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 px-6 py-3 text-base font-black text-amber-400 shadow-glow-amber animate-pulse">
        ⚡ انطلقت المسابقات الكشفية رسميًا بالأرض!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-3 sm:gap-4" dir="rtl">
      {units.map((unit) => (
        <div
          key={unit.label}
          className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-950/70 p-3 sm:p-5 text-center transition duration-300 hover:border-emerald-400/50 hover:shadow-glow-green group"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-3xl sm:text-5xl font-black tabular-nums text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-emerald-300 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            {unit.value}
          </p>
          <p className="mt-1.5 text-xs sm:text-sm font-bold text-emerald-400/80 uppercase tracking-widest">{unit.label}</p>
        </div>
      ))}
    </div>
  );
};

export default Countdown;

