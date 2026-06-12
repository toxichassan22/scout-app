import { useState, useEffect, useRef, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Sparkles, FileText, PhoneCall, Menu as MenuIcon, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/home', icon: Home, label: 'الرئيسية' },
  { path: '/program', icon: Compass, label: 'البرنامج' },
  { path: '/activities', icon: Sparkles, label: 'الأنشطة' },
  { path: '/upload-report', icon: FileText, label: 'رفع التقارير' },
  { path: '/contact', icon: PhoneCall, label: 'تواصل' },
];

export const Navbar = memo(function Navbar() {
  const location = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Close menu with Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Hide navbar on Landing, login, and admin pages.
  // Note: this early return must come AFTER all hooks (Rules of Hooks).
  if (!user || user.role === 'admin' || location.pathname.startsWith('/admin') || location.pathname === '/login') return null;

  return (
    <>
      {/* Backdrop overlay for focus */}
      <div
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-[3px] z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Floating Menu Container */}
      <nav ref={menuRef} aria-label="التنقل الرئيسي" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">

        {/* Radial Items Arc */}
        <div className="relative w-0 h-0">
          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            // Calculate positions in a semi-circle arc above the center button (radius = 100px)
            const angle = 180 - (index * 45); // Spread 180, 135, 90, 45, 0 degrees
            const rad = (angle * Math.PI) / 180;
            const radius = 100; // Radius distance in pixels
            const x = Math.round(radius * Math.cos(rad));
            const y = Math.round(-radius * Math.sin(rad));

            const itemStyle = {
              transform: isOpen ? `translate(${x}px, ${y}px) scale(1)` : 'translate(0px, 0px) scale(0.3)',
              opacity: isOpen ? 1 : 0,
              pointerEvents: isOpen ? 'auto' : 'none',
              transition: `transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s`,
              transitionDelay: isOpen ? `${index * 0.04}s` : '0s',
            };

            return (
              <Link
                key={item.path}
                to={item.path}
                style={itemStyle}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                tabIndex={isOpen ? 0 : -1}
                className={`absolute -left-6 -top-6 w-12 h-12 rounded-full flex flex-col items-center justify-center border transition-all active:scale-95 group ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-glow-green'
                    : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-emerald-500/40 hover:bg-slate-800'
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-200 whitespace-nowrap bg-slate-950/90 border border-slate-850 px-1.5 py-0.5 rounded shadow-lg pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Central Main Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={isOpen}
          className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-300 active:scale-95 shadow-lg ${
            isOpen
              ? 'border-rose-500/40 bg-slate-900/90 text-rose-400 shadow-glow-amber rotate-90'
              : 'border-emerald-500/40 bg-slate-950/95 text-emerald-400 shadow-glow-green hover:border-emerald-400'
          }`}
        >
          {isOpen ? <X size={24} aria-hidden="true" /> : <MenuIcon size={24} aria-hidden="true" />}
        </button>
      </nav>
    </>
  );
});
