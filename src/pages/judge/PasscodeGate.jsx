import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Award, LogOut, ShieldCheck } from 'lucide-react';
import { unlockJudgeSession } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const PasscodeGate = () => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await unlockJudgeSession(passcode);
      navigate('/judge/sheet', { state: { competition: res.competition } });
    } catch (err) {
      setError(err.message || 'كود المسابقة غير صحيح أو المسابقة غير مفتوحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_100%,rgba(245,158,11,0.12),transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md dir-rtl"
      >
        <div className="mb-7 text-center">
          <span className="badge-violet mb-4">
            <ShieldCheck size={13} />
            المحكّم: {user?.name || user?.username}
          </span>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="glow-ember mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.1)] text-[#fcd34d]"
          >
            <Award size={38} />
          </motion.div>
          <h1 className="text-fire mb-2 text-3xl font-black">كود المسابقة</h1>
          <p className="text-sm text-[#a9a3c2]">أدخل كود الفتح المستلم من رئيس اللجنة</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.55 }}
          className="glass-sheen glass-ember hud-frame p-6 sm:p-8"
        >
          <form onSubmit={handleUnlock} className="space-y-6">
            <div>
              <label className="mb-3 block text-center text-xs font-black text-[#a9a3c2]">
                رمز المرور للمسابقة (Passcode)
              </label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="input-field border-[rgba(245,158,11,0.35)] py-4 text-center font-mono text-3xl font-black tracking-[0.5em] text-[#fcd34d]"
                placeholder="••••"
                maxLength={8}
                autoFocus
                required
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-2xl border border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.1)] p-3.5 text-center text-sm font-bold text-[#fda4af]"
              >
                {error}
              </motion.p>
            )}

            <button type="submit" disabled={loading} className="btn-ember btn-shine w-full !py-4 text-base">
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[rgba(26,18,6,0.25)] border-t-[#1a1206]" />
              ) : (
                <>
                  <Lock size={18} />
                  فتح استمارة التقييم
                </>
              )}
            </button>
          </form>

          <div className="mt-7 flex items-center justify-between border-t border-[rgba(255,255,255,0.07)] pt-5 text-xs">
            <button
              onClick={() => { logout(); navigate('/judge/login'); }}
              className="flex items-center gap-1.5 font-bold text-[#fda4af] transition hover:text-[#fecdd3]"
            >
              <LogOut size={13} />
              تسجيل الخروج
            </button>
            <span className="font-mono text-[10px] tracking-widest text-[#6e6889]" dir="ltr">JUDGE GATE</span>
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
};

export default PasscodeGate;
