import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Newspaper, Trophy, Users, UserCheck, Shield, ShieldAlert, FileText, Award, Calendar, RefreshCw, Snowflake, Database, QrCode, Sparkles, Cpu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAdminLeaderboard, getAdminTeams, getAdminJudges, getAdminReports, triggerEmergencyFreeze, triggerCleanSlate, apiFetch, triggerGithubBackup, syncHuggingFaceReports, getHuggingFaceReportsSyncStatus, getLeaderboardVisibility, setLeaderboardVisibility, getGpuStatus } from '../../services/api';

const Dashboard = () => {
  const { logout, user } = useAuth();
  const [teamsCount, setTeamsCount] = useState(0);
  const [judgesCount, setJudgesCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);
  // Without this the cards render 0 while loading, so a real zero and a pending
  // request look identical.
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');

  const [isFrozen, setIsFrozen] = useState(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [githubBackupLoading, setGithubBackupLoading] = useState(false);
  const [huggingFaceLoading, setHuggingFaceLoading] = useState(false);
  const [cleanSlateLoading, setCleanSlateLoading] = useState(false);
  const [gpuState, setGpuState] = useState('unknown');

  useEffect(() => {
    fetchQuickStats();
    getLeaderboardVisibility().then(result => setLeaderboardVisible(Boolean(result.visible))).catch(console.error);
    getGpuStatus().then(res => res?.success && setGpuState(res.state)).catch(() => {});
  }, []);

  const fetchQuickStats = async () => {
    setStatsLoading(true);
    setStatsError('');
    try {
      const [t, j, r] = await Promise.all([
        getAdminTeams(),
        getAdminJudges(),
        getAdminReports()
      ]);
      setTeamsCount(t.length);
      setJudgesCount(j.length);
      setReportsCount(r.length);
    } catch (e) {
      console.error(e);
      setStatsError(e.message || 'تعذر تحميل الإحصاءات');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleFreezeToggle = async () => {
    const nextState = !isFrozen;
    const question = nextState
      ? 'تجميد الطوارئ يوقف كل المسابقات والعدادات لكل الفرق فوراً. هل تريد المتابعة؟'
      : 'سيتم استئناف كل المسابقات والعدادات لكل الفرق. هل تريد المتابعة؟';
    if (!confirm(question)) return;
    try {
      await triggerEmergencyFreeze(nextState);
      setIsFrozen(nextState);
      alert(nextState ? '🚨 تم تجميد كافة مسابقات وعدادات المهرجان بنجاح!' : '▶️ تم استئناف المهرجان والعدادات بنجاح!');
    } catch (e) {
      alert('فشل في تغيير حالة الطوارئ');
    }
  };

  const handleLeaderboardVisibility = async () => {
    const question = leaderboardVisible
      ? 'سيتم إخفاء أسماء الفرق من لوحة الشرف أمام الجميع. هل تريد المتابعة؟'
      : 'سيتم إظهار أسماء الفرق وترتيبها لكل من يفتح لوحة الشرف. هل تريد المتابعة؟';
    if (!confirm(question)) return;
    try {
      const result = await setLeaderboardVisibility(!leaderboardVisible);
      setLeaderboardVisible(Boolean(result.visible));
    } catch (error) {
      alert(error.message || 'فشل تغيير ظهور النتائج');
    }
  };

  const handleGithubBackup = async () => {
    try {
      setGithubBackupLoading(true);
      const result = await triggerGithubBackup();
      alert(result.skipped ? 'مزامنة GitHub غير مفعلة في إعدادات السيرفر.' : `تمت مزامنة ${result.files} ملفات إلى النسخة الخاصة.`);
    } catch (error) {
      alert(error.message || 'فشل تشغيل مزامنة GitHub');
    } finally {
      setGithubBackupLoading(false);
    }
  };

  const handleManualBackup = async () => {
    try {
      setBackupLoading(true);
      const res = await apiFetch('/admin/backup/trigger', { method: 'POST' });
      if (res.success) {
        alert(`✅ تم توليد وتصدير النسخة الاحتياطية بنجاح!\n• عدد الفرق: ${res.totalTeams || 0}\n• تم الرفع لـ Google Drive: ${res.gdriveSynced ? 'نعم ✅' : 'غير مفعل الرابط ⚠️'}\n• الملفات المرفوعة: ${res.uploaded || 0}`);
      } else {
        alert(res.error || 'حدث خطأ أثناء النسخ الاحتياطي');
      }
    } catch (e) {
      if (e.status === 409) {
        alert(e.message || 'النسخ الاحتياطي يعمل بالفعل، انتظر حتى يكتمل.');
      } else {
        alert('فشل في تشغيل المزامنة والنسخ الاحتياطي: ' + (e.message || ''));
      }
    } finally {
      setBackupLoading(false);
    }
  };

  const handleHuggingFaceSync = async () => {
    if (!confirm('سيتم رفع التقارير الحالية فقط إلى مستودع Hugging Face العام واستبدال النسخ بنفس المسارات. هل تريد المتابعة؟')) return;
    try {
      setHuggingFaceLoading(true);
      const started = await syncHuggingFaceReports();
      if (started.skipped) {
        alert('Hugging Face غير مفعل في إعدادات السيرفر.');
        return;
      }
      for (let attempt = 0; attempt < 90; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const status = await getHuggingFaceReportsSyncStatus();
        if (!status.running) {
          if (status.error) throw new Error(status.error);
          alert(`تم التحقق من مزامنة HF: ${status.synced || 0} مرفوع، ${status.skipped || 0} موجود مسبقاً، ${status.failed || 0} فشل، من أصل ${status.total || 0}.`);
          return;
        }
      }
      alert('المزامنة ما زالت تعمل في الخلفية. افحص الزر مرة أخرى بعد قليل لمعرفة العدد النهائي.');
    } catch (error) {
      alert(error.message || 'فشل مزامنة التقارير إلى Hugging Face');
    } finally {
      setHuggingFaceLoading(false);
    }
  };

  const handleCleanSlate = async () => {
    // Irreversible: wipes scores and reports. Ask plainly before the password step.
    if (!confirm('تحذير: سيتم حذف كل الدرجات والتقارير نهائياً ولا يمكن التراجع. هل أنت متأكد؟')) return;
    const pwd = prompt('🔒 أدخل كلمة سر الأدمن لتأكيد تصفير ومسح كافة تجارب الدرجات والتقارير:');
    if (!pwd) return;

    try {
      setCleanSlateLoading(true);
      await triggerCleanSlate(pwd);
      alert('🧹 تم تصفير البيانات وتطهير تجارب الاختبار بنجاح! جاهزون للمهرجان.');
      fetchQuickStats();
    } catch (e) {
      alert(e.message || 'كلمة السر غير صحيحة');
    } finally {
      setCleanSlateLoading(false);
    }
  };

  const stats = [
    { label: 'إجمالي الفرق المسجلة', value: teamsCount, icon: Users, tone: 'emerald', emptyHint: 'أضف أول فريق', to: '/admin/teams' },
    { label: 'المحكمين المعتمدين', value: judgesCount, icon: UserCheck, tone: 'sky', emptyHint: 'أضف أول محكم', to: '/admin/judges' },
    { label: 'التقارير المرفوعة', value: reportsCount, icon: FileText, tone: 'amber', emptyHint: 'لم ترفع الفرق تقارير بعد', to: '/admin/reports' },
  ];

  // Grouped by when they are used, so setup work does not sit mixed in with the
  // screens needed while the festival is running.
  const groups = [
    {
      title: 'الإعداد قبل المهرجان',
      links: [
        { path: '/admin/teams', label: 'إدارة الفرق', icon: Users, desc: 'إضافة واستيراد وحذف وحد الأجهزة', tone: 'emerald' },
        { path: '/admin/judges', label: 'إدارة المحكمين', icon: UserCheck, desc: 'حسابات وتكليف وتوليد الأكواد', tone: 'sky' },
        { path: '/admin/competitions', label: 'إدارة المسابقات', icon: Trophy, desc: 'المواعيد والفتح والقفل والمعايير', tone: 'amber' },
        { path: '/admin/activities', label: 'تجهيز رحلة QR', icon: QrCode, desc: 'طباعة أكواد Easter Egg وتسليمها للسواعد', tone: 'cyan' },
        { path: '/admin/agenda', label: 'برنامج المهرجان', icon: Calendar, desc: 'الفعاليات والجدول والمناطق', tone: 'violet' },
      ],
    },
    {
      title: 'التشغيل يوم المهرجان',
      links: [
        { path: '/admin/scoring', label: 'تعديل الدرجات', icon: Award, desc: 'اختر المسابقة ثم الفريق، مع سجل تدقيق', tone: 'rose' },
        { path: '/admin/leaderboard', label: 'لوحة الصدارة والترتيب', icon: Trophy, desc: 'عرض الترتيب العام، وإظهار/إخفاء النتائج', tone: 'amber' },
        { path: '/admin/ai-studio', label: 'استوديو الذكاء الاصطناعي (GPU)', icon: Sparkles, desc: 'توليد الصور بـ FLUX.1 وفيديوهات HD بـ LTX-Video', tone: 'cyan' },
        { path: '/admin/reports', label: 'التقارير المرفوعة', icon: FileText, desc: 'استعراض وتحميل وصلاحية التسليم', tone: 'sky' },
        { path: '/admin/news', label: 'نشر الأخبار', icon: Newspaper, desc: 'إعلانات عامة أو موجهة لفرق بعينها', tone: 'emerald' },
      ],
    },
  ];

  const tones = {
    emerald: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    sky: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
    amber: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    violet: 'border-violet-500/25 bg-violet-500/10 text-violet-300',
    rose: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
    cyan: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
  };
  const hoverTones = {
    emerald: 'hover:border-emerald-500/50',
    sky: 'hover:border-sky-500/50',
    amber: 'hover:border-amber-500/50',
    violet: 'hover:border-violet-500/50',
    rose: 'hover:border-rose-500/50',
    cyan: 'hover:border-cyan-500/50',
  };

  return (
    <main className="app-shell p-4 sm:p-6 text-right dir-rtl">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200 shadow-sm transition hover:bg-red-500/20 active:scale-98"
          >
            خروج
            <LogOut size={16} />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-50">لوحة قيادة الأدمن والتحكم الشامل</h1>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Shield size={20} />
            </div>
          </div>
        </header>

        {/* Sleek Admin Quick Control Center */}
        <section className="mb-8 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 p-4 sm:p-5 backdrop-blur-md shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Title & Status */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShieldAlert size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-100">غرفة السيطرة والتحكم السريع</h2>
                  {gpuState === 'running' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      GPU متاح
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">مفاتيح الطوارئ، لوحة الصدارة، المزامنة السحابية، وتصفير التجارب</p>
              </div>
            </div>

            {/* Action Buttons Group */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Emergency Freeze Toggle */}
              <button
                type="button"
                onClick={handleFreezeToggle}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm ${
                  isFrozen
                    ? 'bg-red-500 text-white shadow-red-500/30 animate-pulse ring-2 ring-red-400'
                    : 'border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                }`}
                title="إيقاف أو استئناف كل أنشطة الفرق والعدادات فوراً"
              >
                <Snowflake size={15} />
                <span>{isFrozen ? 'المهرجان مجمّد (استئناف ▶️)' : 'تجميد الطوارئ 🚨'}</span>
              </button>

              {/* Leaderboard Visibility Toggle */}
              <button
                type="button"
                onClick={handleLeaderboardVisibility}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm ${
                  leaderboardVisible
                    ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                    : 'border border-slate-700 bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
                title="التحكم في إظهار أو إخفاء أسماء الفرق على الشاشة الكبيرة"
              >
                <Trophy size={15} />
                <span>{leaderboardVisible ? 'النتائج: ظاهرة للجمهور 👁️' : 'النتائج: مخفية 🔒'}</span>
              </button>

              {/* Cloud Sync Actions (Unified Group) */}
              <div className="flex items-center rounded-xl border border-sky-500/25 bg-sky-500/10 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={handleManualBackup}
                  disabled={backupLoading}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-bold text-sky-200 transition hover:bg-sky-500/20 disabled:opacity-50"
                  title="نسخ احتياطي فوري لقاعدة البيانات إلى السيرفر وGoogle Drive"
                >
                  <Database size={14} />
                  <span>{backupLoading ? 'جارٍ النسخ...' : 'نسخ احتياطي 💾'}</span>
                </button>

                <span className="h-4 w-px bg-sky-500/20 my-auto" />

                <button
                  type="button"
                  onClick={handleGithubBackup}
                  disabled={githubBackupLoading}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-bold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
                  title="مزامنة التعديلات إلى مستودع GitHub الخاص"
                >
                  <span>{githubBackupLoading ? '...' : 'GitHub'}</span>
                </button>

                <span className="h-4 w-px bg-sky-500/20 my-auto" />

                <button
                  type="button"
                  onClick={handleHuggingFaceSync}
                  disabled={huggingFaceLoading}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-bold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
                  title="رفع ومزامنة تقارير الفرق إلى Hugging Face"
                >
                  <span>{huggingFaceLoading ? '...' : 'HF'}</span>
                </button>
              </div>

              {/* Clean Slate Button (Danger Zone - compact) */}
              <button
                type="button"
                onClick={handleCleanSlate}
                disabled={cleanSlateLoading}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-bold text-red-300/80 transition hover:border-red-500/40 hover:bg-red-500/15 hover:text-red-200 disabled:opacity-50"
                title="تصفير ومسح كل الدرجات والتقارير التجريبية قبل بدء المهرجان الرسمي"
              >
                <RefreshCw size={14} className={cleanSlateLoading ? 'animate-spin' : ''} />
                <span>{cleanSlateLoading ? 'جارٍ التصفير...' : 'تصفير التجارب 🧹'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        {statsError && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-4">
            <button type="button" onClick={fetchQuickStats} className="rounded-xl border border-red-400/30 bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-100 transition hover:bg-red-500/25">
              إعادة المحاولة
            </button>
            <p className="text-sm font-bold text-red-200">{statsError}</p>
          </div>
        )}

        <section className="mb-9 grid gap-4 grid-cols-1 md:grid-cols-3">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              to={stat.to}
              className={`card group flex items-center justify-between rounded-2xl border-slate-800 bg-slate-900/50 p-5 transition ${hoverTones[stat.tone]}`}
            >
              <div className={`rounded-xl border p-3 ${tones[stat.tone]}`}>
                <stat.icon size={24} />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs font-bold text-slate-400">{stat.label}</p>
                {statsLoading ? (
                  <div className="mt-2 h-8 w-16 animate-pulse rounded-lg bg-slate-800" />
                ) : (
                  <>
                    <p className="mt-1 text-3xl font-black tabular-nums text-slate-50">{stat.value}</p>
                    {stat.value === 0 && <p className="mt-0.5 text-[11px] font-bold text-slate-500">{stat.emptyHint}</p>}
                  </>
                )}
              </div>
            </Link>
          ))}
        </section>

        {/* Sections, grouped by when they are used */}
        {groups.map((group) => (
          <section key={group.title} className="mb-9 last:mb-0">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-sm font-black text-slate-300">{group.title}</h2>
              <span className="h-px flex-1 bg-slate-800" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {group.links.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`card group flex flex-col justify-between rounded-2xl border-slate-800 bg-slate-900/30 p-5 text-right transition hover:bg-slate-900/60 ${hoverTones[item.tone]}`}
                >
                  <div className={`mb-4 inline-flex w-fit rounded-xl border p-2.5 ${tones[item.tone]}`}>
                    <item.icon size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100 transition group-hover:text-white">{item.label}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
};

export default Dashboard;
