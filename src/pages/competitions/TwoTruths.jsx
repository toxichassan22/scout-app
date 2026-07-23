import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import QuizShell from '../../components/QuizShell';
import { useAuth } from '../../context/AuthContext';
import { useCompetitions } from '../../context/CompetitionContext';
import { startQuizSession, saveQuizAnswer, submitQuizSession } from '../../services/api';

const TwoTruths = () => {
  const { user } = useAuth();
  const { questions } = useCompetitions();
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(600);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const submittedRef = useRef(false);

  const questionList = questions.two_truths || [];

  // Start Session on mount with Server Timer & Device Lock
  useEffect(() => {
    async function initQuiz() {
      try {
        setLoading(true);
        // comp-digital-2 for TwoTruths
        const res = await startQuizSession('comp-digital-2');
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
          if (answeredCount > 0 && answeredCount < questionList.length) {
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
  }, [navigate, questionList.length]);

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

  const handleAnswer = async (isLie, index) => {
    if (picked !== null || !sessionId) return;
    setPicked(index);

    const current = questionList[currentIndex];
    if (isLie) setScore((s) => s + 10);

    // Realtime Auto-Save to Server
    try {
      await saveQuizAnswer(sessionId, current.id || `q_twotruths_${currentIndex}`, index);
    } catch (e) {
      console.warn('Auto-save error:', e.message);
    }

    setTimeout(() => {
      setPicked(null);
      if (currentIndex + 1 >= questionList.length) {
        finishQuiz();
        return;
      }
      setCurrentIndex((v) => v + 1);
    }, 650);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b14] text-white">
        <div className="text-center font-bold">
          <AlertCircle className="mx-auto mb-3 animate-bounce text-violet-400" size={36} />
          <p>جارٍ بدء جلسة مسابقة حقيقتان وكذبة ومزامنة العداد من السيرفر...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b14] p-4 text-white">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center shadow-2xl backdrop-blur-xl">
          <AlertCircle className="mx-auto mb-3 text-red-400" size={40} />
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

  const currentQuestion = questionList[currentIndex];

  return (
    <QuizShell
      title="حقيقتان وكذبة"
      icon={AlertCircle}
      tone="violet"
      currentIndex={currentIndex}
      total={questionList.length}
      remainingSeconds={remainingSeconds}
      onTimerEnd={finishQuiz}
      questionKey={currentIndex}
    >
      <div className="glass-sheen glass-violet mb-6 p-6 text-center sm:p-8">
        <p className="section-kicker mb-3">أيّ العبارات التالية كاذبة؟ (حفظ تلقائي للخيارات)</p>
        <h2 className="text-xl font-black leading-relaxed text-white sm:text-2xl">
          {currentQuestion?.question}
        </h2>
      </div>

      <div className="grid gap-4">
        {currentQuestion?.options.map((option, index) => {
          const isPicked = picked === index;
          const stateCls =
            picked === null
              ? 'glass-hover'
              : isPicked && option.isLie
                ? '!border-[rgba(16,185,129,0.6)] bg-[rgba(16,185,129,0.12)] shadow-[0_0_30px_-6px_rgba(16,185,129,0.5)]'
                : isPicked && !option.isLie
                  ? '!border-[rgba(244,63,94,0.6)] bg-[rgba(244,63,94,0.1)]'
                  : 'opacity-40';

          return (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.09, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => handleAnswer(option.isLie, index)}
              className={`glass flex items-center gap-4 p-5 text-right transition-all duration-300 ${stateCls}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(139,92,246,0.35)] bg-[rgba(139,92,246,0.1)] font-mono text-sm font-black text-[#c4b5fd]">
                {['أ', 'ب', 'ج', 'د'][index] || index + 1}
              </span>
              <span className="text-base font-bold leading-7 text-white sm:text-lg">{option.text}</span>
            </motion.button>
          );
        })}
      </div>
    </QuizShell>
  );
};

export default TwoTruths;
