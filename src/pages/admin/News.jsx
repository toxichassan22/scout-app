import { Link } from 'react-router-dom';
import { Check, ChevronLeft, Trash2, X } from 'lucide-react';
import NewsCard from '../../components/NewsCard';
import { useCompetitions } from '../../context/CompetitionContext';

const AdminNews = () => {
  const { news, approveNews, rejectNews, deleteNews } = useCompetitions();
  const pending = news.filter((item) => item.status === 'pending');
  const approved = news.filter((item) => item.status === 'approved');

  return (
    <main className="app-shell p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-2 text-gray-500">
            العودة
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-2xl font-black">مراجعة الأخبار</h1>
        </header>

        <section className="mb-8">
          <h2 className="mb-4 text-right text-lg font-black text-amber-700">بانتظار الموافقة ({pending.length})</h2>
          {pending.length === 0 ? (
            <div className="card text-center text-gray-400">لا توجد أخبار بانتظار الموافقة</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pending.map((item) => (
                <div key={item.id} className="space-y-3">
                  <NewsCard item={item} />
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => approveNews(item.id)} className="rounded-xl bg-green-50 py-3 font-bold text-green-700">
                      <span className="inline-flex items-center gap-2">
                        موافقة
                        <Check size={18} />
                      </span>
                    </button>
                    <button type="button" onClick={() => rejectNews(item.id)} className="rounded-xl bg-red-50 py-3 font-bold text-red-700">
                      <span className="inline-flex items-center gap-2">
                        رفض
                        <X size={18} />
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-right text-lg font-black text-primary-dark">الأخبار المنشورة ({approved.length})</h2>
          {approved.length === 0 ? (
            <div className="card text-center text-gray-400">لا توجد أخبار منشورة</div>
          ) : (
            <div className="grid gap-3">
              {approved.map((item) => (
                <article key={item.id} className="card flex items-center justify-between gap-4">
                  <button type="button" onClick={() => deleteNews(item.id)} className="rounded-xl bg-red-50 p-3 text-red-500">
                    <Trash2 size={18} />
                  </button>
                  <div className="text-right">
                    <h3 className="font-black">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.teamName}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default AdminNews;
