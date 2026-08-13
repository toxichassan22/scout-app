import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import CompetitionCard from '../components/CompetitionCard';
import { useAuth } from '../context/AuthContext';
import { useCompetitions } from '../context/CompetitionContext';

const Competitions = () => {
  const { user } = useAuth();
  const { competitions, isCompleted, validateCompetitionEntry, registerCompetitionEntry } = useCompetitions();
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const currentTeamName = user?.name || user?.label || user?.username || 'فريق كشفي';

  const enterCompetition = (competition) => {
    const validation = validateCompetitionEntry(competition.id, currentTeamName);
    if (!validation.ok) {
      setMessage(validation.message);
      return;
    }
    const lockResult = registerCompetitionEntry(competition.id, currentTeamName);
    if (!lockResult.ok) {
      setMessage(lockResult.message);
      return;
    }
    navigate(`/competition/${competition.slug || competition.id}`);
  };

  return (
    <main className="page-shell">
      <div className="tech-panel mb-6 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="rounded-lg border border-signal/25 bg-signal/10 p-3 text-signal">
            <Trophy size={26} />
          </div>
          <div className="text-right">
            <p className="section-kicker">بوابة الدخول</p>
            <h1 className="section-title">المسابقات</h1>
            <p className="mt-1 text-sm text-slate-400">اضغط على المسابقة المفتوحة للدخول مباشرة.</p>
          </div>
        </div>
      </div>

      {message && <div className="mb-5 rounded-lg border border-accent/25 bg-accent/10 p-4 text-center font-bold text-accent">{message}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {competitions.map((competition) => {
          const isVideoComp = competition.slug === 'video' || competition.slug === 'video_design' || competition.type === 'video' || competition.id === 4;
          return (
            <CompetitionCard
              key={competition.id}
              competition={competition}
              completed={!isVideoComp && currentTeamName ? isCompleted(competition.id, currentTeamName) : false}
              onScan={() => enterCompetition(competition)}
            />
          );
        })}
      </div>
    </main>
  );
};

export default Competitions;
