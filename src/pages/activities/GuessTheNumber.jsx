import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Copy, Crown, DoorOpen, Play, PlusCircle, Sparkles, Timer, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createActivityInvite, createActivitySession, getActivitySession, heartbeatActivitySession, setGuessSecret, startActivitySession, submitGuess } from '../../services/api';

const digits = Array.from({ length: 10 }, (_, index) => String(index));

function DeductionBoard({ targetName }) {
  const [target, setTarget] = useState(targetName);
  const [excluded, setExcluded] = useState({});
  useEffect(() => { setTarget(targetName); }, [targetName]);
  const toggle = (position, digit) => setExcluded(previous => ({ ...previous, [`${position}-${digit}`]: !previous[`${position}-${digit}`] }));
  if (!target) return null;
  return (
    <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-right">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-black text-white">لوحة تحليلك الخاصة ضد {target}</h3>
        <span className="text-[10px] text-slate-500">لا يراها باقي اللاعبين</span>
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 5 }, (_, position) => (
          <div key={position} className="flex flex-wrap items-center gap-1.5">
            <span className="w-14 text-xs font-bold text-slate-400">الخانة {position + 1}</span>
            {digits.map(digit => (
              <button
                key={digit}
                type="button"
                onClick={() => toggle(position, digit)}
                className={`h-7 w-7 rounded-lg text-xs font-mono font-black transition ${excluded[`${position}-${digit}`] ? 'bg-red-500/20 text-red-300 line-through' : 'bg-white/10 text-slate-200 hover:bg-cyan-400/20'}`}
              >
                {digit}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const GuessTheNumber = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState(null);

  const registeredScoutName = useMemo(() => {
    return user?.deviceName || localStorage.getItem('dsc_scout_name') || user?.name || '';
  }, [user]);

  const [playerName, setPlayerName] = useState(() => registeredScoutName);

  useEffect(() => {
    if (registeredScoutName && (!playerName || playerName === user?.username || playerName === user?.label)) {
      setPlayerName(registeredScoutName);
    }
  }, [registeredScoutName, user?.username, user?.label]);

  const [code, setCode] = useState('');
  const [secret, setSecret] = useState('');
  const [guessCode, setGuessCode] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState('');

  const mine = useMemo(() => session?.participants?.find(participant => participant.id === session.participantId), [session]);
  const target = session?.participants?.find(participant => participant.id === session.targetPlayerId);
  const canGuess = session?.status === 'active' && session.currentPlayerId === session.participantId && !mine?.eliminated;

  const refresh = async id => {
    const response = await getActivitySession(id);
    setSession(response.session);
    if (response.session.targetPlayerId) setSelectedTarget(response.session.targetPlayerId);
    if (response.session.status === 'active') await heartbeatActivitySession(id).catch(() => {});
  };

  useEffect(() => {
    if (playerName && playerName !== user?.username) {
      localStorage.setItem('dsc_scout_name', playerName);
    }
  }, [playerName, user?.username]);

  useEffect(() => {
    if (!session?.id || session.status === 'finished') return undefined;
    const timer = window.setInterval(() => refresh(session.id).catch(() => {}), 3000);
    return () => window.clearInterval(timer);
  }, [session?.id, session?.status]);

  const createAuto = async () => {
    if (!playerName.trim()) return setMessage('يرجى كتابة اسمك أو اسم الكشاف أولاً');
    setBusy(true); setMessage('');
    try {
      const response = await createActivitySession('guess-number', { mode: 'auto', displayName: playerName.trim() });
      setSession(response.session);
    } catch (error) {
      setMessage(error.message || 'تعذر إنشاء الجلسة');
    } finally {
      setBusy(false);
    }
  };

  const createPrivateRoom = async () => {
    if (!playerName.trim()) return setMessage('يرجى كتابة اسمك أو اسم الكشاف أولاً');
    setBusy(true); setMessage('');
    try {
      const response = await createActivitySession('guess-number', { mode: 'create_private', displayName: playerName.trim() });
      setSession(response.session);
      setMessage(`تم إنشاء الغرفة بنجاح! كود الدعوة: ${response.session.roomCode}`);
    } catch (error) {
      setMessage(error.message || 'تعذر إنشاء الغرفة الخاصة');
    } finally {
      setBusy(false);
    }
  };

  const joinByCode = async event => {
    event.preventDefault();
    if (!playerName.trim()) return setMessage('يرجى كتابة اسمك أو اسم الكشاف أولاً');
    if (!code.trim()) return setMessage('يرجى إدخال كود الغرفة');
    setBusy(true); setMessage('');
    try {
      const response = await createActivitySession('guess-number', { mode: 'code', roomCode: code.trim(), displayName: playerName.trim() });
      setSession(response.session);
    } catch (error) {
      setMessage(error.message || 'كود الغرفة غير صالح أو اللعبة بدأت بالفعل');
    } finally {
      setBusy(false);
    }
  };

  const saveSecret = async event => {
    event.preventDefault();
    if (!/^\d{5}$/.test(secret)) return setMessage('الكود السري يجب أن يكون خمس خانات من 00000 إلى 99999');
    setBusy(true);
    try {
      await setGuessSecret(session.id, secret);
      setMessage('تم حفظ كودك السري بنجاح.');
      await refresh(session.id);
    } catch (error) {
      setMessage(error.message || 'تعذر حفظ الكود');
    } finally {
      setBusy(false);
    }
  };

  const copyRoomCode = () => {
    if (!session?.roomCode) return;
    navigator.clipboard.writeText(session.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const start = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await startActivitySession(session.id);
      setSession(response.session);
    } catch (error) {
      setMessage(error.message || 'يجب على جميع اللاعبين اختيار الكود السري أولاً');
    } finally {
      setBusy(false);
    }
  };

  const sendGuess = async event => {
    event.preventDefault();
    if (!/^\d{5}$/.test(guessCode)) return setMessage('التخمين يجب أن يكون خمس خانات رقمية');
    setBusy(true);
    try {
      const response = await submitGuess(session.id, guessCode);
      setResult(response);
      setGuessCode('');
      setMessage(response.eliminated ? 'تم كشف الكود وإخراج اللاعب المستهدف! دورك مستمر.' : 'التخمين لم يكشف الكود، وانتقل الدور للاعب التالي.');
      await refresh(session.id);
    } catch (error) {
      setMessage(error.message || 'تعذر تسجيل التخمين');
    } finally {
      setBusy(false);
    }
  };

  const allReady = session?.participants?.length >= 2 && session?.participants?.every(p => p.ready);

  return (
    <main className="page-shell dir-rtl !max-w-4xl">
      <header className="mb-8 flex items-center justify-between">
        <button type="button" onClick={() => navigate('/activities')} className="btn-ghost !px-4 !py-2 text-xs">
          <ArrowRight size={14} /> العودة للأنشطة
        </button>
        <div className="text-right">
          <span className="badge-violet mb-2">
            <Users size={13} /> نشاط جماعي تفاعلي
          </span>
          <h1 className="text-3xl font-black text-white">Guess the Code</h1>
        </div>
      </header>

      {!session ? (
        <section className="glass-sheen glass-violet space-y-6 p-6 sm:p-8">
          <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 text-sm leading-7 text-violet-100 text-right">
            🎯 كل لاعب يحدد كوداً سرياً مكوناً من 5 أرقام، ثم يتبادل اللاعبون التخمين بالدور في حلقة دائرية. النظام يخبرك بعدد الخانات الصحيحة في مكانها والخانات الصحيحة في أماكن أخرى.
          </div>

          <div className="space-y-2 text-right">
            <label className="block text-xs font-bold text-slate-300">اسم اللاعب أو الكشاف (ليظهر لأعضاء الغرفة):</label>
            <input
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              className="input-field text-right font-bold text-white placeholder-slate-500"
              placeholder="مثال: يوسف، أحمد، مريم..."
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            <button
              type="button"
              disabled={busy || !playerName.trim()}
              onClick={createPrivateRoom}
              className="btn-ember flex items-center justify-center gap-2 !py-3.5"
            >
              <PlusCircle size={18} /> إنشاء غرفة خاصة (كود دعوة)
            </button>

            <button
              type="button"
              disabled={busy || !playerName.trim()}
              onClick={createAuto}
              className="btn-violet flex items-center justify-center gap-2 !py-3.5"
            >
              <Users size={18} /> مطابقة عشوائية تلقائية
            </button>
          </div>

          <div className="border-t border-white/10 pt-5">
            <p className="text-xs font-bold text-slate-400 mb-2 text-right">أو انضم لغرفة صديقك بكود الدعوة:</p>
            <form onSubmit={joinByCode} className="flex gap-2">
              <input
                value={code}
                onChange={event => setCode(event.target.value.toUpperCase())}
                className="input-field flex-1 font-mono text-center font-black tracking-widest uppercase text-amber-300"
                placeholder="أدخل كود الغرفة (مثال: DSC-8921)"
                required
              />
              <button className="btn-ghost !px-6" disabled={busy || !playerName.trim()}>
                <DoorOpen size={17} /> دخول
              </button>
            </form>
          </div>

          {message && <p className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center text-xs font-bold text-amber-200">{message}</p>}
        </section>
      ) : (
        <section className="glass-sheen glass-violet space-y-5 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Timer size={16} className="text-amber-400" />
              {session.status === 'waiting' ? 'في انتظار اللاعبين واكتمال الأكواد' : session.status === 'active' ? 'اللعبة جارية الآن ⚔️' : 'انتهت اللعبة 🏆'}
            </div>

            {session.roomCode && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">كود الغرفة:</span>
                <button
                  type="button"
                  onClick={copyRoomCode}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 font-mono text-sm font-black text-amber-300 transition hover:bg-amber-400/20"
                  title="نسخ كود الدعوة"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{session.roomCode}</span>
                  {copied && <span className="text-[10px] text-emerald-300 font-sans mr-1">تم النسخ!</span>}
                </button>
              </div>
            )}
          </div>

          {/* Participants list */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 text-right">اللاعبون في الغرفة ({session.participants.length}):</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {session.participants.map((participant, idx) => (
                <div
                  key={participant.id}
                  className={`flex items-center justify-between rounded-xl border p-3 text-sm transition ${participant.eliminated ? 'border-red-500/20 bg-red-500/5 opacity-50' : 'border-white/10 bg-black/20'}`}
                >
                  <div className="flex items-center gap-2">
                    {idx === 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-black text-amber-300" title="ليدر الغرفة">
                        <Crown size={11} /> ليدر
                      </span>
                    )}
                    <span className="font-bold text-white">{participant.displayName}</span>
                    {participant.id === session.participantId && <span className="text-[10px] text-cyan-400">(أنت)</span>}
                  </div>

                  <div className="flex items-center gap-2">
                    {participant.ready ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                        <Check size={13} /> جاهز
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">يختار الكود...</span>
                    )}
                    {participant.eliminated && <span className="text-xs font-bold text-red-400">خرج</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Waiting Room state */}
          {session.status === 'waiting' && (
            <div className="space-y-4 pt-2">
              {!mine?.ready ? (
                <form onSubmit={saveSecret} className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-5 text-right space-y-3">
                  <label className="block text-sm font-black text-white">اختر كودك السري (5 أرقام لا يعرفها أحد غيرك):</label>
                  <input
                    value={secret}
                    onChange={event => setSecret(event.target.value.replace(/\D/g, '').slice(0, 5))}
                    className="input-field text-center font-mono text-3xl tracking-[0.4em] font-black text-amber-300"
                    inputMode="numeric"
                    placeholder="•••••"
                    maxLength={5}
                    required
                  />
                  <button className="btn-ember w-full !py-3 text-sm font-black" disabled={busy}>
                    حفظ وتأكيد الكود السري 🔒
                  </button>
                </form>
              ) : (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm font-bold text-emerald-300">
                  ✓ تم حفظ كودك السري بنجاح! جاهز لبدء اللعبة.
                </div>
              )}

              {/* Leader vs Member Controls */}
              <div className="pt-2">
                {session.isHost ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={busy || !allReady}
                      onClick={start}
                      className="btn-ember w-full !py-3.5 flex items-center justify-center gap-2 text-base font-black disabled:opacity-50"
                    >
                      <Play size={18} /> بدء اللعبة الآن (بصفتك ليدر الغرفة 👑)
                    </button>
                    {!allReady && (
                      <p className="text-center text-xs text-amber-200">
                        {session.participants.length < 2 ? 'بانتظار انضمام لاعب آخر على الأقل...' : 'بانتظار أن يقوم جميع اللاعبين بحفظ أكوادهم السرية لتمكين زر البدء.'}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center text-xs leading-6 text-slate-300">
                    👑 ليدر الغرفة ({session.hostName || 'المنشئ'}) هو الوحيد المسؤول عن ضغط زر بدء اللعبة بعد اكتمال جاهزية الجميع.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Game state */}
          {session.status === 'active' && (
            <div className="space-y-4">
              <div className={`rounded-2xl border p-4 text-center text-sm font-black ${canGuess ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.15)] animate-pulse' : 'border-white/10 bg-black/20 text-slate-300'}`}>
                {canGuess ? `🔥 دورك الآن: خمن الكود السري لـ (${target?.displayName || 'اللاعب التالي'})` : `⏳ ننتظر دور اللاعب: ${session.participants.find(item => item.id === session.currentPlayerId)?.displayName || '...'}`}
              </div>

              {canGuess && (
                <form onSubmit={sendGuess} className="space-y-3 rounded-2xl border border-cyan-500/20 bg-cyan-950/30 p-4">
                  <label className="block text-xs font-bold text-slate-300 text-right">أدخل تخمينك لكود {target?.displayName}:</label>
                  <input
                    type="text"
                    pattern="[0-9]{5}"
                    inputMode="numeric"
                    maxLength={5}
                    value={guessCode}
                    onChange={event => setGuessCode(event.target.value.replace(/\D/g, '').slice(0, 5))}
                    className="input-field text-center font-mono text-3xl tracking-[0.4em] font-black text-cyan-300"
                    placeholder="•••••"
                    required
                  />
                  <button className="btn-ember w-full !py-3 font-black text-sm" disabled={busy}>
                    إرسال التخمين 🚀
                  </button>
                </form>
              )}

              <DeductionBoard targetName={target?.displayName || selectedTarget} />

              <div className="space-y-2 text-right">
                <h4 className="text-xs font-bold text-slate-400">سجل التخمينات الأخير:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(session.history || []).slice().reverse().map((item, index) => (
                    <div key={`${item.createdAt}-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <strong className="text-white">{item.attackerName}</strong> خمن كود <strong className="text-cyan-300">{item.targetName}</strong>: <span className="font-mono text-amber-300 font-black text-sm mr-1">{item.guessCode}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-emerald-300 font-bold">🎯 مكان صحيح: {item.exactCount}</span>
                        <span className="text-cyan-300 font-bold">🔄 مكان آخر: {item.misplacedCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Finished state */}
          {session.status === 'finished' && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-2">
              <Sparkles className="mx-auto text-amber-400" size={32} />
              <h2 className="text-xl font-black text-emerald-200">انتهت اللعبة!</h2>
              <p className="text-xs text-slate-300">ألف مبروك للفائز الذي استطاع حماية كوده وكشف أكواد المنافسين.</p>
              <button type="button" onClick={() => setSession(null)} className="btn-violet mt-3 !px-6 text-xs font-bold">
                لعبة جديدة
              </button>
            </div>
          )}

          {message && <p className="rounded-xl bg-white/5 border border-white/10 p-3 text-center text-xs font-bold text-amber-200">{message}</p>}
        </section>
      )}
    </main>
  );
};

export default GuessTheNumber;
