import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, Send } from 'lucide-react';
import QuizShell from '../../components/QuizShell';
import { useAuth } from '../../context/AuthContext';
import { useCompetitions } from '../../context/CompetitionContext';
import { startQuizSession, saveQuizAnswer, submitQuizSession } from '../../services/api';

const normalize = (value) =>
  value.trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' ');

const Geography = () => {
  const { user } = useAuth();
  const { geographyCountries } = useCompetitions();
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(600);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null); // 'correct' | 'wrong'
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const submittedRef = useRef(false);

  // Start Session on mount with Server Timer & Device Lock
  useEffect(() => {
    async function initQuiz() {
      try {
        setLoading(true);
        // comp-digital-3 for Geography
        const res = await startQuizSession('comp-digital-3');
        setSessionId(res.sessionId);
        setRemainingSeconds(res.remainingSeconds);

        if (res.isCompleted) {
          alert('لقد أكمل فريقك هذه المسابقة بالفعل!');
          navigate('/competitions', { replace: true });
          return;
        }

        // Restore draft answers if reconnecting
        if (res.draftAnswers) {
          const answeredCount = Object.keys(res.draftAnswers).length;
          if (answeredCount > 0 && answeredCount < geographyCountries.length) {
            setCurrentIndex(answeredCount);
          }
        }

      } catch (err) {
        setErrorMsg(err.message || 'فشل في بدء المسابقة');
      } finally {
        setLoading(false);
      }
    }

    initQuiz();
  }, [navigate, geographyCountries.length]);

  // Server-Synced Countdown Timer
  useEffect(() => {
    if (loading || errorMsg || remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          finishQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, errorMsg, remainingSeconds]);

  const finishQuiz = useCallback(async () => {
    if (submittedRef.current || !sessionId) return;
    submittedRef.current = true;
    try {
      const res = await submitQuizSession(sessionId);
      alert(`تم تسليم المسابقة بنجاح! النتيجة: ${res.totalScore || score}`);
    } catch (e) {
      alert(e.message || 'تم حفظ جميع إجاباتك تلقائياً في السيرفر.');
    }
    navigate('/competitions', { replace: true });
  }, [sessionId, score, navigate]);

  const handleNext = async (event) => {
    event.preventDefault();
    if (flash || !sessionId) return;
    const country = geographyCountries[currentIndex];
    const correct = normalize(answer) === normalize(country.name);
    if (correct) setScore((s) => s + 10);

    setFlash(correct ? 'correct' : 'wrong');

    // Realtime Auto-Save to Server
    try {
      await saveQuizAnswer(sessionId, country.id || `geo_${currentIndex}`, correct ? 1 : 0);
    } catch (e) {
      console.warn('Auto-save error:', e.message);
    }

    setTimeout(() => {
      setFlash(null);
      setAnswer('');
      if (currentIndex + 1 >= geographyCountries.length) {
        finishQuiz();
        return;
      }
      setCurrentIndex((v) => v + 1);
    }, 750);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b14] text-white">
        <div className="text-center font-bold">
          <Globe className="mx-auto mb-3 animate-spin text-emerald-400" size={36} />
          <p>جارٍ بدء جلسة مسابقة الجغرافيا ومزامنة العداد من السيرفر...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b14] p-4 text-white">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center shadow-2xl backdrop-blur-xl">
          <Globe className="mx-auto mb-3 text-red-400" size={40} />
          <h2 className="mb-2 text-lg font-black">تنبيه الحماية والدخول المزدوج</h2>
          <p className="mb-6 text-sm text-slate-300 leading-relaxed">{errorMsg}</p>
          <button
            type="button"
            onClick={() => navigate('/competitions', { replace: true })}
            className="w-full rounded-xl bg-red-500 px-4 py-2.5 font-bold text-white shadow-lg transition hover:bg-red-600"
          >
            العودة لقائمة المسابقات
          </button>
        </div>
      </div>
    );
  }

  const country = geographyCountries[currentIndex];

  return (
    <QuizShell
      title="الجغرافيا الكشفية"
      icon={Globe}
      tone="fern"
      currentIndex={currentIndex}
      total={geographyCountries.length}
      remainingSeconds={remainingSeconds}
      onTimerEnd={finishQuiz}
      questionKey={currentIndex}
    >
      <div className="glass-sheen glass-fern mb-6 overflow-hidden p-0">
        <div className="relative flex items-center justify-center gap-8 border-b border-[rgba(255,255,255,0.07)] bg-[rgba(7,6,12,0.45)] p-8">
          <motion.span
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="text-7xl drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] sm:text-8xl"
          >
            {country?.flag}
          </motion.span>
          {country?.map && (
            <motion.img
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              src={country.map}
              alt="خريطة الدولة"
              className="h-32 w-44 rounded-2xl border border-[rgba(255,255,255,0.15)] object-cover shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7)] sm:h-36 sm:w-52"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 p-6">
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(7,6,12,0.4)] p-4 text-center">
            <p className="mb-1 text-[11px] font-bold text-[#6e6889]">العاصمة</p>
            <p className="text-base font-black text-white">{country?.capital}</p>
          </div>
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(7,6,12,0.4)] p-4 text-center">
            <p className="mb-1 text-[11px] font-bold text-[#6e6889]">العملة</p>
            <p className="text-base font-black text-white">{country?.currency}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleNext} className="space-y-4">
        <motion.input
          initial={false}
          animate={
            flash === 'correct'
              ? { borderColor: 'rgba(16,185,129,0.7)', boxShadow: '0 0 30px -4px rgba(16,185,129,0.5)' }
              : flash === 'wrong'
                ? { x: [0, -8, 8, -6, 6, 0], borderColor: 'rgba(244,63,94,0.7)' }
                : {}
          }
          transition={{ duration: 0.45 }}
          className="input-field text-center text-lg font-black"
          placeholder="اكتب اسم الدولة بالعربية"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          required
          autoFocus
        />
        <button type="submit" className="btn-ember btn-shine w-full !py-4 text-base" disabled={Boolean(flash)}>
          {flash === 'correct' ? 'إجابة صحيحة!' : flash === 'wrong' ? 'إجابة خاطئة' : 'الدولة التالية'}
          <Send size={18} />
        </button>
      </form>
    </QuizShell>
  );
};

export default Geography;
