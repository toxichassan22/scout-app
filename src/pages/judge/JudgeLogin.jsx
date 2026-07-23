import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserCheck, KeyRound, ArrowRight, Scale } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const JudgeLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginJudge } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await loginJudge(username, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate('/judge/passcode');
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-5">
      {/* توهج خلفي */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_0%,rgba(139,92,246,0.14),transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md dir-rtl"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="glow-violet mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-[rgba(139,92,246,0.4)] bg-[rgba(139,92,246,0.1)] text-[#a78bfa]"
          >
            <Scale size={38} />
          </motion.div>
          <h1 className="text-scout mb-2 text-3xl font-black">بوابة التحكيم</h1>
          <p className="text-sm text-[#a9a3c2]">تسجيل دخول المحكمين والخبراء المعتمدين</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.55 }}
          className="glass-sheen glass-violet hud-frame p-6 sm:p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-right">
              <label className="mb-2 block text-xs font-black text-[#a9a3c2]">اسم مستخدم المحكم</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field text-right"
                placeholder="مثال: judge1"
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

            <button type="submit" disabled={loading} className="btn-violet btn-shine w-full text-base">
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.25)] border-t-white" />
              ) : (
                <>
                  <KeyRound size={18} />
                  دخول غرفة التحكيم
                </>
              )}
            </button>
          </form>

          <div className="mt-7 flex items-center justify-center border-t border-[rgba(255,255,255,0.07)] pt-5">
            <Link to="/login" className="flex items-center gap-1.5 text-xs font-bold text-[#6e6889] transition-colors hover:text-white">
              <ArrowRight size={13} />
              الرجوع لبوابة الفرق
            </Link>
          </div>
        </motion.div>

        <p className="mt-6 flex items-center justify-center gap-2 text-[11px] font-bold text-[#6e6889]">
          <UserCheck size={13} />
          منطقة مخصصة للجنة التحكيم فقط
        </p>
      </motion.div>
    </main>
  );
};

export default JudgeLogin;
