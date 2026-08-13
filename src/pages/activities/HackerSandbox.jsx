import { useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft, Play, ShieldCheck, Target, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createActivitySession, submitHackerAnswer } from '../../services/api';

const stageTopics = ['حماية البيانات', 'الصلاحيات', 'سجل العمليات', 'منع التخمين', 'استعادة الحساب'];

function participantScore(session) {
  const participant = session?.participants?.find(item => item.id === session.participantId) || session?.participants?.[0];
  return Number(participant?.score || 0);
}

const HackerSandbox = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [pendingSession, setPendingSession] = useState(null);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [lastAnswer, setLastAnswer] = useState(null);

  const start = async () => {
    setStarting(true);
    setMessage('');
    try {
      const result = await createActivitySession('hacker-sandbox');
      setSession(result.session);
    } catch (error) {
      setMessage(error.message || 'تعذر بدء التحدي');
    } finally {
      setStarting(false);
    }
  };

  const answer = async selectedIndex => {
    if (!session?.challenge || busy || lastAnswer) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await submitHackerAnswer(session.id, session.challenge.index, selectedIndex);
      setLastAnswer({ correct: response.correct, feedback: response.feedback, score: response.score });
      setPendingSession(response.session);
    } catch (error) {
      setMessage(error.message || 'تعذر تسجيل الاختيار');
    } finally {
      setBusy(false);
    }
  };

  const continueChallenge = () => {
    if (!pendingSession) return;
    setSession(pendingSession);
    setPendingSession(null);
    setLastAnswer(null);
  };

  const completed = session?.status === 'finished' || (session && !session.challenge);
  const progress = session?.progress || { current: 0, total: 5 };
  const challenge = session?.challenge;
  const stageNumber = Math.min(progress.current + 1, progress.total);
  const score = participantScore(session);
  const progressPercent = Math.round((Math.min(progress.current, progress.total) / progress.total) * 100);

  return (
    <main className="page-shell dir-rtl !max-w-3xl">
      <header className="mb-8 flex items-center justify-between gap-4">
        <button type="button" onClick={() => navigate('/activities')} className="btn-ghost shrink-0 !px-4 !py-2 text-xs">
          <ArrowRight size={14} /> العودة
        </button>
        <div className="min-w-0 text-right">
          <span className="badge-violet mb-2"><ShieldCheck size={13} /> نشاط توعوي سريع</span>
          <h1 className="text-3xl font-black text-white">تحدي الحارس الرقمي</h1>
        </div>
      </header>

      {!session ? (
        <section className="glass-sheen glass-violet overflow-hidden p-6 sm:p-8">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-300">
              <ShieldCheck size={38} />
            </div>
            <h2 className="text-2xl font-black text-white">احمِ تطبيق المهرجان</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-8 text-slate-300">
              أمامك خمسة مواقف بسيطة قد تحدث في أي تطبيق. اختر التصرف الأكثر أمانًا، وبعد كل اختيار سنشرح لك السبب بوضوح.
            </p>
            <div className="my-7 grid grid-cols-3 gap-3 text-center text-xs font-black">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-200"><span className="block text-lg text-cyan-300">5</span>مواقف</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-200"><span className="block text-lg text-amber-300">2</span>دقيقة</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-200"><span className="block text-lg text-emerald-300">0</span>تأثير على الترتيب</div>
            </div>
            <button type="button" onClick={start} disabled={starting} className="btn-violet mx-auto min-w-44 justify-center">
              {starting ? 'جاري تجهيز التحدي...' : <><Play size={17} /> ابدأ التحدي</>}
            </button>
            {message && <p role="alert" className="mt-5 text-sm font-bold text-rose-200">{message}</p>}
          </div>
        </section>
      ) : (
        <section className="glass-sheen glass-violet p-6 sm:p-8">
          <div className="mb-7">
            <div className="mb-3 flex items-center justify-between gap-3 text-xs font-black">
              <span className="text-slate-300">{completed ? 'اكتمل التحدي' : `الموقف ${stageNumber} من ${progress.total}`}</span>
              <span className="text-amber-300">النتيجة: {completed ? score : lastAnswer?.score ?? score} / {progress.total}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-l from-cyan-400 to-violet-500 transition-all duration-500" style={{ width: `${completed ? 100 : progressPercent}%` }} />
            </div>
          </div>

          {completed ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-4 text-emerald-400" size={52} />
              <h2 className="text-2xl font-black text-white">أصبحت حارسًا رقميًا</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-8 text-slate-300">
                حصلت على {score} من {progress.total}. المهم ليس حفظ الإجابات، بل تذكّر القاعدة: السيرفر يتحقق، الصلاحيات تُراجع، والعمليات المهمة تُسجّل.
              </p>
              <button type="button" onClick={() => navigate('/activities')} className="btn-violet mx-auto mt-7 justify-center">العودة للأنشطة</button>
            </div>
          ) : lastAnswer ? (
            <div className="py-4">
              <div className={`rounded-3xl border p-6 text-right ${lastAnswer.correct ? 'border-emerald-400/25 bg-emerald-400/10' : 'border-amber-400/25 bg-amber-400/10'}`}>
                <div className="mb-4 flex items-center gap-3">
                  {lastAnswer.correct ? <CheckCircle2 className="shrink-0 text-emerald-300" size={26} /> : <XCircle className="shrink-0 text-amber-300" size={26} />}
                  <h2 className={`text-xl font-black ${lastAnswer.correct ? 'text-emerald-100' : 'text-amber-100'}`}>
                    {lastAnswer.correct ? 'اختيار سليم' : 'مش ده التصرف الأفضل'}
                  </h2>
                </div>
                <p className="text-sm leading-8 text-slate-200">{lastAnswer.feedback}</p>
              </div>
              <button type="button" onClick={continueChallenge} className="btn-violet mx-auto mt-6 justify-center">
                {pendingSession?.status === 'finished' || !pendingSession?.challenge ? 'شاهد نتيجتك' : 'الموقف التالي'} <ChevronLeft size={17} />
              </button>
            </div>
          ) : challenge ? (
            <>
              <div className="mb-5 flex items-center justify-between gap-3">
                <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-black text-cyan-200">
                  {stageTopics[challenge.index] || 'قرار رقمي'}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><Target size={15} /> اختر أفضل تصرف</span>
              </div>
              <div className="mb-6 rounded-3xl border border-white/10 bg-black/15 p-5 text-right">
                <p className="mb-2 text-xs font-black text-violet-200">{challenge.title}</p>
                <p className="text-sm leading-8 text-slate-300">{challenge.scene}</p>
              </div>
              <h2 className="mb-5 text-xl font-black leading-9 text-white">{challenge.prompt}</h2>
              <div className="grid gap-3">
                {challenge.options.map((option, optionIndex) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => answer(optionIndex)}
                    disabled={busy}
                    className="group flex min-h-16 items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-right text-sm font-bold text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20 font-mono text-xs text-cyan-300 group-hover:border-cyan-300/30">{optionIndex + 1}</span>
                    <span>{option}</span>
                  </button>
                ))}
              </div>
              {busy && <p className="mt-4 text-center text-xs font-bold text-cyan-200">جاري تسجيل الاختيار...</p>}
            </>
          ) : null}

          {message && <p role="alert" className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-center text-sm font-bold text-rose-100">{message}</p>}
        </section>
      )}
    </main>
  );
};

export default HackerSandbox;
