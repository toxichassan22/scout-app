import { useState } from 'react';
import { ImagePlus, Send, X } from 'lucide-react';
import NewsCard from '../components/NewsCard';
import { useAuth } from '../context/AuthContext';
import { useCompetitions } from '../context/CompetitionContext';

const News = () => {
  const { user } = useAuth();
  const { news, addNews } = useCompetitions();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', text: '', photo: '' });
  const [fileName, setFileName] = useState('');

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار صورة فقط');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, photo: String(reader.result || '') }));
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setForm((current) => ({ ...current, photo: '' }));
    setFileName('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    addNews({ ...form, teamName: user.name });
    setForm({ title: '', text: '', photo: '' });
    setFileName('');
    setShowForm(false);
  };

  const approved = news.filter((item) => item.status === 'approved');
  const minePending = news.filter((item) => item.teamName === user.name && item.status === 'pending');

  return (
    <main className="page-shell max-w-5xl">
      <div className="tech-panel mb-6 flex items-center justify-between p-5">
        <button type="button" onClick={() => setShowForm((value) => !value)} className="btn-primary px-4 py-2">
          {showForm ? 'إغلاق' : 'إرسال خبر'}
        </button>
        <div className="text-right">
          <p className="section-kicker">لوحة الفرق</p>
          <h1 className="section-title">الأخبار</h1>
          <p className="text-sm text-slate-400">الأخبار تظهر بعد موافقة الأدمن.</p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <input className="input-field text-right" placeholder="عنوان الخبر" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          <textarea className="input-field h-32 resize-none text-right" placeholder="نص الخبر" value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} required />
          <div className="rounded-lg border border-dashed border-signal/30 bg-signal/10 p-4 text-right">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-3 font-bold text-signal shadow-sm">
              <span className="truncate">{fileName || 'إرفاق صورة من الجهاز'}</span>
              <ImagePlus size={20} />
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
            {form.photo && (
              <div className="mt-4">
                <img src={form.photo} alt="معاينة الصورة" className="max-h-56 w-full rounded-lg object-cover" />
                <button type="button" onClick={clearPhoto} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200">
                  حذف الصورة
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2">
            إرسال للمراجعة
            <Send size={18} />
          </button>
        </form>
      )}

      {minePending.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-right text-lg font-black text-accent">أخبارك قيد المراجعة</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {minePending.map((item) => (
              <NewsCard key={item.id} item={item} showStatus />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-right text-lg font-black text-slate-50">الأخبار المنشورة</h2>
        {approved.length === 0 ? (
          <div className="card py-16 text-center text-slate-400">لا توجد أخبار منشورة حالياً</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {approved.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default News;
