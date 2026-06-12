import { memo, useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const THEME_OPTIONS = [
  {
    id: 'dark',
    label: 'داكن',
    colors: ['#0a0f0a', '#10b981', '#f59e0b'],
  },
  {
    id: 'light',
    label: 'فاتح',
    colors: ['#f0fdf4', '#059669', '#b45309'],
  },
  {
    id: 'neon',
    label: 'نيون',
    colors: ['#050510', '#00e5ff', '#7c3aed'],
  },
];

export const FloatSettings = memo(function FloatSettings() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="fixed bottom-24 left-4 z-40" dir="ltr">
      {/* Panel */}
      {open && (
        <div className="arena-panel absolute bottom-14 left-0 w-48 p-3 animate-fade-in">
          <p className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">المظهر</p>
          <div className="flex flex-col gap-1.5">
            {THEME_OPTIONS.map((opt) => {
              const isActive = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => { setTheme(opt.id); setOpen(false); }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {/* Color dots */}
                  <div className="flex -space-x-1">
                    {opt.colors.map((c, i) => (
                      <span
                        key={i}
                        className="h-4 w-4 rounded-full border-2 border-surface"
                        style={{ backgroundColor: c, zIndex: 3 - i }}
                      />
                    ))}
                  </div>
                  {/* Label */}
                  <span className={`flex-1 text-sm ${isActive ? 'font-bold text-primary' : 'font-medium text-slate-400'}`}>
                    {opt.label}
                  </span>
                  {/* Check */}
                  {isActive && <Check size={14} className="text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300 ${
          open
            ? 'border-primary/40 bg-primary/15 text-primary'
            : 'border-white/10 bg-surface text-slate-500 hover:border-primary/20 hover:text-primary'
        }`}
        aria-label="المظهر"
      >
        <Palette size={18} />
      </button>
    </div>
  );
});
