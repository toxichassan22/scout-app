import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Sparkles, Map } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/activities', icon: Trophy, label: 'المسابقات', color: 'primary' },
  { to: '/activities', icon: Sparkles, label: 'الأنشطة', color: 'accent' },
  { to: '/program', icon: Map, label: 'المناطق والبرنامج', color: 'primary' },
];

export const NavCircle = memo(function NavCircle() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-6">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isAccent = item.color === 'accent';
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`group flex flex-col items-center gap-2.5 transition duration-300 active:scale-95`}
          >
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                isAccent
                  ? 'border-accent/30 bg-accent/10 text-accent group-hover:border-accent/60 group-hover:bg-accent/20 group-hover:shadow-glow-amber'
                  : 'border-primary/30 bg-primary/10 text-primary group-hover:border-primary/60 group-hover:bg-primary/20 group-hover:shadow-glow-green'
              }`}
            >
              <Icon size={30} strokeWidth={1.8} />
            </div>
            <span
              className={`text-sm font-bold transition-colors duration-200 ${
                isAccent
                  ? 'text-accent/80 group-hover:text-accent'
                  : 'text-primary/80 group-hover:text-primary'
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
});
