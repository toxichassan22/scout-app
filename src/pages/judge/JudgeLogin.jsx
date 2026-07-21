import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserCheck, KeyRound, ArrowRight, ShieldAlert } from 'lucide-react';
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
    <main className="min-h-screen flex items-center justify-center p-5 bg-slate-950 dir-rtl text-white">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl border border-blue-500/20 bg-blue-500/10 flex items-center justify-center text-blue-400">
            <UserCheck size={36} />
          </div>
          <h1 className="text-2xl font-black">بوابة التحكيم الكشفي</h1>
          <p className="text-slate-400 text-xs mt-1">تسجيل دخول المحكمين والخبراء المعتمدين</p>
        </div>

        <div className="card p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 text-right">اسم مستخدم المحكم</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="ai-input text-right text-base font-bold"
                placeholder="مثال: judge1"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 text-right">كلمة السر</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ai-input text-right text-base font-bold"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-bold text-red-400 text-right">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound size={18} />
                  تسجيل الدخول للمحكم
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <Link to="/login" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition">
              <ArrowRight size={13} />
              الرجوع لبوابة الفرق
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default JudgeLogin;
