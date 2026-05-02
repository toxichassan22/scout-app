import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Send } from 'lucide-react';
import Timer from '../../components/Timer';
import { useAuth } from '../../context/AuthContext';
import { useCompetitions } from '../../context/CompetitionContext';

const normalize = (value) => value.trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' ');

const Geography = () => {
  const { user } = useAuth();
  const { getCompetition, getRemainingSeconds, registerCompetitionEntry, submitEntry, geographyCountries } = useCompetitions();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
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
    const country = geographyCountries[currentIndex];
    const correct = normalize(answer) === normalize(country.name);
    const nextScore = score + (correct ? 10 : 0);
    setScore(nextScore);
    setAnswer('');
    if (currentIndex + 1 >= geographyCountries.length) {
      finish(nextScore);
      return;
    }
    setCurrentIndex((value) => value + 1);
  };

  const country = geographyCountries[currentIndex];

  if (!country) {
    return <div className="p-6 text-center text-slate-400">لا توجد دول متاحة حالياً</div>;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header className="tech-panel mb-6 flex items-center justify-between p-5">
        <Timer initialSeconds={remaining} onEnd={() => finish(score)} />
        <h1 className="flex items-center gap-2 text-xl font-black text-slate-50">
          الجغرافيا
          <Globe className="text-signal" />
        </h1>
      </header>

      <section className="card mb-5">
        <div className="mb-6 flex items-center justify-center gap-8">
          <div className="text-7xl">{country.flag}</div>
          <img src={country.map} alt="خريطة الدولة" className="h-32 w-44 rounded-lg border border-slate-700 object-cover" />
        </div>
        <div className="mb-6 grid grid-cols-2 gap-3 text-right">
          <div className="metric-tile">
            <p className="text-xs text-slate-400">العاصمة</p>
            <p className="font-black text-slate-50">{country.capital}</p>
          </div>
          <div className="metric-tile">
            <p className="text-xs text-slate-400">العملة</p>
            <p className="font-black text-slate-50">{country.currency}</p>
          </div>
        </div>
        <form onSubmit={handleNext} className="space-y-4">
          <input className="input-field text-center text-lg font-bold" placeholder="اكتب اسم الدولة بالعربية" value={answer} onChange={(event) => setAnswer(event.target.value)} required autoFocus />
          <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2">
            التالي
            <Send size={18} />
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-400">دولة {currentIndex + 1} من {geographyCountries.length}</p>
      </section>
    </main>
  );
};

export default Geography;
