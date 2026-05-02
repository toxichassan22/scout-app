import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Send, Sparkles, Video } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCompetitions } from '../../context/CompetitionContext';

const MAX_ATTEMPTS = 3;

const VideoDesign = () => {
  const { user } = useAuth();
  const { registerCompetitionEntry, submitEntry, getVideoAttempts } = useCompetitions();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const attempts = getVideoAttempts(user.name);
  const remaining = Math.max(0, MAX_ATTEMPTS - attempts.length);

  useEffect(() => {
    const result = registerCompetitionEntry(4, user.name);
    if (!result.ok) {
      alert(result.message);
      navigate('/competitions', { replace: true });
    }
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (remaining <= 0) return;
    try {
      submitEntry(4, user.name, { prompt, score: 0 });
      setPrompt('');
      alert('تم حفظ البرومبت محلياً وسيتم تقييمه من الأدمن');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header className="tech-panel mb-6 flex items-center justify-between p-5">
        <div className="ai-orb w-16">
          <Video className="text-signal" />
        </div>
        <div className="text-right">
          <p className="scout-ai-badge mb-2 mr-auto">
            <BrainCircuit size={14} />
            تحدي البرومبت
          </p>
          <h1 className="text-xl font-black text-slate-50">تصميم الفيديو</h1>
        </div>
      </header>

      <section className="card mb-6 text-right">
        <div className="mb-3 flex items-center justify-end gap-2 text-accent">
          <h2 className="font-black">الموضوع: الكشافة في عصر الذكاء الاصطناعي</h2>
          <Sparkles size={20} />
        </div>
        <p className="leading-8 text-slate-300">اكتب برومبت واضحاً لفيديو قصير يشرح كيف تساعد التكنولوجيا الفرق الكشفية في التنظيم، التعلم، والعمل الجماعي.</p>
        <p className="mt-4 rounded-lg border border-primary/25 bg-primary/10 p-3 text-center font-black text-primary-light">المحاولات المتبقية: {remaining}</p>
      </section>

      {remaining > 0 ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea className="input-field h-44 resize-none text-right" placeholder="اكتب البرومبت هنا..." value={prompt} onChange={(event) => setPrompt(event.target.value)} required />
          <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2">
            تسجيل المحاولة
            <Send size={18} />
          </button>
        </form>
      ) : (
        <div className="card border-red-400/25 bg-red-500/10 py-10 text-center font-black text-red-200">تم استنفاد المحاولات الثلاث لهذا الفريق</div>
      )}

      {attempts.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-right font-black text-slate-50">محاولاتك السابقة</h2>
          <div className="grid gap-3">
            {attempts.map((attempt, index) => (
              <article key={attempt.id} className="card text-right">
                <p className="mb-1 text-xs font-bold text-slate-400">المحاولة {index + 1}</p>
                <p className="leading-7 text-slate-300">{attempt.data.prompt}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default VideoDesign;
