import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, Clock3, LockKeyhole, QrCode, ScanLine } from 'lucide-react';
import { motion } from 'framer-motion';
import QRScanner from '../components/QRScanner';
import { enterCompetition, scanCompetition } from '../services/api';
import { useSocket } from '../context/SocketContext';

function extractQrValue(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.searchParams.get('qr') || url.searchParams.get('code') || value;
  } catch {
    return value;
  }
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('ar-EG') : 'يحدده الأدمن';
}

const CompetitionEntry = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [competition, setCompetition] = useState(null);
  const [qrValue, setQrValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('وجّه الكاميرا إلى QR المسابقة المطبوع.');

  const scan = useCallback(async (value = qrValue) => {
    if (!value || scanning) return;
    setScanning(true);
    setError('');
    try {
      const result = await scanCompetition(slug, extractQrValue(value));
      setQrValue(extractQrValue(value));
      setCompetition(result.competition);
      setNotice(result.canStart ? 'المسابقة جاهزة للبدء.' : result.state === 'scheduled' ? 'تم تسجيل الدخول. ننتظر موعد البداية.' : 'تم تسجيل الدخول. ننتظر تشغيل المسابقة من الأدمن.');
    } catch (err) {
      setError(err.message || 'تعذر التحقق من QR المسابقة');
    } finally {
      setScanning(false);
    }
  }, [qrValue, scanning, slug]);

  useEffect(() => {
    if (!qrValue) return undefined;
    const timer = window.setInterval(() => scan(), 5000);
    return () => window.clearInterval(timer);
  }, [qrValue, scan]);

  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => { if (qrValue) scan(); };
    socket.on('competition:update', refresh);
    socket.on('leaderboard:visibility', refresh);
    return () => {
      socket.off('competition:update', refresh);
      socket.off('leaderboard:visibility', refresh);
    };
  }, [qrValue, scan, socket]);

  const start = async () => {
    setError('');
    try {
      const result = await enterCompetition(competition.slug);
      if (result.finalized || result.completed) {
        setCompetition(prev => ({ ...prev, completed: true, scoreHidden: true }));
        return;
      }
      navigate(`/competition/${competition.slug}`);
    } catch (err) {
      setError(err.message || 'تعذر بدء المسابقة');
    }
  };

  return (
    <main className="page-shell dir-rtl !max-w-3xl">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
        <span className="badge-violet mx-auto mb-4"><QrCode size={14} /> بوابة دخول المسابقة</span>
        <h1 className="text-3xl font-black text-white">امسح QR ثم ابدأ من صفحة التعليمات</h1>
        <p className="mt-3 text-sm leading-7 text-[#a9a3c2]">لا يكفي مسح الكود وحده؛ لا تبدأ الجلسة إلا بعد تشغيل المسابقة ووصول موعدها.</p>
      </motion.section>

      {!competition && (
        <section className="glass-sheen glass-violet p-5 sm:p-7">
          <div className="mb-4 flex items-center justify-between text-sm font-black text-white">
            <span>المسح الإجباري</span>
            <ScanLine className="text-[#a78bfa]" size={22} />
          </div>
          <div className="h-72 overflow-hidden rounded-2xl border border-[rgba(139,92,246,0.35)] bg-black">
            <QRScanner onScan={scan} onError={() => setError('تعذر تشغيل الكاميرا. يلزم استخدام جهاز يعمل به QR للدخول.')} />
          </div>
          <p className="mt-4 text-center text-xs font-bold text-[#a9a3c2]">{notice}</p>
        </section>
      )}

      {competition && (
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="glass-sheen glass-fern space-y-5 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-5">
            <div className="text-right">
              <span className={`badge-${competition.canStart ? 'fern' : 'ember'} mb-3`}>{competition.canStart ? <CheckCircle size={13} /> : <Clock3 size={13} />}{competition.canStart ? 'جاهزة للبدء' : 'في انتظار الفتح'}</span>
              <h2 className="text-2xl font-black text-white">{competition.name}</h2>
              <p className="mt-2 text-sm leading-7 text-[#a9a3c2]">{competition.description}</p>
            </div>
            <LockKeyhole className="shrink-0 text-[#fcd34d]" size={28} />
          </div>

          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(7,6,12,0.35)] p-5 text-right">
            <h3 className="mb-2 font-black text-white">تعليمات المسابقة</h3>
            <p className="whitespace-pre-wrap text-sm leading-8 text-[#d5d0e8]">{competition.details || 'أجب عن الأسئلة مرة واحدة. كل إجابة صحيحة بنقطة، ويتم حفظ الجلسة تلقائيًا.'}</p>
            <div className="mt-4 grid gap-3 text-xs font-bold text-[#a9a3c2] sm:grid-cols-2">
              <span>الأسئلة: {competition.questionCount || 50}</span>
              <span>المدة: {competition.duration ? `${Math.ceil(competition.duration / 60)} دقيقة` : 'حسب إعداد المسابقة'}</span>
              <span>البداية: {formatDate(competition.startsAt)}</span>
              <span>النهاية العامة: {formatDate(competition.endsAt)}</span>
            </div>
          </div>

          {competition.completed ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm font-black text-emerald-300">تم تسجيل نتيجة فريقك في هذه المسابقة.</div>
          ) : (
            <button type="button" onClick={start} disabled={!competition.canStart} className="btn-ember btn-shine w-full !py-4 text-base disabled:cursor-not-allowed">
              {competition.canStart ? 'بدء المسابقة وحساب الوقت' : 'انتظر تشغيل المسابقة من الأدمن'}
            </button>
          )}
          <p className="text-center text-xs font-bold text-[#a9a3c2]">{notice}</p>
          {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm font-bold text-red-200">{error}</p>}
        </motion.section>
      )}

      {!competition && error && <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm font-bold text-red-200">{error}</p>}
    </main>
  );
};

export default CompetitionEntry;
