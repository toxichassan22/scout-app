import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import QuizShell from '../../components/QuizShell';
import { useAuth } from '../../context/AuthContext';
import { useCompetitions } from '../../context/CompetitionContext';

const TwoTruths = () => {
  const { user } = useAuth();
  const { getCompetition, getRemainingSeconds, registerCompetitionEntry, submitEntry, questions } = useCompetitions();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const submittedRef = useRef(false);
  const competition = getCompetition(1);
  const questionList = questions.two_truths;
  const remaining = useMemo(() => getRemainingSeconds(competition), [competition, getRemainingSeconds]);

  useEffect(() => {
    const result = registerCompetitionEntry(1, user.name);
    if (!result.ok) {
      alert(result.message);
      navigate('/competitions', { replace: true });
    }
  }, []);

  const finish = useCallback(
    (finalScore = score) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      try {
        submitEntry(1, user.name, { score: finalScore });
        alert(`تم تسجيل نتيجتك: ${finalScore}`);
      } catch (error) {
        alert(error.message);
      }
      navigate('/competitions', { replace: true });
    },
    [navigate, score, submitEntry, user.name],
  );

  const handleAnswer = (isLie, index) => {
    if (picked !== null) return;
    setPicked(index);
    const nextScore = score + (isLie ? 10 : 0);
    setScore(nextScore);

    setTimeout(() => {
      setPicked(null);
      if (currentIndex + 1 >= questionList.length) {
        finish(nextScore);
        return;
      }
      setCurrentIndex((v) => v + 1);
    }, 650);
  };

  const currentQuestion = questionList[currentIndex];

  if (!currentQuestion) {
    return <div className="p-6 text-center text-[#6e6889]">لا توجد أسئلة متاحة حالياً</div>;
  }

  return (
    <QuizShell
      title="حقيقتان وكذبة"
      icon={AlertCircle}
      tone="violet"
      currentIndex={currentIndex}
      total={questionList.length}
      remainingSeconds={remaining}
      onTimerEnd={() => finish(score)}
      questionKey={currentIndex}
    >
      {/* بطاقة السؤال */}
      <div className="glass-sheen glass-violet mb-6 p-6 text-center sm:p-8">
        <p className="section-kicker mb-3">أيّ العبارات التالية كاذبة؟</p>
        <h2 className="text-xl font-black leading-relaxed text-white sm:text-2xl">
          {currentQuestion.question}
        </h2>
      </div>

      {/* الخيارات */}
      <div className="grid gap-4">
        {currentQuestion.options.map((option, index) => {
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
