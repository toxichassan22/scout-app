import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Code2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createActivitySession, finishActivitySession, submitHackerAnswer } from '../../services/api';

const challenges = [
  { title: 'تحدي التحقق الوهمي', prompt: 'أي ممارسة تمنع قبول مدخلات غير متوقعة في نموذج تسجيل الدخول؟', options: ['التحقق من النوع والطول على السيرفر', 'إخفاء الزر فقط', 'تغيير لون الحقل'], answer: 0 },
  { title: 'تحدي الصلاحيات', prompt: 'أين يجب التأكد من أن المستخدم أدمن قبل تعديل نتيجة؟', options: ['في الواجهة فقط', 'في السيرفر قبل العملية', 'في اسم الزر'], answer: 1 },
  { title: 'تحدي السجلات', prompt: 'ما أفضل طريقة لتتبع عملية حساسة في نظام مسابقات؟', options: ['حذف السجل بعد العملية', 'تسجيل الحدث والفاعل والتوقيت', 'عدم تسجيل أي شيء'], answer: 1 },
];

const HackerSandbox = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { createActivitySession('hacker-sandbox').then(result => setSession(result.session)).catch(error => setMessage(error.message || 'تعذر بدء المحاكي')); }, []);
  const answer = async value => {
    if (!session) return;
    try {
      const response = await submitHackerAnswer(session.id, index, value);
      const nextScore = Number(response.score || 0);
      setScore(nextScore);
      if (index + 1 < challenges.length) setIndex(index + 1);
      else { await finishActivitySession(session.id, nextScore, { mode: 'safe-ctf' }); setDone(true); }
    } catch (error) {
      setMessage(error.message || 'تعذر حفظ إجابة التحدي');
    }
  };
  return <main className="page-shell dir-rtl !max-w-3xl"><header className="mb-8 flex items-center justify-between"><button type="button" onClick={() => navigate('/activities')} className="btn-ghost !px-4 !py-2 text-xs"><ArrowRight size={14} /> العودة</button><div className="text-right"><span className="badge-violet mb-2"><ShieldCheck size={13} /> Sandbox آمن</span><h1 className="text-3xl font-black text-white">محاكي الهاكر</h1></div></header><section className="glass-sheen glass-violet p-6 sm:p-8"><div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-right text-xs leading-6 text-amber-100"><Code2 className="shrink-0 text-amber-300" size={20} />هذه محاكاة تعليمية ببيانات وهمية. لا توجد ثغرة حقيقية ولا اتصال بقاعدة بيانات الإنتاج.</div>{done ? <div className="py-10 text-center"><CheckCircle2 className="mx-auto mb-3 text-emerald-400" size={44} /><h2 className="text-xl font-black text-white">انتهى التحدي</h2><p className="mt-2 text-sm text-slate-400">نتيجتك: {score} نقطة وتم حفظها في أنشطة الفريق.</p></div> : <><div className="mb-6 flex items-center justify-between"><span className="text-xs font-bold text-slate-400">تحدي {index + 1} من {challenges.length}</span><span className="font-mono text-amber-300">{score} نقطة</span></div><h2 className="mb-3 text-xl font-black text-white">{challenges[index].title}</h2><p className="mb-6 text-sm leading-8 text-slate-300">{challenges[index].prompt}</p><div className="grid gap-3">{challenges[index].options.map((option, optionIndex) => <button key={option} type="button" onClick={() => answer(optionIndex)} className="rounded-2xl border border-white/10 bg-black/10 p-4 text-right text-sm font-bold text-slate-200 transition hover:border-violet-400/40 hover:bg-violet-500/10">{option}</button>)}</div></>}{message && <p className="mt-4 text-center text-xs text-red-300">{message}</p>}</section></main>;
};

export default HackerSandbox;
