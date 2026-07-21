import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Sparkles, ShieldCheck, KeyRound, Play, CheckCircle, Zap, Cpu, RefreshCw, Key, QrCode, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompetitions } from '../context/CompetitionContext';

const Activities = () => {
  const { user } = useAuth();
  const { competitions, isCompleted, validateCompetitionEntry, registerCompetitionEntry } = useCompetitions();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('competitions');
  const [selectedComp, setSelectedComp] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Games & Activities States
  const [targetColor, setTargetColor] = useState({ r: 0, g: 0, b: 0 });
  const [userColor, setUserColor] = useState({ r: 120, g: 120, b: 120 });
  const [colorMatched, setColorMatched] = useState(false);
  const [colorMatchScore, setColorMatchScore] = useState(null);

  const [hackingStage, setHackingStage] = useState(1);
  const [hackInput, setHackInput] = useState('');
  const [hackLogs, setHackLogs] = useState(['DSC Security Console initialized...', 'Target: Bank Vault Bypass']);
  const [vaultPassword, setVaultPassword] = useState('');

  const [secretCode, setSecretCode] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [guessHistory, setGuessHistory] = useState([]);
  const [codeGuessed, setCodeGuessed] = useState(false);

  const [qrStage, setQrStage] = useState(1);
  const [qrRiddleAnswer, setQrRiddleAnswer] = useState('');
  const [qrMessage, setQrMessage] = useState('');

  useEffect(() => {
    generateNewColorTarget();
    setVaultPassword(Math.floor(1000 + Math.random() * 9000).toString());
    generateSecretCode();
  }, []);

  const generateNewColorTarget = () => {
    setTargetColor({
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256),
    });
    setColorMatched(false);
    setColorMatchScore(null);
  };

  const handleColorMatchCheck = () => {
    const diffR = Math.abs(targetColor.r - userColor.r);
    const diffG = Math.abs(targetColor.g - userColor.g);
    const diffB = Math.abs(targetColor.b - userColor.b);
    const matchPercent = Math.max(0, 100 - (diffR + diffG + diffB) / 7.65);
    setColorMatchScore(matchPercent.toFixed(1));
    if (matchPercent >= 92) {
      setColorMatched(true);
    }
  };

  const generateSecretCode = () => {
    let code = '';
    while (code.length < 4) {
      const digit = Math.floor(Math.random() * 10).toString();
      if (!code.includes(digit)) code += digit;
    }
    setSecretCode(code);
    setGuessHistory([]);
    setGuessInput('');
    setCodeGuessed(false);
  };

  const handleGuessSubmit = (e) => {
    e.preventDefault();
    if (guessInput.length !== 4) return;

    let bulls = 0;
    let cows = 0;
    for (let i = 0; i < 4; i++) {
      if (guessInput[i] === secretCode[i]) {
        bulls++;
      } else if (secretCode.includes(guessInput[i])) {
        cows++;
      }
    }

    setGuessHistory([{ guess: guessInput, bulls, cows }, ...guessHistory]);
    setGuessInput('');
    if (bulls === 4) setCodeGuessed(true);
  };

  const handleHackingAction = (e) => {
    e.preventDefault();
    const command = hackInput.trim();
    setHackInput('');

    if (hackingStage === 1) {
      if (command === vaultPassword) {
        setHackLogs(prev => [...prev, `> decrypting pin: ${command}`, 'Vault passcode accepted!', 'Entering Firewall bypass stage...']);
        setHackingStage(2);
      } else {
        setHackLogs(prev => [...prev, `> auth attempt: ${command}`, 'Authentication Failed: invalid security pin.']);
      }
    } else if (hackingStage === 2) {
      if (command.toUpperCase() === 'OR') {
        setHackLogs(prev => [...prev, `> firewall_rule -g OR`, 'Rule accepted! Logic circuit unlocked.']);
        setHackingStage(3);
      } else {
        setHackLogs(prev => [...prev, `> firewall_rule -g ${command}`, 'ERROR: select the OR gate.']);
      }
    } else if (hackingStage === 3) {
      if (command.toLowerCase() === 'decode') {
        setHackLogs(prev => [...prev, `> decode --run`, 'Decryption complete! Bank vault successfully bypassed.']);
        setHackingStage(4);
      }
    }
  };

  const handleQrRiddleSubmit = (e) => {
    e.preventDefault();
    setQrMessage('');
    const ans = qrRiddleAnswer.trim().replace(/\s+/g, '');

    if (qrStage === 1) {
      if (ans.includes('المرشدة') || ans.includes('الكشافة') || ans.includes('كشافة')) {
        setQrStage(2);
        setQrRiddleAnswer('');
        setQrMessage('✅ رائع! لغز المرحلة الأولى صحيح.');
      } else {
        setQrMessage('❌ إجابة غير صحيحة، ركز في الرموز الكشفية.');
      }
    } else if (qrStage === 2) {
      if (ans.includes('البوصلة') || ans.includes('بوصلة')) {
        setQrStage(3);
        setQrRiddleAnswer('');
        setQrMessage('✅ ممتاز! حل لغز المرحلة الثانية صحيح.');
      } else {
        setQrMessage('❌ إجابة غير صحيحة، فكر في أداة تحديد الاتجاه الكشفية.');
      }
    } else if (qrStage === 3) {
      if (ans.includes('الوعد') || ans.includes('القسم') || ans.includes('وعد')) {
        setQrStage(4);
        setQrRiddleAnswer('');
        setQrMessage('🎉 تهانينا! حللت لغز القائد بالكامل بنجاح!');
      } else {
        setQrMessage('❌ إجابة غير صحيحة، ابحث عن عهد الكشافة.');
      }
    }
  };

  const handleEnterCompetition = (comp) => {
    setSelectedComp(comp);
    setPasswordInput('');
    setPasswordError('');
  };

  const handleVerifyPassword = (e) => {
    e.preventDefault();
    if (passwordInput === selectedComp.password) {
      const validation = validateCompetitionEntry(selectedComp.id, user.name);
      if (!validation.ok) {
        setPasswordError(validation.message);
        return;
      }
      registerCompetitionEntry(selectedComp.id, user.name);
      navigate(`/competition/${selectedComp.id}`);
    } else {
      setPasswordError('كلمة المرور غير صحيحة!');
    }
  };

  return (
    <main className="page-shell text-right dir-rtl">
      {/* Header */}
      <div className="glass-card mb-8 p-6 sm:p-8 rounded-3xl border border-emerald-500/20 bg-slate-950/70 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">التحديات الرقمية والميدانية</span>
            <h1 className="text-2xl font-black text-white mt-1">ساحة الأنشطة والمسابقات الكشفية</h1>
          </div>
        </div>
      </div>

      {/* Glassmorphic Tab Switcher */}
      <div className="glass-card p-1.5 rounded-2xl mb-8 border border-white/10 bg-slate-950/80 flex gap-2">
        <button
          onClick={() => setActiveTab('competitions')}
          className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 ${
            activeTab === 'competitions'
              ? 'bg-emerald-500 text-slate-950 shadow-glow-green scale-[1.02]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          مسابقات التقييم الرسمية
        </button>
        <button
          onClick={() => setActiveTab('activities')}
          className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 ${
            activeTab === 'activities'
              ? 'bg-emerald-500 text-slate-950 shadow-glow-green scale-[1.02]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          ألعاب وتحديات الأنشطة الترفيهية
        </button>
      </div>

      {/* COMPETITIONS TAB */}
      {activeTab === 'competitions' && (
        <section className="grid gap-6 sm:grid-cols-2">
          {competitions.map((comp) => {
            const completed = comp.id !== 4 && isCompleted(comp.id, user.name);
            return (
              <div
                key={comp.id}
                className={`glass-card p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between ${
                  comp.isOpen
                    ? 'border-emerald-500/30 bg-slate-950/60 shadow-lg hover:border-emerald-500/60'
                    : 'border-white/5 bg-slate-900/30 opacity-70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${
                      comp.isOpen
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                      {comp.isOpen ? 'نشط ومتاح' : 'مغلق حالياً'}
                    </span>
                    <h3 className="font-black text-white text-base">{comp.name}</h3>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-6">
                    {comp.id === 3 ? 'مسابقة كبرى مكونة من 10 دول كشفية عربية تحتوي أسئلة العواصم والعملات بمدة 30 دقيقة.' : ''}
                    {comp.id === 1 ? 'تحدى معلوماتك بالتعرف على حقيقتين كشفتين والعبارة الكاذبة.' : ''}
                    {comp.id === 2 ? 'مسابقة عبقرينو السريعة للذكاء والمعلومات كشفية الرقمية.' : ''}
                    {comp.id === 4 ? 'توليد فيديو بالذكاء الاصطناعي من خلال صياغة برومبت مبتكر ومحاكاته.' : ''}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  {completed ? (
                    <span className="text-xs text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
                      <CheckCircle size={14} /> تم التسجيل
                    </span>
                  ) : comp.isOpen ? (
                    <button
                      onClick={() => handleEnterCompetition(comp)}
                      className="command-button text-xs py-2 px-4 flex items-center gap-1.5"
                    >
                      <Play size={12} /> دخول المسابقة
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500 font-bold">في انتظار تفعيل القيادة</span>
                  )}

                  <span className="text-[11px] font-mono text-slate-400 font-bold">
                    {comp.duration ? `${comp.duration / 60} دقيقة` : 'بدون توقيت'}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Password Modal */}
          {selectedComp && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <form onSubmit={handleVerifyPassword} className="glass-card w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-950 border border-emerald-500/30 text-right">
                <div className="flex items-center justify-end gap-2 text-emerald-400 mb-3">
                  <h3 className="font-black text-lg text-white">رمز مرور المسابقة</h3>
                  <KeyRound size={22} />
                </div>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  أدخل رمز المرور المسلم لفريقك لمباشرة المسابقة فوراً.
                </p>

                <div className="mb-4">
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                    placeholder="رمز المسابقة"
                    className="ai-input text-center text-lg font-mono font-bold"
                  />
                </div>

                {passwordError && (
                  <p className="text-xs font-bold text-red-400 mb-4 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                    {passwordError}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedComp(null)}
                    className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold hover:text-white"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-1 command-button text-xs py-3"
                  >
                    بدء الاختبار
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      )}

      {/* ACTIVITIES TAB */}
      {activeTab === 'activities' && (
        <section className="space-y-6">
          {/* Color Hunt */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 bg-slate-950/60">
            <h2 className="text-base font-black text-white mb-2 flex items-center gap-2">
              Color Hunt — مطاردة الألوان
              <Sparkles size={18} className="text-amber-400" />
            </h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              طابق اللون المستهدف بتحريك مؤشرات RGB لتحقيق 92% مطابقة.
            </p>

            <div className="grid gap-6 md:grid-cols-2 items-center mb-6">
              <div className="flex justify-center gap-6">
                <div className="text-center">
                  <div
                    className="h-28 w-28 rounded-2xl border-4 border-slate-800 shadow-inner"
                    style={{ backgroundColor: `rgb(${userColor.r}, ${userColor.g}, ${userColor.b})` }}
                  />
                  <span className="text-xs font-bold text-slate-400 mt-2 block">لونك</span>
                </div>
                <div className="text-center">
                  <div
                    className="h-28 w-28 rounded-2xl border-4 border-slate-800 shadow-inner"
                    style={{ backgroundColor: `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})` }}
                  />
                  <span className="text-xs font-bold text-slate-400 mt-2 block">المستهدف</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <input
                    type="range" min="0" max="255" value={userColor.r}
                    onChange={(e) => setUserColor(prev => ({ ...prev, r: parseInt(e.target.value) }))}
                    className="w-full accent-red-500"
                  />
                </div>
                <div>
                  <input
                    type="range" min="0" max="255" value={userColor.g}
                    onChange={(e) => setUserColor(prev => ({ ...prev, g: parseInt(e.target.value) }))}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <input
                    type="range" min="0" max="255" value={userColor.b}
                    onChange={(e) => setUserColor(prev => ({ ...prev, b: parseInt(e.target.value) }))}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              {colorMatchScore && (
                <span className={`text-xs font-bold ${colorMatched ? 'text-emerald-400' : 'text-amber-400'}`}>
                  المطابقة: {colorMatchScore}%
                </span>
              )}
              <button
                onClick={handleColorMatchCheck}
                disabled={colorMatched}
                className="command-button text-xs py-2 px-5"
              >
                فحص النسبة
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default Activities;
