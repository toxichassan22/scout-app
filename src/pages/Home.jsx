import { Link } from 'react-router-dom';
import { BrainCircuit, Calendar, Compass, Flame, Info, MapPin, Newspaper, RadioTower, Route, Sparkles, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompetitions } from '../context/CompetitionContext';
import { FESTIVAL_DETAILS } from '../data/mockData';
import NewsCard from '../components/NewsCard';

const Home = () => {
  const { user } = useAuth();
  const { news, competitions } = useCompetitions();
  const approvedNews = news.filter((item) => item.status === 'approved').slice(0, 2);
  const openCount = competitions.filter((competition) => competition.isOpen).length;
  const trailSteps = [
    { icon: Compass, title: 'توجيه كشفي', text: 'بوصلة واضحة لكل فريق من الدخول حتى التسليم.' },
    { icon: BrainCircuit, title: 'حكم AI', text: 'تقييم أذكى للبرومبت والفيديو مع متابعة من الأدمن.' },
    { icon: Flame, title: 'روح المخيم', text: 'تحديات جماعية وأخبار مباشرة في تجربة واحدة.' },
  ];

  return (
    <main className="page-shell">
      <header className="tech-panel mb-6 text-white">
        <div className="grid gap-8 p-5 md:grid-cols-[1fr_18rem] md:items-center md:p-8">
          <div className="order-2 text-right md:order-1">
            <p className="scout-ai-badge mb-3">
              <Sparkles size={16} />
              مرحباً، {user?.name} · مخيم كشفي مدعوم بالذكاء الاصطناعي
            </p>
            <h1 className="text-4xl font-black leading-tight sm:text-6xl">
              {FESTIVAL_DETAILS.name}
              <span className="block bg-gradient-to-l from-accent via-primary-light to-signal bg-clip-text text-transparent">كشافة + AI</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
              {FESTIVAL_DETAILS.subtitle} بروح نار المخيم والبوصلة والعُقد الكشفية، مع طبقة ذكاء اصطناعي تنظّم المنافسة وتفتح مساحة للإبداع.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="metric-tile">
                <p className="text-xs text-slate-400">المسابقات المفتوحة</p>
                <p className="text-2xl font-black text-accent">{openCount}</p>
              </div>
              <div className="metric-tile">
                <p className="text-xs text-slate-400">آخر الأخبار</p>
                <p className="text-2xl font-black text-signal">{approvedNews.length}</p>
              </div>
              <div className="metric-tile">
                <p className="text-xs text-slate-400">الموقع</p>
                <p className="truncate text-sm font-black">{FESTIVAL_DETAILS.location}</p>
              </div>
            </div>
          </div>
          <div className="order-1 flex justify-center md:order-2">
            <div className="ai-orb w-52">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-accent/30 bg-primary/15 p-3 shadow-inner">
                <img src={FESTIVAL_DETAILS.logo} alt="شعار المخيم" className="h-full w-full object-contain" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        {trailSteps.map((step) => (
          <article key={step.title} className="path-card text-right">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-black text-slate-400">مسار المخيم</span>
              <div className="trail-node">
                <step.icon size={20} />
              </div>
            </div>
            <h2 className="text-lg font-black text-slate-50">{step.title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-300">{step.text}</p>
          </article>
        ))}
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="card text-right md:col-span-2">
          <div className="mb-3 flex items-center justify-end gap-2 text-accent">
            <h2 className="text-xl font-black">معلومات المهرجان</h2>
            <Info size={22} />
          </div>
          <p className="leading-8 text-slate-300">{FESTIVAL_DETAILS.info}</p>
        </div>
        <div className="grid gap-4">
          <div className="card flex items-center justify-between gap-3 border-signal/25 bg-signal/10">
            <span className="text-right text-sm font-bold text-slate-200">{FESTIVAL_DETAILS.location}</span>
            <MapPin className="text-signal" />
          </div>
          <div className="card flex items-center justify-between gap-3 border-accent/25 bg-accent/10">
            <span className="text-right text-sm font-bold text-slate-200">{openCount} مسابقات مفتوحة</span>
            <Trophy className="text-accent" />
          </div>
        </div>
      </section>

      <section className="card mb-6 text-right">
        <div className="mb-3 flex items-center justify-end gap-2 text-signal">
          <h2 className="text-lg font-black">الجدول العام</h2>
          <Route size={20} />
        </div>
        <p className="leading-8 text-slate-300">{FESTIVAL_DETAILS.schedule}</p>
        <div className="mt-4 flex flex-wrap justify-end gap-2 text-xs font-bold text-slate-300">
          <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1">افتتاح</span>
          <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1">مسابقات رقمية</span>
          <span className="rounded-full border border-signal/25 bg-signal/10 px-3 py-1">تقييم AI</span>
          <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1">تكريم</span>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="card flex items-center justify-between gap-4">
          <div className="rounded-lg border border-signal/25 bg-signal/10 p-3 text-signal">
            <RadioTower />
          </div>
          <div className="text-right">
            <h2 className="font-black text-slate-50">محطة الفرق</h2>
            <p className="text-sm text-slate-400">كل فريق يدخل المسابقة من جلسة التطبيق فقط.</p>
          </div>
        </div>
        <div className="card flex items-center justify-between gap-4">
          <div className="rounded-lg border border-accent/25 bg-accent/10 p-3 text-accent">
            <Calendar />
          </div>
          <div className="text-right">
            <h2 className="font-black text-slate-50">روح الكشافة</h2>
            <p className="text-sm text-slate-400">تحديات، تعاون، ومعرفة في مسار واحد.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <Link to="/news" className="rounded-lg border border-signal/25 bg-signal/10 px-4 py-2 text-sm font-bold text-signal">
            عرض الكل
          </Link>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-50">
            آخر الأخبار
            <Newspaper size={22} />
          </h2>
        </div>
        {approvedNews.length === 0 ? (
          <div className="card py-12 text-center text-slate-400">لا توجد أخبار منشورة حالياً</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {approvedNews.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default Home;
