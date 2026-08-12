import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Code2, ShieldCheck, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createActivitySession, submitHackerAnswer } from '../../services/api';

const HackerSandbox = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [lastAnswer, setLastAnswer] = useState(null);

  useEffect(() => {
    createActivitySession('hacker-sandbox').then(result => setSession(result.session)).catch(error => setMessage(error.message || 'تعذر بدء المهمة'));
  }, []);

  const answer = async selectedIndex => {
    if (!session?.challenge || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await submitHackerAnswer(session.id, session.challenge.index, selectedIndex);
      setLastAnswer({ correct: response.correct, feedback: response.feedback });
      setSession(response.session);
    } catch (error) {
      setMessage(error.message || 'تعذر تسجيل القرار');
    } finally {
      setBusy(false);
    }
  };

  const completed = session?.status === 'finished' || !session?.challenge;
  const progress = session?.progress || { current: 0, total: 5 };
  const challenge = session?.challenge;

  return (
    <main className="page-shell dir-rtl !max-w-3xl">
      <header className="mb-8 flex items-center justify-between"><button type="button" onClick={() => navigate('/activities')} className="btn-ghost !px-4 !py-2 text-xs"><ArrowRight size={14} /> العودة</button><div className="text-right"><span className="badge-violet mb-2"><ShieldCheck size={13} /> لعبة قصة آمنة</span><h1 className="text-3xl font-black text-white">مهمة بنك بيكسل</h1></div></header>
      <section className="glass-sheen glass-violet p-6 sm:p-8"><div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-right text-xs leading-6 text-amber-100"><Code2 className="shrink-0 text-amber-300" size={20} /><span>أنتم داخل بنك تجريبي خيالي. كل البيانات وهمية، والقرارات هنا للتعلم واللعب فقط؛ لا يوجد اتصال أو استغلال لنظام حقيقي.</span></div>
        {!session && !message && <p className="py-12 text-center text-sm font-bold text-slate-400">جاري تجهيز المهمة...</p>}
        {message && <p className="py-8 text-center text-sm font-bold text-rose-200">{message}</p>}
        {session && <>
          <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4"><span className="text-xs font-bold text-slate-400">المرحلة {Math.min(progress.current + 1, progress.total)} من {progress.total}</span><span className="font-mono text-amber-300">قرارات آمنة: {session.participants?.[0]?.score || 0}</span></div>
          {completed ? <div className="py-10 text-center"><CheckCircle2 className="mx-auto mb-3 text-emerald-400" size={44} /><h2 className="text-xl font-black text-white">تم تأمين بنك بيكسل</h2><p className="mt-2 text-sm leading-7 text-slate-400">انتهت القصة. خذوا نفس المبادئ معكم إلى أي نظام حقيقي: تحقق، صلاحيات، سجلات، وحماية من المحاولات المتكررة.</p></div> : challenge && <>
            <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5 text-right"><p className="mb-2 text-xs font-black text-cyan-200">{challenge.title}</p><p className="text-sm leading-8 text-slate-200">{challenge.scene}</p></div>
            <h2 className="mb-5 text-xl font-black leading-8 text-white">{challenge.prompt}</h2>
            <div className="grid gap-3">{challenge.options.map((option, optionIndex) => <button key={option} type="button" onClick={() => answer(optionIndex)} disabled={busy} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 text-right text-sm font-bold text-slate-200 transition hover:border-violet-400/40 hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50"><span>{option}</span><span className="font-mono text-xs text-slate-500">{optionIndex + 1}</span></button>)}</div>
          </>}
          {lastAnswer && <div className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 text-right text-sm leading-7 ${lastAnswer.correct ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100' : 'border-amber-400/25 bg-amber-400/10 text-amber-100'}`}>{lastAnswer.correct ? <CheckCircle2 className="mt-1 shrink-0 text-emerald-300" size={18} /> : <XCircle className="mt-1 shrink-0 text-amber-300" size={18} />}<span>{lastAnswer.feedback}</span></div>}
        </>}
      </section>
    </main>
  );
};

export default HackerSandbox;
