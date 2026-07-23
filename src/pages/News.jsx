import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, Bell, Sparkles, Clock, RadioTower } from 'lucide-react';
import { getNews } from '../services/api';
import { useSocket } from '../context/SocketContext';
import NewsCard from '../components/NewsCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import MediaSlot from '../components/MediaSlot';

/* الخبر الرئيسي (المانشيت) */
const FeaturedNews = ({ item }) => {
  const photo = item.photoUrl || item.photo;
  const date = item.createdAt || item.timestamp;

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="group relative mb-8 overflow-hidden rounded-[2rem] border border-[rgba(245,158,11,0.3)]"
    >
      {/* خلفية الصورة أو placeholder */}
      <div className="relative aspect-[16/8]">
        {photo ? (
          <img
            src={photo}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0">
            <MediaSlot
              name="news-featured-fallback"
              kind="image"
              ratio={null}
              label="صورة المانشيت الرئيسي"
              overlay={false}
              className="!h-full !rounded-none !border-0"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(7,6,12,0.97)] via-[rgba(7,6,12,0.55)] to-transparent" />
      </div>

      {/* المحتوى فوق الصورة */}
      <div className="absolute inset-x-0 bottom-0 p-7 text-right sm:p-9">
        <div className="mb-3 flex items-center gap-3">
          <span className="badge-ember">
            <Bell size={12} />
            خبر رئيسي
          </span>
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#d5d0e8]">
            <Clock size={13} />
            {date ? new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          </span>
        </div>
        <h2 className="mb-2 max-w-2xl text-2xl font-black leading-[1.5] text-white sm:text-3xl">
          {item.title}
        </h2>
        <p className="max-w-2xl text-sm leading-7 text-[#d5d0e8] sm:text-base">
          {item.body || item.text}
        </p>
      </div>
    </motion.article>
  );
};

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
      socket.on('news:published', (story) => setNews((prev) => [story, ...prev]));
      socket.on('news:deleted', ({ id }) => setNews((prev) => prev.filter((n) => n.id !== id)));
      return () => {
        socket.off('news:published');
        socket.off('news:deleted');
      };
    }
  }, [socket]);

  const [featured, ...rest] = news;

  return (
    <main className="page-shell dir-rtl !max-w-6xl">
      {/* الترويسة */}
      <motion.header
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-10 text-center"
      >
        <span className="badge-violet mx-auto mb-4">
          <RadioTower size={13} />
          النشرة الرسمية للمخيم
        </span>
        <h1 className="text-3xl font-black text-white sm:text-4xl">
          الجريدة <span className="text-fire">الكشفية</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#a9a3c2]">
          التوجيهات والقرارات والتحديثات الصادرة من القيادة — تصلك لحظة بلحظة.
        </p>
      </motion.header>

      {loading ? (
        <LoadingSpinner label="جاري تحميل الأخبار..." />
      ) : news.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="لا توجد إعلانات حالياً"
          hint="ستظهر القرارات والتوجيهات هنا فور صدورها من قيادة المخيم"
        />
      ) : (
        <>
          {/* المانشيت */}
          {featured && <FeaturedNews item={featured} />}

          {/* باقي الأخبار */}
          {rest.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
};

export default News;
