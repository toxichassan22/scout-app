import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Sparkles, ShieldCheck, KeyRound, Play, CheckCircle, Zap, ShieldAlert, Cpu, RefreshCw, Terminal, HelpCircle, Key, QrCode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompetitions } from '../context/CompetitionContext';

const Activities = () => {
  const { user } = useAuth();
  const { competitions, isCompleted, validateCompetitionEntry, registerCompetitionEntry } = useCompetitions();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('competitions'); // 'competitions' | 'activities'
  const [selectedComp, setSelectedComp] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // ----------------------------------------------------
  // Games & Activities States
  // ----------------------------------------------------

  // 1. Color Hunt State
  const [targetColor, setTargetColor] = useState({ r: 0, g: 0, b: 0 });
  const [userColor, setUserColor] = useState({ r: 120, g: 120, b: 120 });
  const [colorMatched, setColorMatched] = useState(false);
  const [colorMatchScore, setColorMatchScore] = useState(null);

  // 2. Easter Egg State
  const [easterEggUnlocked, setEasterEggUnlocked] = useState(false);

  // 3. Cyber Security Hacking Game
  const [hackingStage, setHackingStage] = useState(1); // 1, 2, 3, 4 (completed)
  const [hackInput, setHackInput] = useState('');
  const [hackLogs, setHackLogs] = useState(['DSC Security Console initialized...', 'Target: Bank Vault Bypass']);
  const [vaultPassword, setVaultPassword] = useState('');
  const [logicGate, setLogicGate] = useState('AND');

  // 4. Code Guess (Mastermind)
  const [secretCode, setSecretCode] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [guessHistory, setGuessHistory] = useState([]);
  const [codeGuessed, setCodeGuessed] = useState(false);

  // 5. Leader QR Clues flow (Stage 1 -> riddle -> Stage 2 -> riddle -> Stage 3)
  const [qrStage, setQrStage] = useState(1);
  const [qrRiddleAnswer, setQrRiddleAnswer] = useState('');
  const [qrMessage, setQrMessage] = useState('');

  // Initialize mini-games
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

    const newHistory = [{ guess: guessInput, bulls, cows }, ...guessHistory];
    setGuessHistory(newHistory);
    setGuessInput('');

    if (bulls === 4) {
      setCodeGuessed(true);
    }
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
        setHackLogs(prev => [...prev, `> auth attempt: ${command}`, 'Authentication Failed: invalid security pin. Try another 4-digit code.']);
      }
    } else if (hackingStage === 2) {
      if (command.toUpperCase() === 'OR') {
        setHackLogs(prev => [...prev, `> firewall_rule -g OR`, 'Rule accepted! Logic circuit unlocked.', 'Moving to decoding decrypter stage...']);
        setHackingStage(3);
      } else {
        setHackLogs(prev => [...prev, `> firewall_rule -g ${command}`, 'ERROR: short circuit detected. Firewall logic invalid. Hint: select the OR gate.']);
      }
    } else if (hackingStage === 3) {
      if (command.toLowerCase() === 'decode') {
        setHackLogs(prev => [...prev, `> decode --run`, 'Decryption complete! Bank vault successfully bypassed.', 'Flag: DSC_SEC_CON_PASSED']);
        setHackingStage(4);
      } else {
        setHackLogs(prev => [...prev, `> ${command}`, 'Command not recognized. Type "decode" to run encryption bypass matrix.']);
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
        setQrMessage('✅ رائع! لغز المرحلة الأولى صحيح. إليك تلميح المرحلة الثانية.');
      } else {
        setQrMessage('❌ إجابة غير صحيحة، حاول التركيز في معاني الرموز الكشفية.');
      }
    } else if (qrStage === 2) {
      if (ans.includes('البوصلة') || ans.includes('بوصلة')) {
        setQrStage(3);
        setQrRiddleAnswer('');
        setQrMessage('✅ ممتاز! حل لغز المرحلة الثانية صحيح. لقد فتحت اللغز الأخير.');
      } else {
        setQrMessage('❌ إجابة غير صحيحة، فكر في أداة تحديد الاتجاه الكشفية.');
      }
    } else if (qrStage === 3) {
      if (ans.includes('الوعد') || ans.includes('القسم') || ans.includes('وعد')) {
        setQrStage(4);
        setQrRiddleAnswer('');
        setQrMessage('🎉 تهانينا! لقد وصلت للهدف وحللت لغز القائد بالكامل بنجاح!');
      } else {
        setQrMessage('❌ إجابة غير صحيحة، ابحث عن عهد الكشافة الذي يبدأ به مسيرته.');
      }
    }
  };

  // ----------------------------------------------------
  // Password-lock Entry for Competitions
  // ----------------------------------------------------
  const handleEnterCompetition = (comp) => {
    setSelectedComp(comp);
    setPasswordInput('');
    setPasswordError('');
  };

  const handleVerifyPassword = (e) => {
    e.preventDefault();
    if (passwordInput === selectedComp.password) {
      // Direct validation
      const validation = validateCompetitionEntry(selectedComp.id, user.name);
      if (!validation.ok) {
        setPasswordError(validation.message);
        return;
      }
      registerCompetitionEntry(selectedComp.id, user.name);
      navigate(`/competition/${selectedComp.id}`);
    } else {
      setPasswordError('كلمة المرور غير صحيحة! حاول مجدداً.');
    }
  };

  return (
    <main className="page-shell">
      {/* Page Header */}
      <div className="tech-panel mb-6 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-primary">
            <Sparkles size={26} />
          </div>
          <div className="text-right">
            <p className="section-kicker">تحديات وألعاب</p>
            <h1 className="section-title">المسابقات والأنشطة</h1>
            <p className="mt-1 text-sm text-slate-400">تحديات تقييم المهرجان بالإضافة إلى ألعاب ترفيهية تفاعلية للفرق.</p>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex rounded-xl bg-slate-950 p-1 mb-6 border border-slate-800">
        <button
          onClick={() => setActiveTab('activities')}
          className={`flex-1 rounded-lg py-3 text-sm font-black transition-all ${
            activeTab === 'activities' ? 'bg-primary text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          ألعاب الأنشطة الترفيهية
        </button>
        <button
          onClick={() => setActiveTab('competitions')}
          className={`flex-1 rounded-lg py-3 text-sm font-black transition-all ${
            activeTab === 'competitions' ? 'bg-primary text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          مسابقات التقييم الرسمية
        </button>
      </div>

      {/* ────────────────────────────────────────────────── */}
      {/* COMPETITIONS TAB */}
      {/* ────────────────────────────────────────────────── */}
      {activeTab === 'competitions' && (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {competitions.map((comp) => {
              const completed = comp.id !== 4 && isCompleted(comp.id, user.name);
              return (
                <article
                  key={comp.id}
                  className={`card text-right transition duration-300 ${
                    comp.isOpen ? 'border-primary/40 bg-slate-950/80 shadow-glow-green hover:scale-[1.01]' : 'border-slate-800 bg-slate-950/30 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                    <span className={`status-badge ${comp.isOpen ? 'status-badge-open' : 'status-badge-locked'}`}>
                      {comp.isOpen ? 'نشط حالياً' : 'مغلق'}
                    </span>
                    <h3 className="font-extrabold text-base text-white">{comp.name}</h3>
                  </div>

                  <p className="text-xs text-slate-400 leading-6 mb-5">
                    {comp.id === 3 ? 'مسابقة كبرى مكونة من 10 دول كشفية عربية تحتوي أسئلة العواصم، العملات، العلم، القارة ونظام الحكم بمدة 30 دقيقة.' : ''}
                    {comp.id === 1 ? 'تحدى معلومات زملائك بالتعرف على حقيقتين كشفتين والعبارة الكاذبة من بين الخيارات.' : ''}
                    {comp.id === 2 ? 'مسابقة عبقرينو السريعة للذكاء والمعلومات والسرعة في الاختيار.' : ''}
                    {comp.id === 4 ? 'توليد فيديو بالذكاء الاصطناعي من خلال صياغة برومبت مبتكر ومحاكاته.' : ''}
                  </p>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    {completed ? (
                      <span className="text-xs text-emerald-400 font-bold border border-emerald-500/20 bg-emerald-500/10 rounded-full px-3 py-1 flex items-center gap-1.5">
                        <CheckCircle size={14} />
                        تم التسجيل
                      </span>
                    ) : comp.isOpen ? (
                      <button
                        onClick={() => handleEnterCompetition(comp)}
                        className="rounded-lg border border-primary bg-primary-soft/10 text-primary hover:bg-primary text-xs font-black px-4 py-2 transition active:scale-95 flex items-center gap-1.5 hover:text-slate-950"
                      >
                        <Play size={12} />
                        دخول المسابقة
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500 font-bold">انتظر تفعيل الأدمن</span>
                    )}

                    <span className="text-[11px] text-slate-500 font-bold font-mono">
                      {comp.duration ? `المدة: ${comp.duration / 60} دقيقة` : 'بدون وقت محدد'}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Password Protection dialog */}
          {selectedComp && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <form onSubmit={handleVerifyPassword} className="card w-full max-w-md text-right border-primary p-6 bg-slate-950">
                <div className="flex items-center justify-end gap-2 text-primary mb-4">
                  <h3 className="font-extrabold text-lg">بوابة الدخول الآمن للمسابقات</h3>
                  <KeyRound size={22} className="animate-bounce" />
                </div>
                <p className="text-xs text-slate-400 mb-5 leading-6">
                  المسابقة محمية برمز مرور. يرجى كتابة رمز المسابقة المسلم إليكم من المشرف لبدء الوقت فوراً.
                </p>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-400 mb-2">كلمة المرور للمسابقة</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                    placeholder="أدخل الرمز السري"
                    className="input-field text-center font-bold"
                  />
                </div>

                {passwordError && (
                  <p className="text-xs font-bold text-red-400 mb-4 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
                    {passwordError}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedComp(null)}
                    className="flex-1 rounded-xl bg-slate-900 border border-slate-800 py-3 font-bold text-slate-400 text-xs hover:text-white"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-primary py-3 font-black text-slate-950 text-xs hover:shadow-glow-green"
                  >
                    دخول الآن
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      )}

      {/* ────────────────────────────────────────────────── */}
      {/* ACTIVITIES TAB */}
      {/* ────────────────────────────────────────────────── */}
      {activeTab === 'activities' && (
        <section className="space-y-8">

          {/* 1. Color Hunt Activity */}
          <article className="card text-right border-slate-800 bg-slate-950/40 p-6 relative">
            <div className="absolute top-0 right-0 h-1.5 w-1.5 border-r border-t border-primary" />
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <span className="text-xs text-primary font-bold bg-primary/10 px-3 py-1 rounded-full">تحدي بصري</span>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Color Hunt — مطاردة الألوان
                <Sparkles className="text-amber-500" />
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-6 mb-6">
              حرك مؤشرات الأحمر والأخضر والأزرق (RGB) لتكوين لون يطابق تماماً اللون المستهدف المعروض بالأسفل. يجب تحقيق نسبة مطابقة لا تقل عن 92% لتجاوز التحدي!
            </p>

            <div className="grid gap-6 md:grid-cols-2 items-center mb-6">
              {/* Color previews */}
              <div className="flex gap-4 items-center justify-center">
                <div className="text-center">
                  <div
                    className="h-28 w-28 rounded-2xl border-4 border-slate-800 shadow-inner"
                    style={{ backgroundColor: `rgb(${userColor.r}, ${userColor.g}, ${userColor.b})` }}
                  />
                  <p className="text-xs font-bold text-slate-400 mt-2">لونك الحالي</p>
                </div>
                <div className="text-center">
                  <div
                    className="h-28 w-28 rounded-2xl border-4 border-slate-800 shadow-inner"
                    style={{ backgroundColor: `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})` }}
                  />
                  <p className="text-xs font-bold text-slate-400 mt-2">اللون المستهدف</p>
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-mono font-bold mb-1">
                    <span className="text-red-500">{userColor.r}</span>
                    <span className="text-slate-400">الأحمر (Red)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={userColor.r}
                    onChange={(e) => setUserColor(prev => ({ ...prev, r: parseInt(e.target.value) }))}
                    className="w-full accent-red-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-mono font-bold mb-1">
                    <span className="text-emerald-500">{userColor.g}</span>
                    <span className="text-slate-400">الأخضر (Green)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={userColor.g}
                    onChange={(e) => setUserColor(prev => ({ ...prev, g: parseInt(e.target.value) }))}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-mono font-bold mb-1">
                    <span className="text-blue-500">{userColor.b}</span>
                    <span className="text-slate-400">الأزرق (Blue)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={userColor.b}
                    onChange={(e) => setUserColor(prev => ({ ...prev, b: parseInt(e.target.value) }))}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 flex-wrap gap-2">
              {colorMatchScore && (
                <div className={`text-sm font-black ${colorMatched ? 'text-primary' : 'text-amber-500'}`}>
                  {colorMatched ? `🎉 مبروك! نسبة المطابقة: ${colorMatchScore}%` : `النسبة الحالية: ${colorMatchScore}%`}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={generateNewColorTarget}
                  className="rounded-lg border border-slate-800 bg-white/5 text-slate-300 hover:text-white px-4 py-2 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RefreshCw size={12} />
                  لون جديد
                </button>
                <button
                  onClick={handleColorMatchCheck}
                  disabled={colorMatched}
                  className="rounded-lg bg-primary text-slate-950 px-5 py-2 text-xs font-black transition disabled:opacity-50 hover:shadow-glow-green"
                >
                  تحقق من المطابقة
                </button>
              </div>
            </div>
          </article>

          {/* 2. Cyber Hacking Game */}
          <article className="card text-right border-slate-800 bg-slate-950/40 p-6 relative">
            <div className="absolute top-0 right-0 h-1.5 w-1.5 border-r border-t border-red-500" />
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <span className="text-xs text-red-500 font-bold bg-red-500/10 px-3 py-1 rounded-full">محاكي الهكر</span>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Cyber Security Bank Hacking Simulation
                <Cpu className="text-red-500 animate-pulse" />
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-6 mb-5">
              مراحل محاكاة الأمن السيبراني: تخطي الدفاعات الأمنية لبنك افتراضي. اتبع موجهات الـ Terminal لتعطيل الفايروال.
            </p>

            <div className="rounded-xl border border-slate-800 bg-black p-4 mb-5 font-mono text-left text-xs leading-6 text-slate-300 h-44 overflow-y-auto">
              {hackLogs.map((log, idx) => (
                <div key={idx} className={log.startsWith('>') ? 'text-primary' : log.includes('Success') || log.includes('accepted') ? 'text-emerald-400 font-bold' : log.includes('Failed') ? 'text-red-400' : 'text-slate-400'}>
                  {log}
                </div>
              ))}
            </div>

            {hackingStage < 4 ? (
              <form onSubmit={handleHackingAction} className="flex gap-2">
                <button type="submit" className="rounded-lg bg-red-500 text-black font-black text-xs px-5 py-2 whitespace-nowrap">
                  إرسال الأمر
                </button>
                {hackingStage === 1 && (
                  <input
                    type="text"
                    value={hackInput}
                    onChange={(e) => setHackInput(e.target.value)}
                    placeholder={`أدخل الرقم السري للvault المكون من 4 أرقام. تلميح: ${vaultPassword}`}
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-white text-right"
                  />
                )}
                {hackingStage === 2 && (
                  <input
                    type="text"
                    value={hackInput}
                    onChange={(e) => setHackInput(e.target.value)}
                    placeholder="أدخل اسم البوابة المنطقية لكسر Firewall. الخيارات: (AND, OR, NOT) - تلميح: OR"
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-white text-right"
                  />
                )}
                {hackingStage === 3 && (
                  <input
                    type="text"
                    value={hackInput}
                    onChange={(e) => setHackInput(e.target.value)}
                    placeholder='اكتب كلمة "decode" لفك التشفير النهائي'
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-white text-right"
                  />
                )}
              </form>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center text-emerald-400 font-black text-sm">
                🎉 تم تخطي وتأمين البنك بنجاح كامل!
              </div>
            )}
          </article>

          {/* 3. Code Guess (Mastermind) */}
          <article className="card text-right border-slate-800 bg-slate-950/40 p-6 relative">
            <div className="absolute top-0 right-0 h-1.5 w-1.5 border-r border-t border-purple-500" />
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <span className="text-xs text-purple-500 font-bold bg-purple-500/10 px-3 py-1 rounded-full">تحدي فكري</span>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Code Guess — لغز تخمين الرمز السري
                <Key className="text-purple-500" />
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-6 mb-5">
              خمن الرقم السري المكون من 4 أرقام فريدة ومختلفة. سنعطيك معلومات: (Bulls) الأرقام الصحيحة في مكانها الصحيح، و(Cows) الأرقام الصحيحة في مكان خاطئ.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                {!codeGuessed ? (
                  <form onSubmit={handleGuessSubmit} className="flex gap-2">
                    <button type="submit" className="rounded-lg bg-purple-500 text-white font-black text-xs px-5 py-2.5">
                      تخمين
                    </button>
                    <input
                      type="text"
                      maxLength="4"
                      value={guessInput}
                      onChange={(e) => setGuessInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="اكتب 4 أرقام مختلفة"
                      className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-center font-bold text-sm tracking-widest text-white"
                    />
                  </form>
                ) : (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center text-emerald-400 font-black text-sm">
                    🎉 أحسنت! خمنت الرمز بنجاح: {secretCode}
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={generateSecretCode}
                    className="rounded-lg border border-slate-800 bg-white/5 text-slate-300 hover:text-white px-4 py-2 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} />
                    إعادة اللعب ورمز جديد
                  </button>
                </div>
              </div>

              {/* History Table */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-3 max-h-40 overflow-y-auto">
                <p className="text-[10px] font-bold text-slate-500 mb-2 border-b border-slate-800 pb-1.5 text-center">سجل المحاولات</p>
                {guessHistory.length === 0 ? (
                  <p className="text-[11px] text-slate-600 text-center py-4">ابدأ كتابة التخمينات</p>
                ) : (
                  <div className="space-y-1">
                    {guessHistory.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] font-mono p-1 bg-white/[0.01] rounded">
                        <span className="text-slate-400">Bulls: {item.bulls} | Cows: {item.cows}</span>
                        <span className="text-purple-400 font-bold">{item.guess}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>

          {/* 4. Leader QR riddle flow */}
          <article className="card text-right border-slate-800 bg-slate-950/40 p-6 relative">
            <div className="absolute top-0 right-0 h-1.5 w-1.5 border-r border-t border-amber-500" />
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <span className="text-xs text-amber-500 font-bold bg-amber-500/10 px-3 py-1 rounded-full">خاص بقادة الوفود</span>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Leader QR clues — مسار ألغاز القادة المتتابع
                <QrCode className="text-amber-500" />
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-6 mb-5">
              كل قائد وفد يمسح QR ويبدأ بحل الألغاز. حل لغز المرحلة يفتح المرحلة التالية تلقائياً حتى الوصول للهدف النهائي.
            </p>

            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 mb-5 text-right">
              {qrStage === 1 && (
                <>
                  <div className="flex items-center justify-end gap-2 text-amber-500 mb-2 font-bold text-sm">
                    <span>لغز المرحلة 1: شارة الرموز</span>
                    <HelpCircle size={16} />
                  </div>
                  <p className="text-xs text-slate-300 leading-6 mb-4">
                    "ما هي الشارة التي تمنح للكشاف عند إتمام عهد ومبادئ الحركة الكشفية للفتيان والفتيات؟"
                  </p>
                </>
              )}
              {qrStage === 2 && (
                <>
                  <div className="flex items-center justify-end gap-2 text-amber-500 mb-2 font-bold text-sm">
                    <span>لغز المرحلة 2: تحديد المسار</span>
                    <HelpCircle size={16} />
                  </div>
                  <p className="text-xs text-slate-300 leading-6 mb-4">
                    "أداة دائرية ذات إبرة مغناطيسية تحدد اتجاه القبلة والشمال المغناطيسي، لا يستغني عنها قائد الرحلة الخلوية الكشفية. ما هي؟"
                  </p>
                </>
              )}
              {qrStage === 3 && (
                <>
                  <div className="flex items-center justify-end gap-2 text-amber-500 mb-2 font-bold text-sm">
                    <span>لغز المرحلة 3: شرف الكشاف</span>
                    <HelpCircle size={16} />
                  </div>
                  <p className="text-xs text-slate-300 leading-6 mb-4">
                    "العهد الذي يقطعه الكشاف على نفسه ويشمل الواجب نحو الله والوطن ومساعدة الناس، ويبدأ بـ 'أعد بشرفي أن...' ما اسم هذا العهد؟"
                  </p>
                </>
              )}
              {qrStage === 4 && (
                <div className="text-center py-6">
                  <p className="text-emerald-400 font-extrabold text-base mb-2">🎉 تهانينا لقائد الوفد!</p>
                  <p className="text-xs text-slate-300 leading-6">لقد تجاوزت كافة ألغاز القادة وتم إرسال تأكيد الاسكان للأدمن بنجاح.</p>
                </div>
              )}

              {qrStage < 4 && (
                <form onSubmit={handleQrRiddleSubmit} className="space-y-4">
                  <input
                    type="text"
                    value={qrRiddleAnswer}
                    onChange={(e) => setQrRiddleAnswer(e.target.value)}
                    required
                    placeholder="اكتب الإجابة هنا..."
                    className="input-field text-right"
                  />
                  <button type="submit" className="rounded-lg bg-amber-500 text-slate-950 font-black text-xs px-5 py-2">
                    إرسال الإجابة لتنشيط المرحلة التالية
                  </button>
                </form>
              )}

              {qrMessage && (
                <p className={`text-xs font-bold mt-4 p-2.5 rounded-lg border ${
                  qrMessage.includes('✅') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {qrMessage}
                </p>
              )}
            </div>
          </article>

          {/* 5. Easter Egg Hidden Area */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                setEasterEggUnlocked(true);
                alert("🥚 لقد عثرت على البيضة المخفية (Easter Egg)! مبروك لفريقك الحصول على وسام المستكشف الرقمي الخفي!");
              }}
              className="text-[9px] text-slate-800 hover:text-primary transition-colors cursor-pointer border border-transparent hover:border-slate-800 rounded p-1"
            >
              SECRET_ZONE_DO_NOT_CLICK
            </button>
          </div>

          {easterEggUnlocked && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center text-emerald-400 font-black text-sm max-w-sm mx-auto animate-bounce">
              ⭐ وسام المستكشف الرقمي الخفي مفعل!
            </div>
          )}

        </section>
      )}
    </main>
  );
};

export default Activities;
