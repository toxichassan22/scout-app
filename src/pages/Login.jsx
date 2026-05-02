import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RadioTower, ShieldCheck, Trophy } from 'lucide-react';
import { FESTIVAL_DETAILS } from '../data/mockData';

const Login = () => {
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const { loginTeam } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = loginTeam(teamName);
    if (result.ok) {
      navigate('/home');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="app-shell flex min-h-screen items-center justify-center p-5">
      <div className="tech-panel grid w-full max-w-5xl md:grid-cols-[1.12fr_0.88fr]">
        <section className="field-band p-8 text-right text-white md:p-10">
          <div className="mb-8 flex justify-end">
            <div className="h-24 w-24 rounded-lg border border-accent/30 bg-slate-950/30 p-3">
              <img src={FESTIVAL_DETAILS.logo} alt="شعار المخيم" className="h-full w-full object-contain" />
            </div>
          </div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-3 py-1 text-sm font-bold text-accent">
            <ShieldCheck size={16} />
            دخول الفرق
          </p>
          <h1 className="text-4xl font-black leading-tight">{FESTIVAL_DETAILS.name}</h1>
          <p className="mt-3 max-w-lg text-sm leading-7 text-slate-200">{FESTIVAL_DETAILS.info}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="metric-tile">
              <p className="text-xs text-slate-400">المهرجان</p>
              <p className="font-black">{FESTIVAL_DETAILS.subtitle}</p>
            </div>
            <div className="metric-tile">
              <p className="text-xs text-slate-400">الموقع</p>
              <p className="font-black">{FESTIVAL_DETAILS.location}</p>
            </div>
          </div>
        </section>

        <section className="bg-slate-950/70 p-8 text-center md:p-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-signal/25 bg-signal/10 text-signal">
            <RadioTower size={34} />
          </div>
          <h2 className="mb-2 text-2xl font-black text-slate-50">تسجيل الدخول</h2>
          <p className="mb-8 text-slate-400">أدخل اسم الفريق المسجل للمتابعة</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-right">
              <label className="mb-2 flex items-center justify-end gap-2 text-sm font-bold text-slate-300">
                اسم الفريق
                <Trophy size={16} className="text-accent" />
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="input-field text-center"
                placeholder="أدخل اسم فريقك"
                required
              />
            </div>

            {error && <p className="rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p>}

            <button type="submit" className="btn-primary w-full">
              تسجيل الدخول
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Login;
