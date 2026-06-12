import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Globe, LogOut, MessageSquare, Newspaper, Trophy, Users, Video, QrCode, Plus, Trash, UserCheck, Shield, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCompetitions } from '../../context/CompetitionContext';

const Dashboard = () => {
  const { logout, teams } = useAuth();
  const { competitions, news, submissions, delegations, setDelegations, scannedQRs, setScannedQRs } = useCompetitions();

  // Delegation form states
  const [delName, setDelName] = useState('');
  const [delCount, setDelCount] = useState('');
  const [delAgency, setDelAgency] = useState('');
  const [delLeader, setDelLeader] = useState('');
  const [delPhone, setDelPhone] = useState('');

  const stats = [
    { label: 'إجمالي الفرق', value: teams.length, icon: Users, color: 'text-emerald-400' },
    { label: 'الوفود المسجلة', value: delegations.length, icon: UserCheck, color: 'text-blue-400' },
    { label: 'الرموز الممسوحة QR', value: scannedQRs.length, icon: QrCode, color: 'text-amber-400' },
    { label: 'إجمالي التسليمات', value: submissions.length, icon: MessageSquare, color: 'text-rose-400' },
  ];

  const links = [
    { path: '/admin/teams', label: 'إدارة الفرق', icon: Users },
    { path: '/admin/competitions', label: 'إدارة المسابقات', icon: Trophy },
    { path: '/admin/geography', label: 'إدارة الجغرافيا', icon: Globe },
    { path: '/admin/video-judging', label: 'تقييم الفيديو', icon: Video },
    { path: '/admin/news', label: 'مراجعة الأخبار', icon: Newspaper },
    { path: '/admin/questions', label: 'إدارة الأسئلة', icon: FileQuestion },
    { path: '/admin/stress-test', label: 'فحص جودة الموقع والمشاكل', icon: ShieldAlert },
  ];

  const handleAddDelegation = (e) => {
    e.preventDefault();
    if (!delName || !delCount || !delLeader) return;

    const newDel = {
      id: crypto.randomUUID(),
      name: delName,
      count: parseInt(delCount, 10),
      agency: delAgency,
      leader: delLeader,
      phone: delPhone,
      createdAt: new Date().toISOString()
    };

    setDelegations(prev => [newDel, ...prev]);

    // Reset fields
    setDelName('');
    setDelCount('');
    setDelAgency('');
    setDelLeader('');
    setDelPhone('');
  };

  const handleDeleteDelegation = (id) => {
    setDelegations(prev => prev.filter(item => item.id !== id));
  };

  const handleResetScans = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع سجلات قراءة الرموز QR؟')) {
      setScannedQRs([]);
    }
  };

  return (
    <main className="app-shell p-4 sm:p-6 text-right" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <button type="button" onClick={logout} className="flex items-center gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200 shadow-sm transition hover:bg-red-500/20 active:scale-98">
            خروج
            <LogOut size={16} />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-50">لوحة تحكم المشرفين</h1>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Shield size={20} />
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <article key={stat.label} className="card flex items-center justify-between p-4 bg-slate-900/50 border-slate-800">
              <div className={`rounded-lg border border-slate-800 bg-slate-950 p-2.5 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-bold">{stat.label}</p>
                <p className="text-2xl font-black text-slate-50 mt-1">{stat.value}</p>
              </div>
            </article>
          ))}
        </section>

        {/* Quick Links Grid */}
        <section className="mb-10 grid gap-4 grid-cols-2 lg:grid-cols-7">
          {links.map((item) => (
            <Link key={item.path} to={item.path} className="card flex flex-col items-center justify-center p-4 text-center transition hover:border-emerald-500/40 hover:bg-slate-900/30 group">
              <item.icon className="text-slate-400 group-hover:text-emerald-400 transition mb-2" size={24} />
              <span className="text-xs font-bold text-slate-200 group-hover:text-white transition">{item.label}</span>
            </Link>
          ))}
        </section>

        {/* Delegations and QR Tracking Section */}
        <div className="grid gap-6 lg:grid-cols-12">
          
          {/* Delegations Management Column (7 cols) */}
          <section className="lg:col-span-8 card border-slate-800 bg-slate-950/20 p-5 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-1 font-bold">تسجيل الفرق / الوفود</span>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                إدارة الوفود المسجلة
                <UserCheck size={18} className="text-slate-400" />
              </h2>
            </div>

            {/* List of Delegations */}
            <div className="overflow-x-auto">
              {delegations.length === 0 ? (
                <div className="py-10 text-center rounded-xl bg-slate-900/20 border border-dashed border-slate-800">
                  <p className="text-xs text-slate-500">لا توجد وفود مسجلة حالياً</p>
                </div>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-850">
                      <th className="pb-3 pt-1">الوفد</th>
                      <th className="pb-3 pt-1">العدد</th>
                      <th className="pb-3 pt-1">الهيئة التابع لها</th>
                      <th className="pb-3 pt-1">القائد</th>
                      <th className="pb-3 pt-1">رقم الهاتف</th>
                      <th className="pb-3 pt-1 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {delegations.map((d) => (
                      <tr key={d.id} className="border-b border-slate-900 hover:bg-slate-900/20">
                        <td className="py-3 font-bold text-white">{d.name}</td>
                        <td className="py-3 font-mono text-slate-300">{d.count} عضو</td>
                        <td className="py-3 text-slate-400">{d.agency || '—'}</td>
                        <td className="py-3 text-slate-300">{d.leader}</td>
                        <td className="py-3 font-mono text-slate-400">{d.phone}</td>
                        <td className="py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteDelegation(d.id)}
                            className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition"
                          >
                            <Trash size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Add Delegation Form */}
            <form onSubmit={handleAddDelegation} className="border-t border-slate-850 pt-5 space-y-4">
              <h3 className="text-xs font-black text-slate-200">إضافة وفد جديد يدوياً</h3>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                <input
                  type="text"
                  placeholder="اسم الوفد"
                  value={delName}
                  onChange={e => setDelName(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
                <input
                  type="number"
                  placeholder="العدد"
                  value={delCount}
                  onChange={e => setDelCount(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
                <input
                  type="text"
                  placeholder="الهيئة التابع لها"
                  value={delAgency}
                  onChange={e => setDelAgency(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="اسم قائد الوفد"
                  value={delLeader}
                  onChange={e => setDelLeader(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
                <input
                  type="tel"
                  placeholder="رقم الهاتف"
                  value={delPhone}
                  onChange={e => setDelPhone(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs p-2.5 flex items-center justify-center gap-1.5 transition active:scale-98"
                >
                  <Plus size={14} />
                  إضافة الوفد
                </button>
              </div>
            </form>
          </section>

          {/* QR Code Puzzle Tracking Column (4 cols) */}
          <section className="lg:col-span-4 card border-slate-800 bg-slate-950/20 p-5 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={handleResetScans}
                className="text-[10px] text-red-400 hover:text-red-300 font-bold border border-red-500/20 rounded px-2 py-0.5"
              >
                إعادة ضبط
              </button>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                تتبع مسح الرموز QR
                <QrCode size={18} className="text-slate-400" />
              </h2>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto scrollbar-thin">
              {scannedQRs.length === 0 ? (
                <div className="py-12 text-center rounded-xl bg-slate-900/20 border border-dashed border-slate-800">
                  <p className="text-xs text-slate-500">لا توجد عمليات مسح مسجلة بعد</p>
                </div>
              ) : (
                scannedQRs.map((scan) => (
                  <div key={scan.id || scan.timestamp} className="rounded-xl border border-slate-850 bg-slate-900/40 p-3 flex flex-col gap-1 text-right">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(scan.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="font-extrabold text-xs text-slate-200">{scan.teamName}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-emerald-400 font-bold font-mono">كود سري: {scan.secretCode || ' DSC_SECRET'}</span>
                      <span className="text-slate-400 font-bold">لغز: {scan.puzzleName}</span>
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

export default Dashboard;
