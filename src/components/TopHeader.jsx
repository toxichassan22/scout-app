import { memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FESTIVAL_DETAILS } from '../data/mockData';

export const TopHeader = memo(function TopHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Hide header on landing page, login, judge, and admin routes
  if (
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/judge')
  ) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[rgba(16,185,129,0.2)] bg-[rgba(2,11,14,0.85)] backdrop-blur-xl shadow-lg shadow-black/50 dir-rtl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Right side: Festival Logo */}
        <Link to="/home" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(245,158,11,0.5)] bg-[rgba(2,11,14,0.9)] p-1.5 shadow-[0_0_15px_rgba(245,158,11,0.35)] transition-transform group-hover:scale-105 overflow-hidden">
            <img src={FESTIVAL_DETAILS.logo} alt="شعار المهرجان" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-black tracking-wide text-white transition-colors leading-tight">
              كشفية بفكر <span className="text-[#38bdf8] drop-shadow-[0_0_12px_rgba(56,189,248,0.95)] font-black">ديجيتال</span>
            </span>
            <span className="text-[10px] font-mono text-[#38bdf8] font-bold">DSC·30</span>
          </div>
        </Link>

        {/* Left side: User Controls & Actions */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(15,45,39,0.6)] px-3 py-1.5 text-xs font-bold text-[#e2e8f0] backdrop-blur-md transition-all hover:border-[rgba(56,189,248,0.5)] hover:text-white"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10b981]/20 text-[#10b981]">
                  <User size={12} />
                </div>
                <span>{user.name || user.teamName || 'الكشاف'}</span>
              </Link>

              {user.role === 'admin' && (
                <Link
                  to="/admin/dashboard"
                  className="flex items-center gap-1.5 rounded-full border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.15)] px-3 py-1.5 text-xs font-bold text-[#f59e0b] backdrop-blur-md transition-all hover:bg-[rgba(245,158,11,0.25)]"
                >
                  <ShieldCheck size={14} />
                  <span>لوحة الإدارة</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                title="تسجيل الخروج"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] text-[#f87171] transition-all hover:bg-[#ef4444] hover:text-white"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
});

export default TopHeader;
