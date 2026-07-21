import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BrainCircuit, KeyRound, TreePine, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FESTIVAL_DETAILS } from '../data/mockData';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginTeam, user } = useAuth();
  const navigate = useNavigate();

  // Floating fireflies animation
  const sparks = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 3 + 2}px`,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 6 + 5}s`,
    }));
  }, []);

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
    <main className="flex min-h-screen items-center justify-center p-5 relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06), transparent 60%), #0a0f0a' }}>

      {/* Floating Sparks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        {sparks.map((spark) => (
          <span
            key={spark.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: spark.left,
              bottom: '-20px',
              width: spark.size,
              height: spark.size,
              backgroundColor: '#f59e0b',
              boxShadow: '0 0 6px #f59e0b, 0 0 12px #d97706',
              opacity: 0,
              animation: `floatUp ${spark.duration} infinite ease-in-out`,
              animationDelay: spark.delay,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-md relative z-20 animate-fade-in dir-rtl">
        {/* Logo & branding */}
        <div className="text-center mb-8">
          <div className="animate-soft-float mx-auto mb-5 h-24 w-24 rounded-2xl border border-emerald-500/15 bg-white/5 p-3 overflow-hidden shadow-lg shadow-emerald-950/20 hover:scale-105 hover:shadow-glow-green transition duration-300">
            <img src={FESTIVAL_DETAILS.logo} alt="شعار المخيم" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-gradient pb-0.5 mb-2">{FESTIVAL_DETAILS.name}</h1>
          <p className="text-slate-500 text-sm">{FESTIVAL_DETAILS.subtitle}</p>
        </div>

        {/* Login card */}
        <div className="card-sheen rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent p-6 sm:p-8 backdrop-blur-md shadow-2xl transition duration-300 hover:border-emerald-500/20 hover:shadow-glow-green">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/15 px-3 py-1.5 text-xs font-bold text-primary mb-4 animate-pulse">
              <ShieldCheck size={14} />
              بوابة الفرق الكشفية
            </div>
            <p className="text-slate-400 text-sm">أدخل اسم المستخدم وكلمة السر المسجلة لمتابعة المهرجان</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-right">
              <label className="block text-xs font-bold text-slate-400 mb-1.5">اسم المستخدم</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="ai-input text-right text-base font-bold transition-all duration-300 focus:border-primary/50"
                placeholder="مثال: team1"
                required
              />
            </div>

            <div className="text-right">
              <label className="block text-xs font-bold text-slate-400 mb-1.5">كلمة السر</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ai-input text-right text-base font-bold transition-all duration-300 focus:border-primary/50"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm font-medium text-red-400 text-right">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="command-button w-full text-base py-3 flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound size={18} />
                  تسجيل الدخول
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-center justify-center">
            <Link to="/judge/login" className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              <UserCheck size={13} />
              بوابة المحكّمين
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-slate-600">
          <span className="flex items-center gap-1"><TreePine size={12} /> {FESTIVAL_DETAILS.slogan}</span>
          <span>•</span>
          <span>{FESTIVAL_DETAILS.location}</span>
        </div>
      </div>
    </main>
  );
};

export default Login;
