import React, { useEffect, useState, useRef } from 'react';
import { Newspaper, Pencil, Send, Trash2, X, Upload, Link as LinkIcon, Image as ImageIcon, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { deleteNews, getAdminTeams, getNews, publishNews, updateNews } from '../../services/api';
import AdminBackLink from '../../components/AdminBackLink';

const CATEGORIES = [
  { id: 'general', label: 'عام 📢', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  { id: 'lost_found', label: 'مفقودات 🔍', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'urgent', label: 'عاجل 🚨', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { id: 'scoring', label: 'التقييم 🏆', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
];

const empty = { title: '', body: '', photoUrl: '', category: 'general', targetTeamIds: [] };

/**
 * Smart image compressor: resizes image client-side to max 1280px maintaining aspect ratio
 * and encodes to WebP/JPEG data URL for ultra-fast storage and rendering.
 */
const compressImageFile = (file, maxDimension = 1280, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('الملف المختار ليس صورة صالحة'));
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل في قراءة ملف الصورة'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('تعذر تحميل الصورة؛ الملف قد يكون تالفاً'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first for optimal compression, fallback to JPEG
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData && webpData.startsWith('data:image/webp')) {
            return resolve(webpData);
          }
        } catch {}
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const AdminNews = () => {
  const [news, setNews] = useState([]);
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [imageTab, setImageTab] = useState('upload'); // 'upload' | 'url'
  const [dragActive, setDragActive] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef(null);

  const load = async () => {
    try {
      const [n, t] = await Promise.all([getNews(), getAdminTeams()]);
      setNews(n);
      setTeams(t);
    } catch (err) {
      console.error('Failed to load news/teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const toggleTeam = (id) =>
    setForm((p) => ({
      ...p,
      targetTeamIds: p.targetTeamIds.includes(id)
        ? p.targetTeamIds.filter((x) => x !== id)
        : [...p.targetTeamIds, id],
    }));

  const selectAllTeams = () => setForm((p) => ({ ...p, targetTeamIds: [] }));

  const reset = () => {
    setForm(empty);
    setEditing(null);
    setImageError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const edit = (n) => {
    setEditing(n.id);
    setForm({
      title: n.title,
      body: n.body,
      photoUrl: n.photoUrl || '',
      category: n.category || 'general',
      targetTeamIds: Array.isArray(n.targetTeamIds) ? n.targetTeamIds : [],
    });
    setImageError('');
    // Switch tab depending on existing photoUrl type
    if (n.photoUrl?.startsWith('http://') || n.photoUrl?.startsWith('https://')) {
      setImageTab('url');
    } else {
      setImageTab('upload');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageFile = async (file) => {
    if (!file) return;
    setImageError('');
    setProcessingImage(true);
    try {
      if (file.size > 20 * 1024 * 1024) {
        throw new Error('حجم الصورة الأصلي كبير جداً (الحد الأقصى 20MB)');
      }
      const base64 = await compressImageFile(file);
      setForm((p) => ({ ...p, photoUrl: base64 }));
    } catch (err) {
      setImageError(err.message || 'فشل معالجة الصورة');
    } finally {
      setProcessingImage(false);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const removePhoto = () => {
    setForm((p) => ({ ...p, photoUrl: '' }));
    setImageError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      alert('يرجى كتابة عنوان ومحتوى الخبر');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await updateNews(editing, form);
      } else {
        await publishNews(form);
      }
      reset();
      await load();
    } catch (err) {
      alert(err.message || 'حدث خطأ أثناء حفظ الخبر');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الخبر؟')) return;
    try {
      await deleteNews(id);
      await load();
    } catch (e) {
      alert(e.message || 'فشل حذف الخبر');
    }
  };

  return (
    <div className="p-4 sm:p-6 text-right dir-rtl text-white max-w-7xl mx-auto">
      <AdminBackLink />
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
          الأخبار الموجهة <Newspaper className="text-sky-400" />
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          إنشاء وتعديل ونشر الأخبار العامة أو المخصصة لفرق محددة مع إمكانية رفع الصور محلياً من جهازك أو برابط مباشر
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* News Creation / Editing Form */}
        <form onSubmit={submit} className="card p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <h2 className="font-black text-base sm:text-lg flex items-center gap-2">
              {editing ? (
                <>
                  <Pencil className="text-amber-400" size={18} />
                  تعديل الخبر
                </>
              ) : (
                <>
                  <Send className="text-sky-400" size={18} />
                  نشر خبر جديد
                </>
              )}
            </h2>
            {editing && (
              <button
                type="button"
                onClick={reset}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition"
              >
                <X size={14} /> إلغاء التعديل
              </button>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">تصنيف الخبر</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => {
                const isSelected = form.category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm({ ...form, category: c.id })}
                    className={`py-2 px-3 rounded-xl text-xs font-black border transition text-center ${
                      isSelected
                        ? `${c.color} border-current shadow-sm`
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">عنوان الخبر *</label>
            <input
              className="ai-input w-full bg-slate-950"
              placeholder="مثال: تعليمات التجمع الصباحي وموقع أرض النشاط"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">محتوى وتفاصيل الخبر *</label>
            <textarea
              className="ai-input w-full min-h-28 bg-slate-950 leading-relaxed"
              placeholder="اكتب تفاصيل التوجيه أو الإعلان هنا بالتفصيل..."
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              required
            />
          </div>

          {/* Image Upload / Link Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-amber-400" />
                صورة الخبر (اختياري)
              </label>

              {/* Mode Switcher */}
              <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setImageTab('upload')}
                  className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                    imageTab === 'upload' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Upload size={12} /> من الجهاز
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('url')}
                  className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                    imageTab === 'url' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LinkIcon size={12} /> رابط URL
                </button>
              </div>
            </div>

            {imageError && (
              <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                {imageError}
              </div>
            )}

            {/* Photo Preview if photoUrl is set */}
            {form.photoUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 p-2 space-y-2">
                <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black/40">
                  <img
                    src={form.photoUrl}
                    alt="معاينة صورة الخبر"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="p-1.5 rounded-lg bg-red-600/90 text-white hover:bg-red-700 shadow-md transition"
                      title="حذف الصورة"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 size={12} /> تم إرفاق الصورة بنجاح
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (imageTab === 'upload') {
                        fileInputRef.current?.click();
                      } else {
                        setForm((p) => ({ ...p, photoUrl: '' }));
                      }
                    }}
                    className="text-sky-400 hover:underline font-bold"
                  >
                    تغيير الصورة
                  </button>
                </div>
              </div>
            ) : (
              /* No Image Yet: Render either Local Upload or URL Input */
              <div>
                {imageTab === 'upload' ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition flex flex-col items-center justify-center gap-2 ${
                      dragActive
                        ? 'border-sky-400 bg-sky-500/10'
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    {processingImage ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-sky-300 py-2">
                        <RefreshCw size={16} className="animate-spin" />
                        جاري معالجة وضغط الصورة...
                      </div>
                    ) : (
                      <>
                        <div className="h-10 w-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-sky-400">
                          <Upload size={18} />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-slate-200">
                            اضغط لاختيار صورة من جهازك
                          </p>
                          <p className="text-[10px] text-slate-500">
                            أو اسحب الصورة وأفلتها هنا (PNG, JPG, WEBP)
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="url"
                      className="ai-input w-full bg-slate-900 text-xs"
                      placeholder="https://example.com/image.jpg"
                      value={form.photoUrl}
                      onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                    />
                    <p className="text-[10px] text-slate-500">
                      الصق رابط مباشر لصورة من الإنترنت بصيغة JPG أو PNG أو WebP
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Target Teams */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300">
                الفرق المستهدفة ({form.targetTeamIds.length === 0 ? 'منشور للجميع' : `${form.targetTeamIds.length} فريق`})
              </label>
              {form.targetTeamIds.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllTeams}
                  className="text-[10px] text-sky-400 hover:underline font-bold"
                >
                  تعيين للجميع
                </button>
              )}
            </div>
            <div className="max-h-36 overflow-y-auto grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              {teams.map((t) => {
                const checked = form.targetTeamIds.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={`text-xs p-2 rounded-lg border transition cursor-pointer flex items-center gap-2 ${
                      checked
                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-200 font-bold'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTeam(t.id)}
                      className="rounded accent-sky-500"
                    />
                    <span className="truncate">{t.label || t.name}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">عدم اختيار أي فريق يعني أن الخبر سيظهر لكل الفرق المشاركة.</p>
          </div>

          {/* Submit Button */}
          <button
            disabled={submitting || processingImage}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-black flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition disabled:opacity-50"
          >
            <Send size={16} />
            {submitting ? 'جاري الحفظ والتعميم...' : editing ? 'حفظ تعديلات الخبر' : 'نشر وتعميم الخبر 📢'}
          </button>
        </form>

        {/* Published News List */}
        <section className="lg:col-span-2 card p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h2 className="font-black text-lg text-white">الأخبار المنشورة ({news.length})</h2>
            <span className="text-xs text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              تحديث فوري ⚡
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
              <RefreshCw className="animate-spin" size={16} /> جاري تحميل الأخبار...
            </div>
          ) : news.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              لا توجد أخبار منشورة حالياً. استخدم النموذج لنشر أول خبر.
            </div>
          ) : (
            <div className="space-y-3.5">
              {news.map((n) => {
                const categoryObj = CATEGORIES.find((c) => c.id === n.category);
                const hasPhoto = Boolean(n.photoUrl || n.photo);
                const photoSrc = n.photoUrl || n.photo;
                const isTargeted = Array.isArray(n.targetTeamIds) && n.targetTeamIds.length > 0;

                return (
                  <article
                    key={n.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-3">
                      {/* Actions */}
                      <div className="flex items-center gap-2 order-2 sm:order-1 self-end sm:self-start">
                        <button
                          onClick={() => edit(n)}
                          className="p-2 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20 transition"
                          title="تعديل الخبر"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => remove(n.id)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/20 transition"
                          title="حذف الخبر"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Content & Meta */}
                      <div className="flex-1 order-1 sm:order-2">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span
                            className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                              categoryObj?.color || 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {categoryObj?.label || n.category}
                          </span>
                          <h3 className="font-bold text-white text-base leading-snug">{n.title}</h3>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 my-2">{n.body}</p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2">
                          <span className={isTargeted ? 'text-sky-400 font-bold' : 'text-slate-400'}>
                            {isTargeted
                              ? `🎯 موجه إلى ${n.targetTeamIds.length} فريق`
                              : '🌐 منشور لجميع الفرق'}
                          </span>
                          {n.createdAt && (
                            <span>
                              🕒 {new Date(n.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}{' '}
                              - {new Date(n.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Image Thumbnail if available */}
                      {hasPhoto && (
                        <div className="sm:w-28 sm:h-20 w-full h-36 rounded-lg overflow-hidden border border-slate-800 shrink-0 bg-slate-900 order-3">
                          <img
                            src={photoSrc}
                            alt={n.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminNews;
