import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

const formatTime = (seconds) => {
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remaining = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
};

const Timer = ({ initialSeconds, onEnd }) => {
  const [seconds, setSeconds] = useState(Math.max(0, Number(initialSeconds || 0)));

  useEffect(() => {
    setSeconds(Math.max(0, Number(initialSeconds || 0)));
  }, [initialSeconds]);

  useEffect(() => {
    if (seconds <= 0) {
      onEnd?.();
      return undefined;
    }
    const timer = window.setTimeout(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds, onEnd]);

  return (
    <div className="status-badge status-badge-open animate-pulse-glow px-4 py-2 text-sm">
      <span className="tabular-nums">{formatTime(seconds)}</span>
      <Clock size={18} />
    </div>
  );
};

export default Timer;
