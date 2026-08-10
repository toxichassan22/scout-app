import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Newspaper, Trophy, Users, UserCheck, Shield, ShieldAlert, FileText, Award, Calendar, RefreshCw, Snowflake, Database } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAdminLeaderboard, getAdminTeams, getAdminJudges, getAdminReports, triggerEmergencyFreeze, triggerCleanSlate, apiFetch, triggerGithubBackup, getLeaderboardVisibility, setLeaderboardVisibility } from '../../services/api';

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
  const [cleanSlateLoading, setCleanSlateLoading] = useState(false);

  useEffect(() => {
    fetchQuickStats();
    getLeaderboardVisibility().then(result => setLeaderboardVisible(Boolean(result.visible))).catch(console.error);
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
      alert(`✅ تم توليد النسخة الاحتياطية بنجاح!\nالمسار: scout-backups\nعدد الفرق: ${res.totalTeams}`);
    } catch (e) {
      alert('فشل في تشغيل المزامنة والنسخ الاحتياطي');
    } finally {
      setBackupLoading(false);
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
        { path: '/admin/agenda', label: 'برنامج المهرجان', icon: Calendar, desc: 'الفعاليات والجدول والمناطق', tone: 'violet' },
      ],
    },
    {
      title: 'التشغيل يوم المهرجان',
      links: [
        { path: '/admin/scoring', label: 'تعديل الدرجات', icon: Award, desc: 'اختر المسابقة ثم الفريق، مع سجل تدقيق', tone: 'rose' },
        { path: '/admin/reports', label: 'التقارير المرفوعة', icon: FileText, desc: 'استعراض وتحميل وصلاحية التسليم', tone: 'cyan' },
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

        {/* Control & Emergency Bar */}
        <section className="mb-8 p-5 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert size={24} className="text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-slate-100">أدوات السيطرة والمزامنة السريعة</h2>
              <p className="text-xs text-slate-400">تجميد المهرجان في الطوارئ، المزامنة الفورية، وتصفير التجارب</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            <button
              type="button"
              onClick={handleFreezeToggle}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition shadow-lg ${
                isFrozen
                  ? 'bg-amber-400 text-slate-950 shadow-amber-400/20 animate-pulse'
                  : 'border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
              }`}
            >
              <Snowflake size={16} />
              {isFrozen ? 'استئناف المهرجان ▶️' : 'تجميد الطوارئ 🚨'}
            </button>

            <button
              type="button"
              onClick={handleLeaderboardVisibility}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${leaderboardVisible ? 'bg-emerald-400 text-slate-950' : 'border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20'}`}
            >
              <Trophy size={16} />
              {leaderboardVisible ? 'إخفاء أسماء الفرق' : 'إظهار أسماء الفرق'}
            </button>

            <button
              type="button"
              onClick={handleGithubBackup}
              disabled={githubBackupLoading}
              className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-xs font-black text-violet-300 transition hover:bg-violet-500/20 disabled:opacity-50"
            >
              <Database size={16} />
              {githubBackupLoading ? 'جارٍ مزامنة النسخة الخاصة...' : 'مزامنة GitHub Private'}
            </button>

            <button
              type="button"
              onClick={handleManualBackup}
              disabled={backupLoading}
              className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-black text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50"
            >
              <Database size={16} />
              {backupLoading ? 'جارٍ النسخ...' : 'مزامنة احتياطية الآن 💾'}
            </button>

            <button
              type="button"
              onClick={handleCleanSlate}
              disabled={cleanSlateLoading}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              {cleanSlateLoading ? 'جارٍ المسح...' : 'تصفير تجارب الاختبار 🧹'}
            </button>
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
