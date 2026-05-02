import { Link } from 'react-router-dom';
import { Cog, FileQuestion, Globe, LogOut, MessageSquare, Newspaper, Trophy, Users, Video } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCompetitions } from '../../context/CompetitionContext';

const Dashboard = () => {
  const { logout, teams } = useAuth();
  const { competitions, news, submissions } = useCompetitions();

  const stats = [
    { label: 'إجمالي الفرق', value: teams.length, icon: Users },
    { label: 'المسابقات النشطة', value: competitions.filter((competition) => competition.isOpen).length, icon: Trophy },
    { label: 'أخبار بانتظار الموافقة', value: news.filter((item) => item.status === 'pending').length, icon: Newspaper },
    { label: 'إجمالي التسليمات', value: submissions.length, icon: MessageSquare },
  ];

  const links = [
    { path: '/admin/teams', label: 'إدارة الفرق', icon: Users },
    { path: '/admin/competitions', label: 'إدارة المسابقات', icon: Trophy },
    { path: '/admin/geography', label: 'إدارة الجغرافيا', icon: Globe },
    { path: '/admin/video-judging', label: 'تقييم الفيديو', icon: Video },
    { path: '/admin/news', label: 'مراجعة الأخبار', icon: Newspaper },
    { path: '/admin/questions', label: 'إدارة الأسئلة', icon: FileQuestion },
    { path: '/admin/settings', label: 'الإعدادات', icon: Cog },
  ];

  return (
    <main className="app-shell p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <button type="button" onClick={logout} className="flex items-center gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 font-bold text-red-200 shadow-sm">
            خروج
            <LogOut size={18} />
          </button>
          <h1 className="text-3xl font-black text-slate-50">لوحة تحكم المخيم</h1>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <article key={stat.label} className="card flex items-center justify-between">
              <div className="rounded-lg border border-signal/25 bg-signal/10 p-3 text-signal">
                <stat.icon />
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">{stat.label}</p>
                <p className="text-3xl font-black text-slate-50">{stat.value}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => (
            <Link key={item.path} to={item.path} className="card flex items-center justify-between transition hover:border-signal">
              <item.icon className="text-accent" size={30} />
              <span className="text-lg font-black text-slate-50">{item.label}</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
};

export default Dashboard;
