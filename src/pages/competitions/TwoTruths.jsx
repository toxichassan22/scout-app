import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import Timer from '../../components/Timer';
import { useAuth } from '../../context/AuthContext';
import { useCompetitions } from '../../context/CompetitionContext';

const TwoTruths = () => {
  const { user } = useAuth();
  const { getCompetition, getRemainingSeconds, registerCompetitionEntry, submitEntry, questions } = useCompetitions();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
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

  const handleAnswer = (isLie) => {
    const nextScore = score + (isLie ? 10 : 0);
    setScore(nextScore);
    if (currentIndex + 1 >= questionList.length) {
      finish(nextScore);
      return;
    }
    setCurrentIndex((value) => value + 1);
  };

  const currentQuestion = questionList[currentIndex];

  if (!currentQuestion) {
    return <div className="p-6 text-center text-slate-400">لا توجد أسئلة متاحة حالياً</div>;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header className="tech-panel mb-6 flex items-center justify-between p-5">
        <Timer initialSeconds={remaining} onEnd={() => finish(score)} />
        <h1 className="text-xl font-black text-slate-50">حقيقتان وكذبة</h1>
      </header>

      <section className="card mb-5 text-right">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-signal/25 bg-signal/10 text-signal">
          <AlertCircle />
        </div>
        <p className="mb-2 text-sm font-bold text-slate-400">سؤال {currentIndex + 1} من {questionList.length}</p>
        <h2 className="text-xl font-black text-slate-50">{currentQuestion.question}</h2>
      </section>

      <div className="grid gap-3">
        {currentQuestion.options.map((option, index) => (
          <button key={index} type="button" onClick={() => handleAnswer(option.isLie)} className="card text-right text-lg font-bold text-slate-100 transition hover:border-signal hover:bg-signal/10">
            {option.text}
          </button>
        ))}
      </div>
    </main>
  );
};

export default TwoTruths;
