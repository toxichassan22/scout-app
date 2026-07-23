import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Globe, LogOut, MessageSquare, Newspaper, Trophy, Users, Video, QrCode, Plus, Trash, UserCheck, Shield, ShieldAlert, FileText, Award, Calendar, RefreshCw, Snowflake, Database } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAdminLeaderboard, getAdminTeams, getAdminJudges, getAdminReports, triggerEmergencyFreeze, triggerCleanSlate, apiFetch } from '../../services/api';

const Dashboard = () => {
  const { logout, user } = useAuth();
  const [teamsCount, setTeamsCount] = useState(0);
  const [judgesCount, setJudgesCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);

  const [isFrozen, setIsFrozen] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [cleanSlateLoading, setCleanSlateLoading] = useState(false);

  useEffect(() => {
    fetchQuickStats();
  }, []);

  const fetchQuickStats = async () => {
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
    }
  };

  const handleFreezeToggle = async () => {
    try {
      const nextState = !isFrozen;
      await triggerEmergencyFreeze(nextState);
      setIsFrozen(nextState);
      alert(nextState ? '🚨 تم تجميد كافة مسابقات وعدادات المهرجان بنجاح!' : '▶️ تم استئناف المهرجان والعدادات بنجاح!');
    } catch (e) {
      alert('فشل في تغيير حالة الطوارئ');
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
    { label: 'إجمالي الفرق المسجلة', value: teamsCount, icon: Users, color: 'text-emerald-400' },
    { label: 'المحكمين المعتمدين', value: judgesCount, icon: UserCheck, color: 'text-blue-400' },
    { label: 'التقارير المرفوعة', value: reportsCount, icon: FileText, color: 'text-amber-400' },
  ];

  const links = [
    { path: '/admin/teams', label: 'إدارة الفرق', icon: Users, desc: 'إضافة واستيراد جماعي' },
    { path: '/admin/judges', label: 'إدارة المحكمين', icon: UserCheck, desc: 'حسابات وتوليد أكواد' },
    { path: '/admin/competitions', label: 'إدارة المسابقات', icon: Trophy, desc: 'فتح وقفل وتحديد المعايير' },
    { path: '/admin/agenda', label: 'برنامج المهرجان', icon: Calendar, desc: 'تعديل الفعاليات والجدول' },
    { path: '/admin/scoring', label: 'تعديل الدرجات', icon: Award, desc: 'رؤية كاملة وسجل تدقيق' },
    { path: '/admin/news', label: 'نشر الأخبار', icon: Newspaper, desc: 'نشر إعلانات وتحديث فوري' },
    { path: '/admin/reports', label: 'التقارير المرفوعة', icon: FileText, desc: 'استعراض وتحميل الملفات' },
    { path: '/admin/questions', label: 'إدارة الأسئلة', icon: FileQuestion, desc: 'أسئلة التحديات الرقمية' },
  ];

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
        <section className="mb-8 grid gap-4 grid-cols-1 md:grid-cols-3">
          {stats.map((stat) => (
            <article key={stat.label} className="card flex items-center justify-between p-5 bg-slate-900/50 border-slate-800 rounded-2xl">
              <div className={`rounded-xl border border-slate-800 bg-slate-950 p-3 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-bold">{stat.label}</p>
                <p className="text-3xl font-black text-slate-50 mt-1">{stat.value}</p>
              </div>
            </article>
          ))}
        </section>

        {/* Quick Links Grid */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {links.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="card flex flex-col justify-between p-5 text-right transition hover:border-emerald-500/40 hover:bg-slate-900/60 rounded-2xl border-slate-800 bg-slate-900/30 group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">إدارة</span>
                <item.icon className="text-slate-400 group-hover:text-emerald-400 transition" size={28} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 group-hover:text-white transition">{item.label}</h3>
                <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
};

export default Dashboard;
