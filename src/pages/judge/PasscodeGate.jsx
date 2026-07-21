import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, Award, LogOut } from 'lucide-react';
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
      // Navigate to judging sheet with active competition
      navigate('/judge/sheet', { state: { competition: res.competition } });
    } catch (err) {
      setError(err.message || 'كود المسابقة غير صحيح أو المسابقة غير مفتوحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-5 bg-slate-950 dir-rtl text-white">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-6">
          <span className="text-xs text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
            المحكّم: {user?.name || user?.username}
          </span>
          <h1 className="text-2xl font-black mt-3 flex items-center justify-center gap-2">
            إدخال كود المسابقة
            <Award size={24} className="text-amber-400" />
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            أدخل كود الفتح المؤقت المستلم من رئيس لجنة التحكيم أو الأدمن
          </p>
        </div>

        <div className="card p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl">
          <form onSubmit={handleUnlock} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 text-center">رمز المرور للمسابقة (Passcode)</label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="ai-input text-center text-3xl tracking-[0.5em] font-mono font-bold py-3 text-amber-400 border-amber-500/30"
                placeholder="••••"
                maxLength={8}
                required
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-bold text-red-400 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-base flex items-center justify-center gap-2 transition shadow-glow-amber disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  <Lock size={18} />
                  فتح استمارة التقييم
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
            <button
              onClick={() => { logout(); navigate('/judge/login'); }}
              className="text-red-400 hover:text-red-300 flex items-center gap-1 font-bold"
            >
              <LogOut size={13} />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default PasscodeGate;
