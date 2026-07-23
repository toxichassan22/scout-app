import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, ShieldCheck, UserCheck, Flame, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FESTIVAL_DETAILS } from '../data/mockData';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginTeam, user } = useAuth();
  const navigate = useNavigate();

  // جمرات نار عائمة
  const embers = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        size: `${Math.random() * 3.5 + 2}px`,
        delay: `${Math.random() * 6}s`,
        duration: `${Math.random() * 7 + 6}s`,
        hue: Math.random() > 0.6 ? '#8b5cf6' : '#f59e0b',
      })),
    [],
  );

  React.useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (user.role === 'judge') navigate('/judge', { replace: true });
      else navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await loginTeam(username, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate('/home');
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-5">
      {/* جمرات عائمة */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {embers.map((ember) => (
          <span
            key={ember.id}
            className="pointer-events-none absolute rounded-full"
            style={{
              left: ember.left,
              bottom: '-20px',
              width: ember.size,
              height: ember.size,
              backgroundColor: ember.hue,
              boxShadow: `0 0 8px ${ember.hue}, 0 0 16px ${ember.hue}`,
              opacity: 0,
              animation: `floatUp ${ember.duration} infinite ease-in-out`,
              animationDelay: ember.delay,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-20 w-full max-w-md dir-rtl"
      >
        {/* الشعار والعنوان */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="animate-soft-float glow-violet mx-auto mb-6 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.75rem] border border-[rgba(139,92,246,0.35)] bg-[rgba(139,92,246,0.08)] p-3 backdrop-blur-xl"
          >
            <img src={FESTIVAL_DETAILS.logo} alt="شعار المخيم" className="h-full w-full object-contain" />
          </motion.div>
          <h1 className="text-fire mb-2 pb-1 text-3xl font-black">{FESTIVAL_DETAILS.name}</h1>
          <p className="text-sm text-[#a9a3c2]">{FESTIVAL_DETAILS.subtitle}</p>
        </div>

        {/* بطاقة الدخول */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="glass-sheen glass-violet hud-frame p-6 sm:p-8"
        >
          <div className="mb-7 text-center">
            <span className="badge-violet mb-4">
              <ShieldCheck size={13} />
              بوابة الفرق الكشفية
            </span>
            <p className="text-sm leading-7 text-[#a9a3c2]">
              أدخل بيانات فريقك المسجّلة للانضمام إلى ساحة المنافسة
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-right">
              <label className="mb-2 block text-xs font-black text-[#a9a3c2]">اسم المستخدم</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field text-right"
                placeholder="مثال: team1"
                autoComplete="username"
                required
              />
            </div>

            <div className="text-right">
              <label className="mb-2 block text-xs font-black text-[#a9a3c2]">كلمة السر</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field text-right"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-2xl border border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.1)] p-3.5 text-right text-sm font-bold text-[#fda4af]"
              >
                {error}
              </motion.p>
            )}

            <button type="submit" disabled={loading} className="btn-ember btn-shine w-full text-base">
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[rgba(26,18,6,0.25)] border-t-[#1a1206]" />
              ) : (
                <>
                  <LogIn size={19} />
                  دخول ساحة المنافسة
                </>
              )}
            </button>
          </form>

          <div className="mt-7 flex items-center justify-center border-t border-[rgba(255,255,255,0.07)] pt-5">
            <Link
              to="/judge/login"
              className="flex items-center gap-1.5 text-xs font-bold text-[#a78bfa] transition-colors hover:text-[#c4b5fd]"
            >
              <UserCheck size={14} />
              بوابة المحكّمين والخبراء
            </Link>
          </div>
        </motion.div>

        {/* فوتر */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-7 flex items-center justify-center gap-3 text-[11px] font-bold text-[#6e6889]"
        >
          <span className="flex items-center gap-1.5">
            <Flame size={12} className="text-[#f59e0b]" />
            {FESTIVAL_DETAILS.slogan}
          </span>
          <span className="h-1 w-1 rounded-full bg-[#6e6889]" />
          <span>{FESTIVAL_DETAILS.location}</span>
        </motion.div>
      </motion.div>
    </main>
  );
};

export default Login;
