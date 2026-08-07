import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Copy, DoorOpen, Play, Timer, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createActivityInvite, createActivitySession, getActivitySession, heartbeatActivitySession, setGuessSecret, startActivitySession, submitGuess } from '../../services/api';

const digits = Array.from({ length: 10 }, (_, index) => String(index));

function DeductionBoard({ targetName }) {
  const [target, setTarget] = useState(targetName);
  const [excluded, setExcluded] = useState({});
  useEffect(() => { setTarget(targetName); }, [targetName]);
  const toggle = (position, digit) => setExcluded(previous => ({ ...previous, [`${position}-${digit}`]: !previous[`${position}-${digit}`] }));
  if (!target) return null;
  return <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-right"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-black text-white">لوحة تحليلك الخاصة ضد {target}</h3><span className="text-[10px] text-slate-500">لا يراها باقي اللاعبين</span></div><div className="grid gap-3">{Array.from({ length: 5 }, (_, position) => <div key={position} className="flex flex-wrap items-center gap-1.5"><span className="w-12 text-xs font-bold text-slate-400">الخانة {position + 1}</span>{digits.map(digit => <button key={digit} type="button" onClick={() => toggle(position, digit)} className={`h-7 w-7 rounded-lg text-xs font-mono font-black transition ${excluded[`${position}-${digit}`] ? 'bg-red-500/20 text-red-300 line-through' : 'bg-white/10 text-slate-200 hover:bg-cyan-400/20'}`}>{digit}</button>)}</div>)}</div></div>;
}

const GuessTheNumber = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [code, setCode] = useState('');
  const [secret, setSecret] = useState('');
  const [guessCode, setGuessCode] = useState('');
  const [message, setMessage] = useState('');
  const [fallbackAvailable, setFallbackAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState('');

  const mine = useMemo(() => session?.participants?.find(participant => participant.id === session.participantId), [session]);
  const target = session?.participants?.find(participant => participant.id === session.targetPlayerId);
  const canGuess = session?.status === 'active' && session.currentPlayerId === session.participantId && !mine?.eliminated;

  const refresh = async id => {
    const response = await getActivitySession(id);
    setSession(response.session);
    setFallbackAvailable(response.session.status === 'waiting' && Date.now() - new Date(response.session.createdAt).getTime() >= 60000 && !response.session.roomCode);
    if (response.session.targetPlayerId) setSelectedTarget(response.session.targetPlayerId);
    if (response.session.status === 'active') await heartbeatActivitySession(id).catch(() => {});
  };

  useEffect(() => {
    if (!session?.id || session.status === 'finished') return undefined;
    const timer = window.setInterval(() => refresh(session.id).catch(() => {}), 3000);
    return () => window.clearInterval(timer);
  }, [session?.id, session?.status]);

  const createAuto = async () => {
    setBusy(true); setMessage('');
    try { const response = await createActivitySession('guess-number', { mode: 'auto' }); setSession(response.session); setFallbackAvailable(response.fallbackAvailable); }
    catch (error) { setMessage(error.message || 'تعذر إنشاء الجلسة'); } finally { setBusy(false); }
  };

  const joinByCode = async event => {
    event.preventDefault(); setBusy(true); setMessage('');
    try { const response = await createActivitySession('guess-number', { mode: 'code', roomCode: code }); setSession(response.session); }
    catch (error) { setMessage(error.message || 'كود الغرفة غير صالح'); } finally { setBusy(false); }
  };

  const saveSecret = async event => {
    event.preventDefault();
    if (!/^\d{5}$/.test(secret)) return setMessage('الكود السري يجب أن يكون خمس خانات من 00000 إلى 99999');
    setBusy(true);
    try { await setGuessSecret(session.id, secret); setMessage('تم حفظ كودك السري بدون إظهاره للاعبين.'); await refresh(session.id); }
    catch (error) { setMessage(error.message || 'تعذر حفظ الكود'); } finally { setBusy(false); }
  };

  const createInvite = async () => {
    setBusy(true);
    try { const response = await createActivityInvite(session.id); setSession(response.session); setMessage(`كود الدعوة: ${response.roomCode}`); }
    catch (error) { setMessage(error.message || 'تعذر إنشاء كود الدعوة'); } finally { setBusy(false); }
  };

  const start = async () => {
    setBusy(true);
    try { const response = await startActivitySession(session.id); setSession(response.session); }
    catch (error) { setMessage(error.message || 'كل لاعب يجب أن يختار كوده السري أولًا'); } finally { setBusy(false); }
  };

  const sendGuess = async event => {
    event.preventDefault();
    if (!/^\d{5}$/.test(guessCode)) return setMessage('التخمين يجب أن يكون خمس خانات رقمية');
    setBusy(true);
    try { const response = await submitGuess(session.id, guessCode); setResult(response); setGuessCode(''); setMessage(response.eliminated ? 'تم كشف الكود وإخراج اللاعب المستهدف. دورك مستمر.' : 'التخمين لم يكشف الكود، وانتقل الدور.'); await refresh(session.id); }
    catch (error) { setMessage(error.message || 'تعذر تسجيل التخمين'); } finally { setBusy(false); }
  };

  return <main className="page-shell dir-rtl !max-w-4xl"><header className="mb-8 flex items-center justify-between"><button type="button" onClick={() => navigate('/activities')} className="btn-ghost !px-4 !py-2 text-xs"><ArrowRight size={14} /> العودة</button><div className="text-right"><span className="badge-violet mb-2"><Users size={13} /> نشاط جماعي</span><h1 className="text-3xl font-black text-white">Guess the Number</h1></div></header>
    {!session ? <section className="glass-sheen glass-violet space-y-5 p-6 sm:p-8"><p className="text-sm leading-8 text-slate-300">كل لاعب يختار كودًا سريًا من خمس خانات، ثم يخمن اللاعب كود اللاعب التالي في دائرة عشوائية. الرد يكون بعدد الخانات الصحيحة في أماكنها والخانات الصحيحة في أماكن مختلفة.</p><button type="button" disabled={busy} onClick={createAuto} className="btn-violet w-full"><Users size={17} /> مطابقة تلقائية</button><div className="border-t border-white/10 pt-5"><form onSubmit={joinByCode} className="flex gap-2"><input value={code} onChange={event => setCode(event.target.value.toUpperCase())} className="input-field flex-1 font-mono text-center" placeholder="كود الدعوة" required /><button className="btn-ghost !px-5" disabled={busy}><DoorOpen size={17} /> دخول</button></form></div></section> : <section className="glass-sheen glass-violet space-y-5 p-6 sm:p-8"><div className="flex items-center justify-between border-b border-white/10 pb-4"><div className="flex items-center gap-2 text-xs font-bold text-slate-400"><Timer size={15} />{session.status === 'waiting' ? 'في انتظار اللاعبين' : session.status === 'active' ? 'اللعبة بدأت' : 'انتهت'}</div><span className="font-mono text-sm text-amber-300">{session.roomCode || 'AUTO-MATCH'}</span></div><div className="grid gap-2 sm:grid-cols-2">{session.participants.map(participant => <div key={participant.id} className={`flex items-center justify-between rounded-xl border p-3 text-sm ${participant.eliminated ? 'border-red-500/20 bg-red-500/5 opacity-50' : 'border-white/10 bg-black/10'}`}><span className="font-bold text-white">{participant.displayName}{participant.ready && <Check size={14} className="mr-1 inline text-emerald-400" />}</span><span className="font-mono text-slate-400">{participant.eliminated ? 'خرج' : `${participant.score || 0} إصابة`}</span></div>)}</div>{session.status === 'waiting' && <>{!mine?.ready && <form onSubmit={saveSecret} className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4"><label className="mb-2 block text-sm font-black text-white">اختر كودك السري</label><input value={secret} onChange={event => setSecret(event.target.value.replace(/\D/g, '').slice(0, 5))} className="input-field text-center font-mono text-2xl tracking-[0.45em]" inputMode="numeric" placeholder="06804" maxLength={5} required /><button className="btn-ember mt-3 w-full" disabled={busy}>حفظ الكود السري</button></form>}<div className="flex flex-wrap gap-2">{fallbackAvailable && <button type="button" disabled={busy} onClick={createInvite} className="btn-ghost flex-1"><Copy size={16} /> إنشاء كود دعوة</button>}<button type="button" disabled={busy || session.participants.length < 3} onClick={start} className="btn-ember flex-1"><Play size={16} /> بدء اللعبة</button></div></>}{session.status === 'active' && <><div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-center text-sm font-black text-white">{canGuess ? `دورك: خمن كود ${target?.displayName || 'اللاعب التالي'}` : `ننتظر دور ${session.participants.find(item => item.id === session.currentPlayerId)?.displayName || 'لاعب آخر'}`}</div>{canGuess && <form onSubmit={sendGuess} className="space-y-3"><input type="text" pattern="[0-9]{5}" inputMode="numeric" maxLength={5} value={guessCode} onChange={event => setGuessCode(event.target.value.replace(/\D/g, '').slice(0, 5))} className="input-field text-center font-mono text-2xl tracking-[0.45em]" placeholder="12312" required /><button className="btn-ember w-full" disabled={busy}>إرسال التخمين</button></form>}<DeductionBoard targetName={target?.displayName || selectedTarget} /><div className="space-y-2">{(session.history || []).slice().reverse().map((item, index) => <div key={`${item.createdAt}-${index}`} className="rounded-xl border border-white/10 bg-black/10 p-3 text-xs text-slate-300"><b className="text-white">{item.attackerName}</b> خمن <b className="text-white">{item.targetName}</b>: <span className="font-mono text-amber-300">{item.guessCode}</span><span className="mr-3 text-emerald-300">صحيح بالمكان: {item.exactCount}</span><span className="mr-3 text-cyan-300">صحيح بمكان آخر: {item.misplacedCount}</span></div>)}</div></>}{session.status === 'finished' && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center font-black text-emerald-200">انتهت اللعبة وبقي لاعب واحد. تم حساب مكافآت الفرق.</div>}{message && <p className="rounded-xl bg-white/5 p-3 text-center text-xs font-bold text-slate-300">{message}</p>}</section>}
  </main>;
};

export default GuessTheNumber;
