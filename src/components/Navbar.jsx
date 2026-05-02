import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, Newspaper, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const location = useLocation();
  const { user } = useAuth();

  if (!user || user.role === 'admin' || location.pathname.startsWith('/admin') || location.pathname === '/login') return null;

  const navItems = [
    { path: '/home', icon: Home, label: 'الرئيسية' },
    { path: '/competitions', icon: Trophy, label: 'المسابقات' },
    { path: '/news', icon: Newspaper, label: 'الأخبار' },
    { path: '/profile', icon: User, label: 'الملف' },
  ];

  return (
    <nav className="fixed bottom-3 left-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-lg border border-signal/20 bg-slate-950/90 px-3 py-2 shadow-2xl shadow-black/30 backdrop-blur">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex min-w-16 flex-col items-center gap-1 rounded-lg px-3 py-2 transition-colors ${
              isActive ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'text-slate-400 hover:bg-slate-800 hover:text-signal'
            }`}
          >
            <Icon size={24} />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
