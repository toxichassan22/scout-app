import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BrainCircuit, KeyRound, TreePine, ShieldCheck, Flame } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FESTIVAL_DETAILS } from '../data/mockData';

const Login = () => {
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleChooserOpen, setGoogleChooserOpen] = useState(false);
  const { loginTeam, user, teams } = useAuth();
  const navigate = useNavigate();

  // Floating fireflies/campfire sparks animation
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
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/home', { replace: true });
    }
  }, [user, navigate]);

  React.useEffect(() => {
    const handleOpenGoogle = () => {
      setGoogleChooserOpen(true);
    };
    window.addEventListener('open-google-chooser', handleOpenGoogle);
    return () => window.removeEventListener('open-google-chooser', handleOpenGoogle);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const result = loginTeam(teamName);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setLoading(true);
    setTimeout(() => navigate('/home'), 800);
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

      <div className="w-full max-w-md relative z-20 animate-fade-in">
        {/* Logo & branding */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 h-24 w-24 rounded-2xl border border-white/10 bg-white/5 p-3 overflow-hidden shadow-lg shadow-emerald-950/20 hover:scale-105 transition duration-300">
            <img src={FESTIVAL_DETAILS.logo} alt="شعار المخيم" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{FESTIVAL_DETAILS.name}</h1>
          <p className="text-slate-500 text-sm">{FESTIVAL_DETAILS.subtitle}</p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent p-6 sm:p-8 backdrop-blur-md shadow-2xl transition duration-300 hover:border-white/10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/15 px-3 py-1.5 text-xs font-bold text-primary mb-4 animate-pulse">
              <ShieldCheck size={14} />
              بوابة الفرق الكشفية
            </div>
            <p className="text-slate-400 text-sm">اختر طريقة تسجيل الدخول لبدء المهرجان</p>
          </div>

          {loading ? (
            <div className="py-10 text-center animate-pulse">
              <div className="mx-auto h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
              <p className="text-sm text-slate-400 font-medium">جاري التحقق والدخول الكشفي الرقمي...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Google Sign-In Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-google-chooser'));
                }}
                className="w-full rounded-xl border border-slate-700 bg-white text-slate-900 font-extrabold text-sm py-3 flex items-center justify-center gap-3 hover:bg-slate-100 transition duration-200 active:scale-98"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22.81-.6z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.54 6.16-4.54z"/>
                </svg>
                <span>تسجيل الدخول بواسطة Google</span>
              </button>

              <div className="flex items-center my-4">
                <hr className="flex-1 border-white/[0.08]" />
                <span className="px-3 text-xs text-slate-500 font-bold">أو</span>
                <hr className="flex-1 border-white/[0.08]" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="text-right">
                  <label className="block text-xs font-bold text-slate-400 mb-2">اسم الفريق</label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="ai-input text-center text-lg font-bold transition-all duration-300 focus:border-primary/50"
                    placeholder="أدخل اسم فريقك المسجل"
                    required
                  />
                </div>

                {error && (
                  <p className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm font-medium text-red-400 text-right">
                    {error}
                  </p>
                )}

                <button type="submit" className="command-button w-full text-base py-3 flex items-center justify-center gap-2 hover:shadow-lg">
                  <KeyRound size={18} />
                  تسجيل الدخول المباشر
                </button>
              </form>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-col items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors">
              <ArrowRight size={14} />
              العودة للرئيسية
            </Link>
            <Link to="/admin/login" className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-amber-400 transition-colors">
              <BrainCircuit size={13} />
              دخول المشرفين
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

      {/* Google Account Chooser Modal */}
      {googleChooserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-800 text-right shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <button
                type="button"
                onClick={() => setGoogleChooserOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                إلغاء
              </button>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-700">اختر حساباً</span>
                {/* SVG Google */}
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22.81-.6z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.54 6.16-4.54z"/>
                </svg>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mb-4 leading-5">
              للمتابعة إلى تطبيق المخيم الرقمي، اختر حساب بريد إلكتروني مرتبط بفريقك الكشفي:
            </p>
            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {teams.map((tName) => {
                const email = `${tName.toLowerCase().replace(/\s+/g, '')}.scout@gmail.com`;
                return (
                  <button
                    key={tName}
                    type="button"
                    onClick={() => {
                      setGoogleChooserOpen(false);
                      setTeamName(tName);
                      // Login immediately
                      setError('');
                      const result = loginTeam(tName);
                      if (result.ok) {
                        setLoading(true);
                        setTimeout(() => navigate('/home'), 800);
                      } else {
                        setError(result.message);
                      }
                    }}
                    className="w-full text-right p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition flex items-center justify-between group"
                  >
                    <span className="text-[10px] text-slate-400 group-hover:text-primary font-bold">تسجيل سريع</span>
                    <div>
                      <p className="text-xs font-black text-slate-700">{tName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{email}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-slate-400 mt-4 text-center leading-4">
              سيقوم خادم المحاكاة بتمرير التوكن وتأمين الجلسة وفقاً للحد الأقصى {12} عضو لكل فريق.
            </p>
          </div>
        </div>
      )}
    </main>
  );
};

export default Login;
