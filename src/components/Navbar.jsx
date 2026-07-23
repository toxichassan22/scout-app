import { memo, useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Compass, Sparkles, Newspaper, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/home', icon: Home, label: 'الرئيسية', color: '#10b981', angle: -160 },
  { path: '/program', icon: Compass, label: 'البرنامج', color: '#38bdf8', angle: -125 },
  { path: '/activities', icon: Sparkles, label: 'الأنشطة', color: '#f59e0b', angle: -90 },
  { path: '/news', icon: Newspaper, label: 'الأخبار', color: '#a855f7', angle: -55 },
  { path: '/profile', icon: User, label: 'حسابي', color: '#ec4899', angle: -20 },
];

export const Navbar = memo(function Navbar() {
  const location = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredPath, setHoveredPath] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 640);
    }
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hide for guest, admin, judge, login, landing
  if (
    !user ||
    user.role === 'admin' ||
    user.role === 'judge' ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/judge') ||
    location.pathname === '/login' ||
    location.pathname === '/'
  ) {
    return null;
  }

  const activeItem = NAV_ITEMS.find((item) => item.path === location.pathname) || NAV_ITEMS[0];
  const ActiveIcon = activeItem.icon;
  const radius = isMobile ? 85 : 94; // Mobile: 85px (perfect), PC: 94px (tight & compact)

  return (
    <div
      ref={menuRef}
      dir="rtl"
      className="pointer-events-auto fixed bottom-6 left-1/2 -translate-x-1/2 z-[999990] flex items-center justify-center select-none"
    >
      {/* Floating Radial Arc Menu (Zero Overlap, Outward Radiating Labels) */}
      <AnimatePresence>
        {isOpen &&
          NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isHovered = hoveredPath === item.path;
            const rad = (item.angle * Math.PI) / 180;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;

            // Outward label placement along the radial spoke
            const labelX = Math.cos(rad) * 26;
            const labelY = Math.sin(rad) * 26;

            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{ opacity: 1, scale: 1, x, y }}
                exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 25,
                  delay: index * 0.03,
                }}
                className="absolute flex items-center justify-center"
              >
                <Link
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  onMouseEnter={() => setHoveredPath(item.path)}
                  onMouseLeave={() => setHoveredPath(null)}
                  className={`relative flex h-11 w-11 items-center justify-center rounded-full border shadow-xl backdrop-blur-2xl transition-all duration-300 ${
                    isActive
                      ? 'scale-110 bg-[rgba(2,11,14,0.96)] border-[rgba(56,189,248,0.8)] shadow-[0_0_20px_rgba(56,189,248,0.5)]'
                      : 'bg-[rgba(2,11,14,0.88)] border-[rgba(255,255,255,0.15)] hover:border-[rgba(245,158,11,0.6)] hover:scale-110'
                  }`}
                  style={{
                    borderColor: isActive || isHovered ? item.color : undefined,
                    boxShadow: isActive || isHovered ? `0 0 20px ${item.color}66` : undefined,
                  }}
                >
                  <Icon
                    size={20}
                    style={{ color: item.color }}
                    className="transition-transform duration-300 hover:scale-110"
                  />
                </Link>

                {/* Outward Radial Label Badge (Zero Overlap!) */}
                <span
                  style={{
                    transform: `translate(${labelX}px, ${labelY}px)`,
                    color: isActive || isHovered ? item.color : '#94a3b8',
                  }}
                  className={`absolute pointer-events-none rounded-full px-2 py-0.5 text-[9px] font-black tracking-tight shadow-md backdrop-blur-md transition-all duration-300 whitespace-nowrap ${
                    isActive || isHovered
                      ? 'scale-105 border border-[rgba(56,189,248,0.4)] bg-[rgba(2,11,14,0.95)] opacity-100'
                      : 'bg-[rgba(2,11,14,0.8)] opacity-85'
                  }`}
                >
                  {item.label}
                </span>
              </motion.div>
            );
          })}
      </AnimatePresence>

      {/* Floating Scout Nav Ball (Orb) */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-[rgba(56,189,248,0.6)] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.9),rgba(2,11,14,0.95))] shadow-[0_0_30px_rgba(56,189,248,0.5),0_10px_25px_rgba(0,0,0,0.8)] backdrop-blur-xl group"
      >
        {/* Pulsing Ring */}
        <span className="absolute -inset-1.5 rounded-full border border-[rgba(245,158,11,0.5)] opacity-60 animate-ping pointer-events-none" />

        {/* Center Dynamic Icon */}
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X size={24} className="text-[#f59e0b]" />
            </motion.div>
          ) : (
            <motion.div
              key="active"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <ActiveIcon size={24} style={{ color: activeItem.color }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tooltip Badge when closed */}
        {!isOpen && (
          <span className="absolute -top-7 rounded-full border border-[rgba(56,189,248,0.4)] bg-[rgba(2,11,14,0.88)] px-2.5 py-0.5 text-[9px] font-black text-[#38bdf8] shadow-md backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            {activeItem.label}
          </span>
        )}
      </motion.button>
    </div>
  );
});

export default Navbar;
