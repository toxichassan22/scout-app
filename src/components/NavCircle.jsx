import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Sparkles, Map, ChevronLeft } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/activities', icon: Trophy, label: 'المسابقات', desc: 'تحديات التقييم الرسمية', accent: false },
  { to: '/activities', icon: Sparkles, label: 'الأنشطة', desc: 'ألعاب ترفيهية تفاعلية', accent: true },
  { to: '/program', icon: Map, label: 'المناطق والبرنامج', desc: 'خريطة المعسكر والجدول', accent: false },
];

export const NavCircle = memo(function NavCircle() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            to={item.to}
            className={`card-sheen group relative overflow-hidden rounded-2xl border p-5 text-right transition-all duration-300 active:scale-[0.98] hover:-translate-y-1 ${
              item.accent
                ? 'border-amber-500/15 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent hover:border-amber-500/40 hover:shadow-glow-amber'
                : 'border-emerald-500/15 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent hover:border-emerald-500/40 hover:shadow-glow-green'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <ChevronLeft
                size={18}
                className={`shrink-0 transition-all duration-300 group-hover:-translate-x-1 ${
                  item.accent ? 'text-amber-500/40 group-hover:text-amber-400' : 'text-emerald-500/40 group-hover:text-emerald-400'
                }`}
              />
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-black text-white">{item.label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{item.desc}</p>
                </div>
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110 ${
                    item.accent
                      ? 'border-amber-500/25 bg-amber-500/10 text-amber-400'
                      : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                  }`}
                >
                  <Icon size={22} strokeWidth={1.8} />
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
});
