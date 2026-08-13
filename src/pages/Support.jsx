import { useState } from 'react';
import { ArrowRight, Bug, CheckCircle2, ExternalLink, Headphones, Lightbulb, MessageCircle, Send, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SUPPORT_PHONE = '201022529346';
const SUPPORT_DISPLAY_PHONE = '+20 10 22529346';
const SUPPORT_NAME = 'القائدة جني محمد شوقي';
const SUPPORT_USERNAME = '@jjannaa_mmohammedd__';

function whatsappUrl(message) {
  return `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(message)}`;
}

const Support = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState('مشكلة تقنية');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const openSupportChat = () => {
    window.open(whatsappUrl('مرحباً، أحتاج مساعدة فنية في تطبيق المهرجان الرقمي.'), '_blank', 'noopener,noreferrer');
  };

  const submitSuggestion = event => {
    event.preventDefault();
    const content = message.trim();
    if (!content) return;
    window.open(whatsappUrl(`رسالة من الدعم الفني والمقترحات\n\nالتصنيف: ${category}\n\n${content}`), '_blank', 'noopener,noreferrer');
    setMessage('');
    setSent(true);
  };

  return (
    <main className="page-shell dir-rtl !max-w-5xl">
      <header className="mb-8 flex items-center justify-between gap-4">
        <button type="button" onClick={() => navigate('/home')} className="btn-ghost shrink-0 !px-4 !py-2 text-xs">
          <ArrowRight size={15} /> العودة
        </button>
        <div className="min-w-0 text-right">
          <span className="badge-cyan mb-2"><Headphones size={13} /> الدعم الفني</span>
          <h1 className="text-3xl font-black text-white sm:text-4xl">الدعم الفني والمقترحات</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">واجهت مشكلة أو عندك فكرة تطور تجربة المهرجان؟ ابعتلنا وسنساعدك بأسرع وقت.</p>
        </div>
      </header>

      <section className="mb-6 grid gap-5 md:grid-cols-2">
        <button type="button" onClick={openSupportChat} className="glass-sheen glass-cyan group min-w-0 p-6 text-right transition hover:-translate-y-1">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-300 transition group-hover:scale-105">
              <MessageCircle size={24} />
            </div>
            <ExternalLink size={18} className="text-cyan-300/60" />
          </div>
          <h2 className="text-xl font-black text-white">مجتمع الدعم والمساعدة - واتساب</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">انضم لمجتمع الدعم على واتساب للاستفسارات السريعة والتواصل المباشر مع لجنة التنظيم.</p>
          <div className="mt-4 space-y-1 rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-3 text-xs">
            <p className="font-black text-cyan-200">{SUPPORT_NAME}</p>
            <p dir="ltr" className="text-right text-slate-300">{SUPPORT_DISPLAY_PHONE}</p>
          </div>
          <span className="mt-5 inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-200">الانضمام لمجتمع الواتساب مباشرة <ArrowRight size={14} /></span>
        </button>

        <article className="glass-sheen glass-fern min-w-0 p-6 text-right">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-400/10 text-emerald-300">
              <Lightbulb size={24} />
            </div>
            <ShieldCheck size={20} className="text-emerald-300/60" />
          </div>
          <h2 className="text-xl font-black text-white">شاركنا اقتراحك</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">اقتراحاتك تساعدنا على تحسين البرنامج، المسابقات، الأنشطة وتجربة كل الفرق.</p>
          <div className="mt-5 flex items-center gap-2 text-xs font-bold text-emerald-300"><CheckCircle2 size={15} /> لا ترسل كلمات مرور أو مفاتيح API</div>
        </article>
      </section>

      <section className="glass-sheen glass-violet p-5 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="text-right">
            <span className="badge-violet mb-3"><Bug size={13} /> بلاغ أو مقترح</span>
            <h2 className="text-2xl font-black text-white">اكتب لنا التفاصيل</h2>
          </div>
          <Send size={26} className="shrink-0 text-cyan-300/60" />
        </div>

        <form onSubmit={submitSuggestion} className="grid gap-4">
          <label className="grid gap-2 text-right text-xs font-black text-slate-300">
            نوع الرسالة
            <select value={category} onChange={event => setCategory(event.target.value)} className="input-field">
              <option>مشكلة تقنية</option>
              <option>اقتراح تطوير</option>
              <option>مشكلة في مسابقة</option>
              <option>استفسار عام</option>
            </select>
          </label>
          <label className="grid gap-2 text-right text-xs font-black text-slate-300">
            التفاصيل
            <textarea value={message} onChange={event => setMessage(event.target.value)} required maxLength={2000} rows={6} className="input-field resize-y leading-7" placeholder="اكتب المشكلة أو الاقتراح بالتفصيل..." />
          </label>
          {sent && <p role="status" className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-center text-xs font-bold text-emerald-200"><CheckCircle2 size={15} /> تم تجهيز الرسالة وفتح واتساب للدعم.</p>}
          <button type="submit" className="btn-violet w-full !py-4"><Send size={17} /> إرسال للدعم الفني والمقترحات</button>
        </form>
      </section>
    </main>
  );
};

export default Support;
