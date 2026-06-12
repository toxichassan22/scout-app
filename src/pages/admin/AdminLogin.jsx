import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, KeyRound, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FESTIVAL_DETAILS } from '../../data/mockData';
import { Link } from 'react-router-dom';

const AdminLogin = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  // Floating sparks
  const sparks = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 3 + 2}px`,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 6 + 5}s`,
    }));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loginAdmin(form.username, form.password)) {
      navigate('/admin/dashboard');
    } else {
      setError('بيانات الدخول غير صحيحة');
    }
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

      <div className="w-full max-w-4xl relative z-20 animate-fade-in">
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent overflow-hidden backdrop-blur-md shadow-2xl transition duration-300 hover:border-white/10">
          <div className="grid md:grid-cols-2">
            
            {/* Form side */}
            <section className="p-8 sm:p-10 text-right order-2 md:order-1">
              <div className="flex justify-center md:justify-start mb-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-400">
                  <ShieldCheck size={14} />
                  بوابة المشرفين
                </div>
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">لوحة التحكم والقيادة</h1>
              <p className="text-slate-400 text-sm mb-6">سجل الدخول لإدارة الفعاليات والنتائج</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">اسم المستخدم</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="ai-input text-right transition-all duration-300 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">كلمة المرور</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="ai-input text-right transition-all duration-300 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                    required
                  />
                </div>

                {error && (
                  <p className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm font-medium text-red-400 text-right">
                    {error}
                  </p>
                )}

                <button type="submit" className="command-button w-full py-3 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 text-base">
                  <KeyRound size={18} />
                  تسجيل دخول الأدمن
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-center justify-center">
                <Link to="/" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors">
                  <ArrowRight size={14} />
                  العودة للرئيسية
                </Link>
              </div>
            </section>

            {/* Visual side */}
            <section className="relative hidden md:block overflow-hidden min-h-[400px] order-1 md:order-2">
              <img src="/brand/hero-arena.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f0a] via-[#0a0f0a]/50 to-transparent" />
              <div className="relative flex h-full flex-col justify-end p-8 text-right z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/30 px-3 py-1 text-xs font-bold text-white mb-3 self-end backdrop-blur-sm">
                  <BrainCircuit size={14} className="text-primary-light" />
                  منصة المشرفين
                </span>
                <h2 className="text-3xl font-bold text-white mb-2">تحكم كامل في الساحة</h2>
                <p className="text-slate-300 text-sm leading-6">
                  تابع الفرق، وافق على الأخبار، افتح التحديات للمتسابقين، وقم بتقييم أعمال الذكاء الاصطناعي لحظة بلحظة.
                </p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
};

export default AdminLogin;
