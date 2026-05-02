import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, X } from 'lucide-react';
import CompetitionCard from '../components/CompetitionCard';
import QRScanner from '../components/QRScanner';
import { useAuth } from '../context/AuthContext';
import { useCompetitions } from '../context/CompetitionContext';

const Competitions = () => {
  const { user } = useAuth();
  const { competitions, isCompleted, validateCompetitionEntry, registerCompetitionEntry } = useCompetitions();
  const [selectedComp, setSelectedComp] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const openScanner = (competition) => {
    const validation = validateCompetitionEntry(competition.id, user.name);
    if (!validation.ok) {
      setMessage(validation.message);
      return;
    }
    setMessage('');
    setSelectedComp(competition);
  };

  const handleScan = (value) => {
    if (!selectedComp) return;
    const validation = validateCompetitionEntry(selectedComp.id, user.name, value);
    if (!validation.ok) {
      setMessage(validation.message);
      setSelectedComp(null);
      return;
    }
    const lockResult = registerCompetitionEntry(selectedComp.id, user.name);
    if (!lockResult.ok) {
      setMessage(lockResult.message);
      setSelectedComp(null);
      return;
    }
    navigate(`/competition/${selectedComp.id}`);
  };

  return (
    <main className="page-shell">
      <div className="tech-panel mb-6 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="rounded-lg border border-signal/25 bg-signal/10 p-3 text-signal">
            <QrCode size={26} />
          </div>
          <div className="text-right">
            <p className="section-kicker">بوابة الدخول</p>
            <h1 className="section-title">المسابقات</h1>
            <p className="mt-1 text-sm text-slate-400">امسح QR من داخل التطبيق للدخول إلى المسابقة المفتوحة.</p>
          </div>
        </div>
      </div>

      {message && <div className="mb-5 rounded-lg border border-accent/25 bg-accent/10 p-4 text-center font-bold text-accent">{message}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {competitions.map((competition) => (
          <CompetitionCard
            key={competition.id}
            competition={competition}
            completed={competition.id !== 4 && isCompleted(competition.id, user.name)}
            onScan={() => openScanner(competition)}
          />
        ))}
      </div>

      {selectedComp && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-6 text-white">
          <button
            type="button"
            onClick={() => setSelectedComp(null)}
            className="absolute left-5 top-5 rounded-lg bg-white/10 p-3"
            aria-label="إغلاق"
          >
            <X />
          </button>
          <h2 className="mb-6 text-xl font-black">مسح رمز {selectedComp.name}</h2>
          <div className="aspect-square w-full max-w-sm overflow-hidden rounded-lg border-4 border-accent">
            <QRScanner onScan={handleScan} onError={() => setMessage('تعذر تشغيل الكاميرا')} />
          </div>
          <p className="mt-6 max-w-sm text-center text-sm text-white/70">يجب استخدام ماسح التطبيق فقط. رموز QR الخارجية لا تفتح المسابقة بدون جلسة دخول.</p>
        </div>
      )}
    </main>
  );
};

export default Competitions;
