import { useState } from 'react';
import { ArrowRight, Bug, CheckCircle2, Copy, ExternalLink, Headphones, Lightbulb, MessageCircle, Send, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SUPPORT_COMMUNITY_URL = 'https://chat.whatsapp.com/EvBemStijQ9DGUyDnehl81';

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
};

const Support = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [composed, setComposed] = useState('');
  const [copied, setCopied] = useState(false);

  const teamName = user?.label || user?.name || user?.teamName || user?.username || 'غير محدد';
  const personName = user?.deviceName || user?.name || 'غير محدد';

  const buildSupportMessage = (content) => (
    `اسم المجموعة: ${teamName}\n` +
    `اسم الشخص: ${personName}\n\n` +
    `محتوى الرسالة:\n${content}`
  );

  const openSupportChat = () => {
    window.open(SUPPORT_COMMUNITY_URL, '_blank', 'noopener,noreferrer');
  };

  const submitSuggestion = async event => {
    event.preventDefault();
    const content = message.trim();
    if (!content) return;
    const text = buildSupportMessage(content);
    window.open(SUPPORT_COMMUNITY_URL, '_blank', 'noopener,noreferrer');
    const didCopy = await copyText(text);
    setComposed(text);
    setCopied(didCopy);
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
          <h2 className="text-xl font-black text-white">جروب الدعم والمساعدة - واتساب</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">ادخل جروب الدعم وتواصل مباشرة مع لجنة التنظيم.</p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-200">فتح جروب الواتساب مباشرة <ArrowRight size={14} /></span>
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
            التفاصيل
            <textarea value={message} onChange={event => setMessage(event.target.value)} required maxLength={2000} rows={6} className="input-field resize-y leading-7" placeholder="اكتب المشكلة أو الاقتراح بالتفصيل..." />
          </label>
          {sent && (
            <div role="status" className="space-y-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
              <p className="flex items-center justify-center gap-2 text-center text-xs font-bold text-emerald-200">
                <CheckCircle2 size={15} />
                {copied ? 'تم نسخ الرسالة وفتح جروب الدعم. الصقها واضغط إرسال.' : 'تم فتح جروب الدعم. انسخ الرسالة والصقها ثم اضغط إرسال.'}
              </p>
              {composed && (
                <>
                  <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-3 text-right text-xs leading-7 text-slate-200">{composed}</pre>
                  <button type="button" onClick={async () => setCopied(await copyText(composed))} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-200">
                    <Copy size={14} /> {copied ? 'تم النسخ' : 'نسخ الرسالة'}
                  </button>
                </>
              )}
            </div>
          )}
          <button type="submit" className="btn-violet w-full !py-4"><Send size={17} /> إرسال للدعم الفني والمقترحات</button>
        </form>
      </section>
    </main>
  );
};

export default Support;
