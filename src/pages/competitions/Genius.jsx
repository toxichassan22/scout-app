import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import QuizShell from '../../components/QuizShell';
import { useAuth } from '../../context/AuthContext';
import { useCompetitions } from '../../context/CompetitionContext';

const Genius = () => {
  const { user } = useAuth();
  const { getCompetition, getRemainingSeconds, registerCompetitionEntry, submitEntry, questions } = useCompetitions();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const submittedRef = useRef(false);
  const competition = getCompetition(2);
  const questionList = questions.genius;
  const remaining = useMemo(() => getRemainingSeconds(competition), [competition, getRemainingSeconds]);

  useEffect(() => {
    const result = registerCompetitionEntry(2, user.name);
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
        submitEntry(2, user.name, { score: finalScore });
        alert(`تم تسجيل نتيجتك: ${finalScore}`);
      } catch (error) {
        alert(error.message);
      }
      navigate('/competitions', { replace: true });
    },
    [navigate, score, submitEntry, user.name],
  );

  const handleAnswer = (answer, index) => {
    if (picked !== null) return;
    setPicked(index);
    const current = questionList[currentIndex];
    const nextScore = score + (answer === current.answer ? 1 : 0);
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
      title="عبقرينو"
      icon={Zap}
      tone="ember"
      currentIndex={currentIndex}
      total={questionList.length}
      remainingSeconds={remaining}
      onTimerEnd={() => finish(score)}
      questionKey={currentIndex}
    >
      <div className="glass-sheen glass-ember mb-6 p-6 text-center sm:p-8">
        <p className="section-kicker mb-3">اختر الإجابة الصحيحة بسرعة</p>
        <h2 className="text-xl font-black leading-relaxed text-white sm:text-2xl">
          {currentQuestion.question}
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {currentQuestion.options.map((option, index) => {
          const isPicked = picked === index;
          const isCorrect = option === currentQuestion.answer;
          const stateCls =
            picked === null
              ? 'glass-hover'
              : isPicked && isCorrect
                ? '!border-[rgba(16,185,129,0.6)] bg-[rgba(16,185,129,0.12)] shadow-[0_0_30px_-6px_rgba(16,185,129,0.5)]'
                : isPicked && !isCorrect
                  ? '!border-[rgba(244,63,94,0.6)] bg-[rgba(244,63,94,0.1)]'
                  : 'opacity-40';

          return (
            <motion.button
              key={option}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => handleAnswer(option, index)}
              className={`glass flex items-center justify-center p-6 text-center transition-all duration-300 ${stateCls}`}
            >
              <span className="text-base font-black text-white sm:text-lg">{option}</span>
            </motion.button>
          );
        })}
      </div>
    </QuizShell>
  );
};

export default Genius;
