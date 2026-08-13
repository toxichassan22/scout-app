import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import QuizShell from '../components/QuizShell';
import { getCompetitionPlay, saveQuizAnswer, submitQuizSession } from '../services/api';

const optionLabels = ['أ', 'ب', 'ج', 'د'];

const CompetitionPlay = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answering, setAnswering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const finishedRef = useRef(false);

  const finish = useCallback(async () => {
    if (finishedRef.current || !sessionId) return;
    finishedRef.current = true;
    try {
      await submitQuizSession(sessionId);
      setNotice('تم حفظ إجاباتك وتسليم الجلسة. النتيجة مخفية حتى إعلان الأدمن.');
    } catch (err) {
      setError(err.message || 'تعذر تسليم الجلسة');
    } finally {
      window.setTimeout(() => navigate('/activities', { replace: true }), 1200);
    }
  }, [navigate, sessionId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await getCompetitionPlay(slug);
        if (!active) return;
        if (!data.sessionId || data.completed) {
          navigate(`/competition-entry/${slug}`, { replace: true });
          return;
        }
        const answered = new Set(data.answeredQuestionIds || []);
        const firstPending = data.questions.findIndex(question => !answered.has(question.id));
        setCompetition(data.competition);
        setQuestions(data.questions || []);
        setSessionId(data.sessionId);
        setRemainingSeconds(data.remainingSeconds || 0);
        setCurrentIndex(firstPending >= 0 ? firstPending : data.questions.length);
      } catch (err) {
        if (err.status === 409 || err.sessionRequired || err.forceLogout) navigate(`/competition-entry/${slug}`, { replace: true });
        else setError(err.message || 'تعذر تحميل أسئلة المسابقة');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [navigate, slug]);

  useEffect(() => {
    if (!sessionId || loading || finishedRef.current || remainingSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setRemainingSeconds(previous => {
        if (previous <= 1) {
          window.clearInterval(timer);
          finish();
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finish, loading, remainingSeconds, sessionId]);

  const answer = async (selectedIndex) => {
    if (answering || selected !== null || !sessionId || !questions[currentIndex]) return;
    setAnswering(true);
    setSelected(selectedIndex);
    setError('');
    try {
      await saveQuizAnswer(sessionId, questions[currentIndex].id, selectedIndex);
      const nextIndex = currentIndex + 1;
      if (nextIndex >= questions.length) await finish();
      else {
        window.setTimeout(() => {
          setSelected(null);
          setCurrentIndex(nextIndex);
          setAnswering(false);
        }, 350);
      }
    } catch (err) {
      setSelected(null);
      setError(err.message || 'تعذر حفظ الإجابة');
      setAnswering(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#070b14] text-white"><Loader2 className="animate-spin text-cyan-400" size={36} /></div>;
  if (error && !competition) return <div className="flex min-h-screen items-center justify-center p-6 text-white"><div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center"><AlertCircle className="mx-auto mb-3 text-red-400" size={40} /><p className="font-bold">{error}</p><button type="button" onClick={() => navigate(`/competition-entry/${slug}`)} className="btn-ghost mt-5 w-full">العودة لصفحة الدخول</button></div></div>;

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return <div className="flex min-h-screen items-center justify-center text-white"><CheckCircle2 className="mr-2 text-emerald-400" /> تم حفظ الجلسة.</div>;

  return (
    <QuizShell title={competition?.name || 'المسابقة'} icon={AlertCircle} tone="ember" currentIndex={currentIndex} total={questions.length} remainingSeconds={remainingSeconds} onTimerEnd={finish} questionKey={currentQuestion.id}>
      <div className="glass-sheen glass-ember mb-6 p-6 text-center sm:p-8">
        {currentQuestion.category && (
          <p className="section-kicker mb-3">
            {
              {
                capital: '🏛️ عواصم الدول العربية',
                currency: '💰 العملات والأنظمة المالية',
                governance: '⚖️ أنظمة الحكم والإدارة',
                flag: '🚩 أعلام الوطن العربي',
                map: '🗺️ خرائط الدول العربية',
                capital_country: '🏛️ عواصم الدول',
                currency_country: '💰 العملات العربية',
                governance_country: '⚖️ أنظمة الحكم',
              }[currentQuestion.category] || currentQuestion.category
            }
          </p>
        )}
        {currentQuestion.mediaUrl && (
          currentQuestion.mediaUrl.startsWith('emoji:') ? (
            <span className="mb-4 block text-7xl select-none filter drop-shadow-lg">{currentQuestion.mediaUrl.slice(6)}</span>
          ) : (
            <img src={currentQuestion.mediaUrl} alt={currentQuestion.mediaAlt || ''} className="mx-auto mb-5 max-h-48 rounded-2xl object-contain drop-shadow-md" />
          )
        )}
        <p className="section-kicker mb-3">اختر إجابة واحدة — يتم الحفظ تلقائيًا</p>
        <h2 className="text-xl font-black leading-relaxed text-white sm:text-2xl">{currentQuestion.text}</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {currentQuestion.options.map((option, index) => (
          <motion.button key={`${currentQuestion.id}-${index}`} type="button" disabled={answering || selected !== null} onClick={() => answer(index)} whileTap={{ scale: 0.98 }} className={`glass flex items-center gap-4 p-5 text-right transition-all duration-300 ${selected === index ? '!border-[rgba(16,185,129,0.65)] bg-[rgba(16,185,129,0.12)]' : selected !== null ? 'opacity-40' : 'glass-hover'}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.1)] font-mono text-sm font-black text-[#fcd34d]">{optionLabels[index] || index + 1}</span>
            <span className="text-base font-bold leading-7 text-white">{option}</span>
          </motion.button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(7,6,12,0.35)] p-4 text-xs font-bold text-[#a9a3c2]">
        <span>{notice || `السؤال ${currentIndex + 1} من ${questions.length}`}</span>
        <span className="flex items-center gap-1.5"><Send size={13} /> لا تظهر النتيجة أثناء المسابقة</span>
      </div>
      {error && <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm font-bold text-red-200">{error}</p>}
    </QuizShell>
  );
};

export default CompetitionPlay;
