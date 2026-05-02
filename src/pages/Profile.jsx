import { Award, BrainCircuit, CheckCircle, Circle, LogOut, PlayCircle, Sparkles, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompetitions } from '../context/CompetitionContext';

const Profile = () => {
  const { user, logout } = useAuth();
  const { competitions, submissions } = useCompetitions();
  const teamSubmissions = submissions.filter((submission) => submission.teamName === user?.name);
  const totalScore = teamSubmissions.reduce((sum, submission) => sum + Number(submission.score || 0), 0);

  return (
    <main className="page-shell max-w-4xl">
      <div className="tech-panel mb-6 flex items-center justify-between p-5">
        <button type="button" onClick={logout} className="flex items-center gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 font-bold text-red-200">
          خروج
          <LogOut size={18} />
        </button>
        <div className="text-right">
          <p className="section-kicker">نتائج الفريق</p>
          <h1 className="section-title">الملف الشخصي</h1>
        </div>
      </div>

      <section className="tech-panel mb-6 p-6 text-center text-white">
        <div className="ai-orb mx-auto mb-6 w-24">
          <User size={38} />
        </div>
        <h2 className="text-2xl font-black">{user?.name}</h2>
        <p className="text-sm text-slate-400">فريق مشارك في المخيم الرقمي</p>
        <div className="mt-3 flex justify-center">
          <span className="scout-ai-badge">
            <Sparkles size={14} />
            ملف كشفي مدعوم بالذكاء الاصطناعي
          </span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-800 pt-5">
          <div className="metric-tile">
            <p className="text-xs text-slate-400">إجمالي النقاط</p>
            <p className="text-3xl font-black text-accent">{totalScore}</p>
          </div>
          <div className="metric-tile">
            <p className="text-xs text-slate-400">التسليمات</p>
            <p className="text-3xl font-black text-signal">{teamSubmissions.length}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-right text-lg font-black text-slate-50">حالة المسابقات</h2>
        <div className="grid gap-3">
          {competitions.map((competition) => {
            const submission = teamSubmissions.find((item) => item.compId === competition.id);
            const status = submission ? 'مكتمل' : competition.isOpen ? 'جارٍ' : 'لم يبدأ';
            const Icon = submission ? CheckCircle : competition.isOpen ? PlayCircle : Circle;
            return (
              <article key={competition.id} className="card flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-accent">
                  {submission && <span className="font-black">{submission.score}</span>}
                  {competition.type === 'video' ? <BrainCircuit size={18} /> : <Award size={18} />}
                </div>
                <div className="flex flex-1 items-center justify-end gap-3 text-right">
                  <div>
                    <h3 className="font-black text-slate-50">{competition.name}</h3>
                    <p className="text-sm text-slate-400">{status}</p>
                  </div>
                  <Icon className={submission ? 'text-primary-light' : competition.isOpen ? 'text-signal' : 'text-slate-600'} />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
};

export default Profile;
