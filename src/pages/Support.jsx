import { ArrowRight, ExternalLink, Headphones, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SUPPORT_COMMUNITY_URL = 'https://chat.whatsapp.com/EvBemStijQ9DGUyDnehl81';

const Support = () => {
  const navigate = useNavigate();

  const openSupportChat = () => {
    window.open(SUPPORT_COMMUNITY_URL, '_blank', 'noopener,noreferrer');
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
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">واجهت مشكلة أو عندك فكرة تطور تجربة المهرجان؟ ادخل جروب الدعم واكتب رسالتك مباشرة.</p>
        </div>
      </header>

      <section className="glass-sheen glass-cyan p-6 text-right sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-300">
            <MessageCircle size={24} />
          </div>
          <ExternalLink size={20} className="text-cyan-300/60" />
        </div>
        <h2 className="text-2xl font-black text-white">جروب الدعم والمساعدة - واتساب</h2>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-slate-400">اضغط الزر للانتقال إلى جروب الدعم، ثم اكتب البلاغ أو المقترح مباشرة هناك.</p>
        <button type="button" onClick={openSupportChat} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-200 transition hover:bg-cyan-300/20">
          فتح جروب الدعم والمقترحات <ArrowRight size={16} />
        </button>
      </section>
    </main>
  );
};

export default Support;
