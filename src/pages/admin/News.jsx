import React, { useState, useEffect } from 'react';
import { Newspaper, Plus, Trash2, Send } from 'lucide-react';
import { getNews, publishNews, deleteNews } from '../../services/api';

const AdminNews = () => {
  const [news, setNews] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchNewsList();
  }, []);

  const fetchNewsList = async () => {
    try {
      const data = await getNews();
      setNews(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title || !body) return;
    setSubmitting(true);

    try {
      await publishNews({ title, body, photoUrl });
      setTitle('');
      setBody('');
      setPhotoUrl('');
      fetchNewsList();
    } catch (err) {
      alert(err.message || 'فشل في نشر الخبر');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الخبر؟')) return;
    try {
      await deleteNews(id);
      fetchNewsList();
    } catch (err) {
      alert('فشل الحذف');
    }
  };

  return (
    <div className="p-6 text-right dir-rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            نشر الأخبار والإعلانات الرسمية
            <Newspaper size={24} className="text-primary" />
          </h1>
          <p className="text-slate-400 text-xs mt-1">النشر المباشر للأخبار وتحديث أجهزة الفرق في الوقت الفعلي</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Publish Form */}
        <div className="card p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Plus size={16} className="text-primary" />
            صياغة ونشر خبر جديد
          </h2>

          <form onSubmit={handlePublish} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">عنوان الخبر الرئيسي</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="ai-input text-right text-xs"
                placeholder="أدخل عنوان التوجيه أو الإعلان"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">تفاصيل الخبر</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="ai-input text-right text-xs min-h-[120px]"
                placeholder="اكتب تفاصيل التوجيه الكشفي..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">رابط صورة التقرير (اختياري)</label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="ai-input text-right text-xs"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-primary text-slate-950 font-black text-xs hover:bg-emerald-400 transition flex items-center justify-center gap-1.5 shadow-glow-green"
            >
              <Send size={14} />
              نشر الخبر فوراً لجميع الفرق
            </button>
          </form>
        </div>

        {/* Published News List */}
        <div className="lg:col-span-2 card p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
          <h2 className="text-sm font-bold text-white mb-4">الأخبار المنشورة حالياً ({news.length})</h2>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">جاري تحميل الأخبار...</div>
          ) : (
            <div className="space-y-3">
              {news.map((n) => (
                <div key={n.id} className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start justify-between gap-4">
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white mb-1">{n.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-2">{n.body}</p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(n.createdAt).toLocaleString('ar-EG')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminNews;
