import React, { useState, useEffect } from 'react';
import { Newspaper, Plus, Trash2, Send, AlertTriangle, Search, Megaphone, Trophy } from 'lucide-react';
import { getNews, publishNews, deleteNews } from '../../services/api';

const CATEGORIES = [
  { id: 'ANNOUNCEMENT', label: 'توجيهات كشفية 📢' },
  { id: 'LOST_FOUND', label: 'مفقودات ميدانية 🔍' },
  { id: 'URGENT', label: 'بلاغ عاجل 🚨' },
  { id: 'SCORING', label: 'تنويه التقييم 🏆' },
];

const AdminNews = () => {
  const [news, setNews] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('توجيهات كشفية 📢');
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

  const handleQuickTemplate = (templateType) => {
    if (templateType === 'LOST') {
      setCategory('مفقودات ميدانية 🔍');
      setTitle('عثر على أمانات / مفقودات في أرض المهرجان');
      setBody('تم العثور على أمانات شخصية بالقرب من ساحة الفعاليات الرئيسية. على صاحب الأمانة التوجه إلى خيمة الإدارة ومقر القيادة لاستلامها.');
    } else if (templateType === 'URGENT') {
      setCategory('بلاغ عاجل 🚨');
      setTitle('تنبيه عاجل لجميع الفرق الكشفية');
      setBody('يرجى من جميع رؤساء الفرق والكتائب التجمع عند برج الإشارة الرئيسي لبدء جولة التقييم الكشفي الختامية.');
    } else if (templateType === 'SCORING') {
      setCategory('تنويه التقييم 🏆');
      setTitle('بدء رصد نقاط المسابقات الميدانية');
      setBody('تم الانتهاء من تقييم مسابقة الإرشادات والملاحة البحرية. يجري رصد وتحديث نتائج الساحة فوراً.');
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title || !body) return;
    setSubmitting(true);

    try {
      await publishNews({ title, body, category, photoUrl });
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
    if (!window.confirm('هل أنت متأكد من حذف هذا البلاغ؟')) return;
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
            نشر الأخبار والتوجيهات الميدانية
            <Newspaper size={24} className="text-[#38bdf8]" />
          </h1>
          <p className="text-slate-400 text-xs mt-1">البث المباشر للبلاغات العاجلة، المفقودات، وقرارات القيادة للفرق الكشفية</p>
        </div>
      </div>

      {/* Quick Template Shortcuts */}
      <div className="mb-6 flex flex-wrap items-center gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <span className="text-xs font-bold text-slate-300 ml-2">قوالب سريعة للقيادة:</span>
        <button
          type="button"
          onClick={() => handleQuickTemplate('LOST')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition"
        >
          <Search size={14} />
          بلاغ مفقودات 🔍
        </button>
        <button
          type="button"
          onClick={() => handleQuickTemplate('URGENT')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs font-bold text-red-400 hover:bg-red-500/20 transition"
        >
          <AlertTriangle size={14} />
          تنبيه عاجل 🚨
        </button>
        <button
          type="button"
          onClick={() => handleQuickTemplate('SCORING')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-xs font-bold text-sky-400 hover:bg-sky-500/20 transition"
        >
          <Trophy size={14} />
          تنويه التقييم 🏆
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Publish Form */}
        <div className="card p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Plus size={16} className="text-[#38bdf8]" />
            صياغة ونشر بلاغ جديد
          </h2>

          <form onSubmit={handlePublish} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">تصنيف البلاغ</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="ai-input text-right text-xs bg-slate-950 text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.label}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">عنوان البلاغ الرئيسية</label>
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
              <label className="block text-xs font-bold text-slate-400 mb-1">تفاصيل البلاغ</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="ai-input text-right text-xs min-h-[120px]"
                placeholder="اكتب تفاصيل التوجيه الكشفي أو المفقودات..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">رابط صورة (اختياري)</label>
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
              className="w-full py-2.5 rounded-xl bg-[#38bdf8] text-slate-950 font-black text-xs hover:bg-sky-400 transition flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/20"
            >
              <Send size={14} />
              بث البلاغ فوراً لأجهزة الفرق
            </button>
          </form>
        </div>

        {/* Published News List */}
        <div className="lg:col-span-2 card p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
          <h2 className="text-sm font-bold text-white mb-4">البلاغات المنشورة حالياً ({news.length})</h2>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">جاري تحميل البلاغات...</div>
          ) : (
            <div className="space-y-3">
              {news.map((n) => (
                <div key={n.id || n._id} className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start justify-between gap-4">
                  <button
                    onClick={() => handleDelete(n.id || n._id)}
                    className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-[#38bdf8]">
                        {n.category || 'توجيه كشفي'}
                      </span>
                      <h3 className="text-sm font-bold text-white">{n.title}</h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-2">{n.body}</p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString('ar-EG') : 'الآن'}
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
