import { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Sparkles, Newspaper, User, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/home', icon: Home, label: 'الرئيسية' },
  { path: '/program', icon: Compass, label: 'البرنامج' },
  { path: '/activities', icon: Sparkles, label: 'الأنشطة' },
  { path: '/news', icon: Newspaper, label: 'الأخبار' },
  { path: '/profile', icon: User, label: 'حسابي' },
];

export const Navbar = memo(function Navbar() {
  const location = useLocation();
  const { user } = useAuth();

  // Hide navbar on Landing, login, admin, and judge pages.
  if (!user || user.role === 'admin' || user.role === 'judge' || location.pathname.startsWith('/admin') || location.pathname.startsWith('/judge') || location.pathname === '/login') {
    return null;
  }

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md pointer-events-auto dir-rtl">
      <div className="glass-card rounded-full p-2 border border-emerald-500/20 bg-slate-950/80 backdrop-blur-2xl shadow-2xl shadow-emerald-950/40 flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center justify-center px-3.5 py-2 rounded-full transition-all duration-300 group ${
                isActive
                  ? 'text-emerald-400 font-black scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Active Pill Glow */}
              {isActive && (
                <span className="absolute inset-0 rounded-full bg-emerald-500/15 border border-emerald-500/30 shadow-glow-green" />
              )}

              <Icon
                size={20}
                className={`relative z-10 transition-transform duration-300 ${
                  isActive ? 'scale-110 text-emerald-400' : 'group-hover:scale-110'
                }`}
              />

              <span className="relative z-10 text-[10px] font-bold mt-1 tracking-tight">
                {item.label}
              </span>

              {/* Active Top Dot Indicator */}
              {isActive && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-1 w-3 rounded-full bg-emerald-400 shadow-glow-green" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
