import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, QrCode, ScanLine, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QRScanner from '../../components/QRScanner';
import { createActivitySession, finishEasterEgg, getActivitySession, scanEasterQr } from '../../services/api';

const STORAGE_KEY = 'scout-easter-egg-session';

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

function ScannerPanel({ onScan, busy, manualValue, setManualValue, cameraMessage, setCameraMessage }) {
  return <><div className="h-72 overflow-hidden rounded-2xl border border-cyan-400/25 bg-black"><QRScanner onScan={onScan} onError={() => setCameraMessage('تعذر تشغيل الكاميرا؛ يمكنكم إدخال قيمة QR يدويًا بالأسفل.')} /></div>{cameraMessage && <p className="text-center text-xs font-bold text-amber-200">{cameraMessage}</p>}<form onSubmit={event => { event.preventDefault(); onScan(manualValue); }} className="flex flex-col gap-2 sm:flex-row"><label htmlFor="easter-qr" className="sr-only">قيمة QR</label><input id="easter-qr" value={manualValue} onChange={event => setManualValue(event.target.value)} className="input-field min-h-11 flex-1 font-mono text-left" placeholder="أدخل قيمة QR عند تعذر الكاميرا" /><button type="submit" disabled={busy || !manualValue.trim()} className="btn-ghost min-h-11 !px-5">تحقق من الكود</button></form></>;
}

const EasterEgg = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [stage, setStage] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 10 });
  const [readyToScan, setReadyToScan] = useState(true);
  const [manualValue, setManualValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [cameraMessage, setCameraMessage] = useState('');

  useEffect(() => {
    let active = true;
    const restoreOrCreate = async () => {
      const savedId = window.sessionStorage.getItem(STORAGE_KEY);
      try {
        const result = savedId ? await getActivitySession(savedId) : await createActivitySession('easter-egg');
        if (!active) return;
        const current = result.session;
        if (!savedId) window.sessionStorage.setItem(STORAGE_KEY, current.id);
        setSession(current);
        setStage(current.stage || null);
        setProgress(current.easterProgress || { current: 0, total: 10 });
        setReadyToScan(!current.easterProgress?.awaitingTask);
      } catch (error) {
        if (savedId) window.sessionStorage.removeItem(STORAGE_KEY);
        if (active) setMessage(error.message || 'تعذر بدء رحلة QR');
      }
    };
    restoreOrCreate();
    return () => { active = false; };
  }, []);

  const scan = async rawValue => {
    const qrValue = extractQrValue(rawValue);
    if (!session || !readyToScan || busy || !qrValue) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await scanEasterQr(session.id, qrValue);
      setSession(result.session);
      setStage(result.stage);
      setProgress(result.progress);
      setReadyToScan(false);
      setManualValue('');
    } catch (error) {
      setMessage(error.message || 'هذا ليس QR المرحلة المطلوبة');
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!session || busy) return;
    setBusy(true);
    try {
      const result = await finishEasterEgg(session.id);
      setSession(result.session);
      setStage(null);
      window.sessionStorage.removeItem(STORAGE_KEY);
      setMessage('انتهت الرحلة بنجاح. شكرًا على اللعب!');
    } catch (error) {
      setMessage(error.message || 'أكملوا المهمة الأخيرة أولًا');
    } finally {
      setBusy(false);
    }
  };

  const completed = session?.status === 'finished';
  const lastStage = stage?.index === progress.total - 1;
  const scannerProps = { onScan: scan, busy, manualValue, setManualValue, cameraMessage, setCameraMessage };

  return (
    <main className="page-shell dir-rtl !max-w-4xl">
      <header className="mb-8 flex items-center justify-between"><button type="button" onClick={() => navigate('/activities')} className="btn-ghost !px-4 !py-2 text-xs"><ArrowRight size={14} /> العودة</button><div className="text-right"><span className="badge-violet mb-2"><QrCode size={13} /> رحلة ميدانية</span><h1 className="text-3xl font-black text-white">Easter Egg</h1></div></header>
      <section className="glass-sheen glass-violet space-y-6 p-6 sm:p-8"><div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-right text-xs leading-7 text-amber-100"><Sparkles className="mt-1 shrink-0 text-amber-300" size={18} /><span>امسحوا الأكواد بالترتيب. بعد كل QR ستظهر مهمة متنوعة؛ نفّذوها أمام السواعد، ثم استلموا منهم الكود التالي.</span></div>
        {!session && !message && <p className="py-12 text-center text-sm font-bold text-slate-400">جاري تجهيز الرحلة...</p>}
        {message && <p className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-center text-sm font-bold text-amber-100">{message}</p>}
        {session && <>
          <div className="flex items-center justify-between border-b border-white/10 pb-4 text-xs font-black"><span className="text-slate-400">المراحل المكتملة بالمسح: {progress.current} / {progress.total}</span><span className={completed ? 'text-emerald-300' : 'text-cyan-200'}>{completed ? 'اكتملت الرحلة' : 'نشاط للمتعة فقط'}</span></div>
          {completed ? <div className="py-12 text-center"><CheckCircle2 className="mx-auto mb-4 text-emerald-400" size={48} /><h2 className="text-2xl font-black text-white">وصلتم إلى النهاية</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-slate-400">أبلغوا السواعد أن فريقكم أنهى الرحلة. لا توجد نقاط أو عملات؛ الإنجاز هو إكمال التحديات معًا.</p></div> : stage ? <div className="space-y-5"><div className="rounded-3xl border border-cyan-400/25 bg-cyan-400/10 p-5 text-right"><div className="mb-3 flex items-center justify-between gap-3"><span className="rounded-full border border-cyan-300/30 px-3 py-1 text-[10px] font-black text-cyan-100">المرحلة {stage.index + 1} · {stage.taskType}</span><ScanLine className="text-cyan-200" size={22} /></div><h2 className="text-2xl font-black text-white">{stage.title}</h2><p className="mt-4 text-sm leading-8 text-slate-200">{stage.task}</p></div><div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-right text-sm leading-7 text-slate-300"><strong className="text-amber-200">ماذا بعد؟ </strong>{stage.handoff}</div>{lastStage ? <button type="button" onClick={finish} disabled={busy} className="btn-ember w-full">{busy ? 'جاري الإنهاء...' : 'أنهِ الرحلة بعد اعتماد السواعد'}</button> : readyToScan ? <ScannerPanel {...scannerProps} /> : <button type="button" onClick={() => setReadyToScan(true)} disabled={busy} className="btn-violet w-full">جاهز لمسح QR التالي</button>}</div> : <div className="space-y-4"><div className="rounded-2xl border border-white/10 bg-black/10 p-5 text-center text-sm leading-8 text-slate-300">ابدأوا من QR المرحلة الأولى الذي يسلّمه لكم فريق السواعد.</div>{readyToScan && <ScannerPanel {...scannerProps} />}</div>}
        </>}
      </section>
    </main>
  );
};

export default EasterEgg;
