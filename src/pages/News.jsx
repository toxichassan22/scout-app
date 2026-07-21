import React, { useState, useEffect } from 'react';
import { Newspaper, Bell, Sparkles, AlertCircle } from 'lucide-react';
import { getNews } from '../services/api';
import { useSocket } from '../context/SocketContext';
import NewsCard from '../components/NewsCard';

const News = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchNews = async () => {
    try {
      const data = await getNews();
      setNews(data);
    } catch (err) {
      console.error('Failed to load news:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();

    if (socket) {
      socket.on('news:published', (newStory) => {
        setNews((prev) => [newStory, ...prev]);
      });

      socket.on('news:deleted', ({ id }) => {
        setNews((prev) => prev.filter((item) => item.id !== id));
      });

      return () => {
        socket.off('news:published');
        socket.off('news:deleted');
      };
    }
  }, [socket]);

  return (
    <div className="page-shell text-right dir-rtl">
      {/* Header */}
      <div className="glass-card mb-8 p-6 sm:p-8 rounded-3xl border border-emerald-500/20 bg-slate-950/70 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Bell size={14} className="animate-pulse" />
            النشرة الإخبارية الرسمية
          </span>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            الجريدة الكشفية الرقمية
            <Newspaper size={26} className="text-emerald-400" />
          </h1>
        </div>
        <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
          التوجيهات، القرارات، والتحديثات التنظيمية الصادرة مباشرة من الهيئة العليا المباشرة للمهرجان.
        </p>
      </div>

      {/* News Feed */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-xs">
          <div className="mx-auto h-8 w-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3" />
          جاري تحميل الأخبار...
        </div>
      ) : news.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-500 rounded-3xl border border-white/5">
          <Sparkles size={36} className="mx-auto mb-3 text-slate-600" />
          <p className="font-bold text-slate-300 text-sm">لا توجد إعلانات أو أخبار جديدة حالياً</p>
          <p className="text-xs text-slate-500 mt-1">ستظهر الإعلانات هنا فور نشرها من قيادة المخيم</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {news.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default News;
