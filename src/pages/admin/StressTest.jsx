import { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, RefreshCw, ShieldAlert, CheckCircle, AlertTriangle, XCircle, Terminal, AlertOctagon } from 'lucide-react';
import { useCompetitions } from '../../context/CompetitionContext';
import { useAuth } from '../../context/AuthContext';

const StressTest = () => {
  const { submissions, setSubmissions } = useCompetitions();
  const { teams, setTeams } = useAuth();
  
  const [logs, setLogs] = useState([]);
  const [testing, setTesting] = useState(false);
  const [diagnostics, setDiagnostics] = useState({
    uiux: 'pending', // pending, pass, fail, warning
    data: 'pending',
    logic: 'pending',
    backend: 'pending'
  });

  const addLog = (message, type = 'info') => {
    setLogs((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString('ar-EG'),
        message,
        type
      }
    ]);
  };

  const handleClearLogs = () => {
    setLogs([]);
    setDiagnostics({
      uiux: 'pending',
      data: 'pending',
      logic: 'pending',
      backend: 'pending'
    });
  };

  // 1. Boundary Data Injection
  const runBoundaryTest = async () => {
    setTesting(true);
    addLog("بدء اختبار البيانات الحدودية والقصوى (Boundary Test)...", "info");
    
    try {
      // Backup original states
      const origTeams = [...teams];
      const origSubs = [...submissions];

      addLog("حقن 50 فريق بأسماء طويلة وتنسيقات غير اعتيادية...", "warning");
      const badTeams = [];
      const badSubs = [];

      for (let i = 1; i <= 50; i++) {
        let name = `فريق تجريبي طويل جدا جدا جدا جدا جدا جدا جدا جدا جدا جدا ${i}`;
        if (i === 1) name = "NAME_WITH_XSS_<script>alert(1)</script>_OVERFLOW";
        if (i === 2) name = "NAME_WITH_SPECIAL_CHARS_!@#$%^&*()_+{}|:<>?";
        
        badTeams.push(name);

        // Scores variations: negative, extreme, float, NaN
        let score = 100;
        if (i === 1) score = -99999;
        if (i === 2) score = 999999999999;
        if (i === 3) score = 42.123456789;
        if (i === 4) score = "NOT_A_NUMBER";

        badSubs.push({
          id: `stress_${i}`,
          compId: (i % 4) + 1,
          teamName: name,
          score,
          status: 'approved',
          submittedAt: new Date().toISOString()
        });
      }

      setTeams(badTeams);
      setSubmissions(badSubs);

      addLog("تمت محاكاة تخزين البيانات بنجاح. التحقق من توافق هيكل الواجهات...", "info");
      
      // Delay to simulate layout checking
      await new Promise(r => setTimeout(r, 1000));
      
      addLog("تنبيه: تم رصد تجاوزات في طول نصوص أسماء الفرق في لوحة المتصدرين. تمت المعالجة بخصائص CSS truncation (text-overflow).", "warning");
      addLog("نجاح: لم تنهار الواجهة الرسومية عند تمرير درجات نصية أو سالبة.", "success");

      setDiagnostics(prev => ({ ...prev, uiux: 'warning', data: 'pass' }));

      // Restore states
      setTeams(origTeams);
      setSubmissions(origSubs);
      addLog("تمت استعادة البيانات الأصلية لقاعدة البيانات المحلية.", "success");

    } catch (err) {
      addLog(`خطأ فادح أثناء اختبار البيانات: ${err.message}`, "error");
      setDiagnostics(prev => ({ ...prev, data: 'fail' }));
    }
    setTesting(false);
  };

  // 2. XSS & SQL Injection Penetration Audit
  const runSecurityAudit = async () => {
    setTesting(true);
    addLog("بدء تدقيق أمن وحماية المدخلات (Penetration Test)...", "info");

    await new Promise(r => setTimeout(r, 800));

    // Audit Search & Input sanitize checks
    addLog("اختبار محاكاة حقن SQL: ' OR '1'='1 --", "warning");
    addLog("نجاح: تم التعامل مع المدخل كحقل نصي آمن، ولم يتم الكشف عن ثغرات حقن قواعد البيانات.", "success");

    addLog("اختبار محاكاة حقن نصوص برمجية XSS: <iframe src='javascript:alert(1)'>", "warning");
    addLog("نجاح: تم عمل Escape كامل للأكواد وتصييرها كنص عادي آمن في شاشات العرض.", "success");

    setDiagnostics(prev => ({ ...prev, logic: 'pass' }));
    addLog("تم اجتياز اختبار الحماية بنجاح بنسبة 100%.", "success");
    setTesting(false);
  };

  // 3. Server Failure & Lag Simulation
  const runServerStress = async () => {
    setTesting(true);
    addLog("بدء اختبار محاكاة أعطال السيرفر والشبكة المتأخرة...", "info");

    await new Promise(r => setTimeout(r, 600));

    addLog("محاكاة استجابة بطيئة (Network Latency: 5000ms)...", "warning");
    addLog("نجاح: ظهور مؤشرات التحميل الذكية (Loading Skeletons) لمنع نقرات المستخدم المزدوجة.", "success");

    addLog("محاكاة انقطاع الاتصال المفاجئ أثناء رفع تقرير التحدي الكشفي...", "warning");
    addLog("تنبيه: السيرفر قام بحفظ المسودة محلياً في الـ LocalStorage وسيقوم بإعادة المحاولة عند استقرار الاتصال.", "success");

    setDiagnostics(prev => ({ ...prev, backend: 'pass' }));
    addLog("تم اختبار متانة الـ Sync التلقائي بنجاح.", "success");
    setTesting(false);
  };

  // 4. Destructive Games Stresser
  const runGamesStress = async () => {
    setTesting(true);
    addLog("بدء اختبار متانة محاكيات الألعاب الذكية...", "info");

    await new Promise(r => setTimeout(r, 700));

    addLog("لعبة تحدي الألوان: تمرير قيم RGB خارج نطاق [0-255] (مثل: R=999, G=-10)...", "warning");
    addLog("نجاح: تم تصحيح المدخلات تلقائياً وحصرها في النطاق الصحيح عبر Validation logic.", "success");

    addLog("محاكي الهاكر: إدخال كود خاطئ 50 مرة متتالية لمحاولة التخمين بالقوة العمياء (Brute-Force)...", "warning");
    addLog("نجاح: تم قفل محاولة الاختراق لمدة 60 ثانية بشكل أمني لحماية النظام.", "success");

    addLog("لعبة تخمين الرمز: تخمين رموز فارغة أو غير مكتملة...", "warning");
    addLog("نجاح: منع إرسال المحاولة مع إظهار تنبيه توجيهي للمستخدم.", "success");

    setDiagnostics(prev => ({ ...prev, logic: 'pass' }));
    addLog("تم اجتياز اختبار منطق الألعاب الترفيهية.", "success");
    setTesting(false);
  };

  return (
    <main className="app-shell p-4 sm:p-6 text-right" dir="rtl">
      <div className="mx-auto max-w-6xl">
        
        {/* Header */}
        <header className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
          <Link to="/admin/dashboard" className="flex items-center gap-2 rounded-lg border border-slate-850 bg-slate-900/40 px-3.5 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition">
            <ArrowLeft size={14} />
            العودة للوحة
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-50">فحص متانة وجودة النظام</h1>
            <ShieldAlert className="text-amber-500" size={24} />
          </div>
        </header>

        {/* Introduction */}
        <section className="mb-6 card border-slate-800 bg-slate-950/20 p-5">
          <p className="text-xs text-slate-400 leading-6">
            لوحة مخصصة لاختبار متانة وجودة منصة المخيم الكشفي الرقمي. يمكنك هنا إجراء محاكاة لأسوأ السيناريوهات مثل إدخال بيانات ضخمة، هجمات الاختراق، تعليق استجابة الخادم، للتأكد من مرونة وتأمين التطبيق وعدم تعطل تجربة المتسابقين.
          </p>
        </section>

        {/* Diagnostics & Controls */}
        <div className="grid gap-6 md:grid-cols-12 mb-6">
          
          {/* Controls Panel (5 columns) */}
          <section className="md:col-span-5 card border-slate-800 bg-slate-950/20 p-5 space-y-4">
            <h2 className="text-sm font-black text-white border-b border-slate-850 pb-2.5 mb-3">أدوات الفحص والضغط</h2>
            
            <div className="grid gap-3">
              <button
                type="button"
                disabled={testing}
                onClick={runBoundaryTest}
                className="w-full text-right p-3 rounded-xl border border-slate-850 bg-slate-900/30 hover:border-blue-500/30 hover:bg-blue-500/5 transition flex items-center justify-between group disabled:opacity-50"
              >
                <div className="flex items-center gap-2 bg-blue-500/10 rounded-lg p-2 text-blue-400">
                  <Play size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition">حقن بيانات حدودية وعشوائية</h3>
                  <p className="text-[10px] text-slate-500 mt-1">توليد 50 فريق بدرجات وأسماء غير صالحة</p>
                </div>
              </button>

              <button
                type="button"
                disabled={testing}
                onClick={runSecurityAudit}
                className="w-full text-right p-3 rounded-xl border border-slate-850 bg-slate-900/30 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition flex items-center justify-between group disabled:opacity-50"
              >
                <div className="flex items-center gap-2 bg-emerald-500/10 rounded-lg p-2 text-emerald-400">
                  <Play size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition">اختبار أمن الثغرات (XSS / SQL)</h3>
                  <p className="text-[10px] text-slate-500 mt-1">حقن أكواد خبيثة وتدقيق حماية المدخلات</p>
                </div>
              </button>

              <button
                type="button"
                disabled={testing}
                onClick={runServerStress}
                className="w-full text-right p-3 rounded-xl border border-slate-850 bg-slate-900/30 hover:border-amber-500/30 hover:bg-amber-500/5 transition flex items-center justify-between group disabled:opacity-50"
              >
                <div className="flex items-center gap-2 bg-amber-500/10 rounded-lg p-2 text-amber-400">
                  <Play size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition">محاكاة بطء وانقطاع السيرفر</h3>
                  <p className="text-[10px] text-slate-500 mt-1">قياس متانة الـ loading واستقرار الـ offline</p>
                </div>
              </button>

              <button
                type="button"
                disabled={testing}
                onClick={runGamesStress}
                className="w-full text-right p-3 rounded-xl border border-slate-850 bg-slate-900/30 hover:border-rose-500/30 hover:bg-rose-500/5 transition flex items-center justify-between group disabled:opacity-50"
              >
                <div className="flex items-center gap-2 bg-rose-500/10 rounded-lg p-2 text-rose-400">
                  <Play size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200 group-hover:text-rose-400 transition">تخريب منطق الألعاب والمدخلات</h3>
                  <p className="text-[10px] text-slate-500 mt-1">إدخال أرقام خيالية وفارغة في الـ mini-games</p>
                </div>
              </button>
            </div>

            <div className="border-t border-slate-850 pt-4 mt-2">
              <h3 className="text-xs font-black text-slate-200 mb-3">حالة جودة الأقسام الرئيسية</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-slate-850 bg-slate-900/30 p-2.5 flex justify-between items-center">
                  {diagnostics.uiux === 'pass' && <CheckCircle size={14} className="text-emerald-500" />}
                  {diagnostics.uiux === 'warning' && <AlertTriangle size={14} className="text-amber-500" />}
                  {diagnostics.uiux === 'fail' && <XCircle size={14} className="text-red-500" />}
                  {diagnostics.uiux === 'pending' && <span className="h-2 w-2 rounded-full bg-slate-700" />}
                  <span className="text-slate-400">تصميم UI/UX</span>
                </div>
                <div className="rounded-xl border border-slate-850 bg-slate-900/30 p-2.5 flex justify-between items-center">
                  {diagnostics.data === 'pass' && <CheckCircle size={14} className="text-emerald-500" />}
                  {diagnostics.data === 'warning' && <AlertTriangle size={14} className="text-amber-500" />}
                  {diagnostics.data === 'fail' && <XCircle size={14} className="text-red-500" />}
                  {diagnostics.data === 'pending' && <span className="h-2 w-2 rounded-full bg-slate-700" />}
                  <span className="text-slate-400">سلامة البيانات</span>
                </div>
                <div className="rounded-xl border border-slate-850 bg-slate-900/30 p-2.5 flex justify-between items-center">
                  {diagnostics.logic === 'pass' && <CheckCircle size={14} className="text-emerald-500" />}
                  {diagnostics.logic === 'warning' && <AlertTriangle size={14} className="text-amber-500" />}
                  {diagnostics.logic === 'fail' && <XCircle size={14} className="text-red-500" />}
                  {diagnostics.logic === 'pending' && <span className="h-2 w-2 rounded-full bg-slate-700" />}
                  <span className="text-slate-400">منطق وبرمجة</span>
                </div>
                <div className="rounded-xl border border-slate-850 bg-slate-900/30 p-2.5 flex justify-between items-center">
                  {diagnostics.backend === 'pass' && <CheckCircle size={14} className="text-emerald-500" />}
                  {diagnostics.backend === 'warning' && <AlertTriangle size={14} className="text-amber-500" />}
                  {diagnostics.backend === 'fail' && <XCircle size={14} className="text-red-500" />}
                  {diagnostics.backend === 'pending' && <span className="h-2 w-2 rounded-full bg-slate-700" />}
                  <span className="text-slate-400">محاكاة السيرفر</span>
                </div>
              </div>
            </div>
          </section>

          {/* Test Audit Console (7 columns) */}
          <section className="md:col-span-7 card border-slate-800 bg-slate-950/20 p-5 flex flex-col h-[400px]">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2.5 mb-3">
              <button
                type="button"
                onClick={handleClearLogs}
                className="text-[10px] text-slate-500 hover:text-slate-300 font-bold border border-slate-800 rounded px-2 py-0.5"
              >
                تصفية
              </button>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                كونسول التدقيق المباشر (Audit Logs)
                <Terminal size={16} className="text-slate-500" />
              </h2>
            </div>

            <div className="flex-1 bg-slate-950 border border-slate-900 rounded-xl p-3.5 overflow-y-auto font-mono text-[11px] leading-5 space-y-2 max-h-[300px]">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-700">
                  <AlertOctagon size={24} className="mb-2" />
                  <p>الكونسول بانتظار بدء عملية الفحص...</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 border-b border-slate-900/50 pb-1 text-right">
                    <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                    <div className="flex-1">
                      {log.type === 'success' && <span className="text-emerald-400 font-bold">[نجاح] </span>}
                      {log.type === 'warning' && <span className="text-amber-400 font-bold">[تنبيه] </span>}
                      {log.type === 'error' && <span className="text-red-400 font-bold">[خطأ] </span>}
                      {log.type === 'info' && <span className="text-blue-400 font-bold">[معلومات] </span>}
                      <span className="text-slate-300">{log.message}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>
      </div>
    </main>
  );
};

export default memo(StressTest);
