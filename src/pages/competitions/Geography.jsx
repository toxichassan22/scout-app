import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, Send } from 'lucide-react';
import QuizShell from '../../components/QuizShell';
import { useAuth } from '../../context/AuthContext';
import { useCompetitions } from '../../context/CompetitionContext';

const normalize = (value) =>
  value.trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' ');

const Geography = () => {
  const { user } = useAuth();
  const { getCompetition, getRemainingSeconds, registerCompetitionEntry, submitEntry, geographyCountries } = useCompetitions();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null); // 'correct' | 'wrong'
  const submittedRef = useRef(false);
  const competition = getCompetition(3);
  const remaining = useMemo(() => getRemainingSeconds(competition), [competition, getRemainingSeconds]);

  useEffect(() => {
    const result = registerCompetitionEntry(3, user.name);
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
        submitEntry(3, user.name, { score: finalScore });
        alert(`تم تسجيل نتيجتك: ${finalScore}`);
      } catch (error) {
        alert(error.message);
      }
      navigate('/competitions', { replace: true });
    },
    [navigate, score, submitEntry, user.name],
  );

  const handleNext = (event) => {
    event.preventDefault();
    if (flash) return;
    const country = geographyCountries[currentIndex];
    const correct = normalize(answer) === normalize(country.name);
    const nextScore = score + (correct ? 10 : 0);
    setScore(nextScore);
    setFlash(correct ? 'correct' : 'wrong');

    setTimeout(() => {
      setFlash(null);
      setAnswer('');
      if (currentIndex + 1 >= geographyCountries.length) {
        finish(nextScore);
        return;
      }
      setCurrentIndex((v) => v + 1);
    }, 750);
  };

  const country = geographyCountries[currentIndex];

  if (!country) {
    return <div className="p-6 text-center text-[#6e6889]">لا توجد دول متاحة حالياً</div>;
  }

  return (
    <QuizShell
      title="الجغرافيا الكشفية"
      icon={Globe}
      tone="fern"
      currentIndex={currentIndex}
      total={geographyCountries.length}
      remainingSeconds={remaining}
      onTimerEnd={() => finish(score)}
      questionKey={currentIndex}
    >
      {/* بطاقة الدولة */}
      <div className="glass-sheen glass-fern mb-6 overflow-hidden p-0">
        {/* العلم والخريطة */}
        <div className="relative flex items-center justify-center gap-8 border-b border-[rgba(255,255,255,0.07)] bg-[rgba(7,6,12,0.45)] p-8">
          <motion.span
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="text-7xl drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] sm:text-8xl"
          >
            {country.flag}
          </motion.span>
          <motion.img
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            src={country.map}
            alt="خريطة الدولة"
            className="h-32 w-44 rounded-2xl border border-[rgba(255,255,255,0.15)] object-cover shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7)] sm:h-36 sm:w-52"
          />
        </div>

        {/* المعطيات */}
        <div className="grid grid-cols-2 gap-3 p-6">
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(7,6,12,0.4)] p-4 text-center">
            <p className="mb-1 text-[11px] font-bold text-[#6e6889]">العاصمة</p>
            <p className="text-base font-black text-white">{country.capital}</p>
          </div>
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(7,6,12,0.4)] p-4 text-center">
            <p className="mb-1 text-[11px] font-bold text-[#6e6889]">العملة</p>
            <p className="text-base font-black text-white">{country.currency}</p>
          </div>
        </div>
      </div>

      {/* الإجابة */}
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
