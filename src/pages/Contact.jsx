import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Heart, Send } from 'lucide-react';
import { FESTIVAL_DETAILS } from '../data/mockData';
import { useCompetitions } from '../context/CompetitionContext';

const Contact = () => {
  const { setDelegations } = useCompetitions();
  const [delName, setDelName] = useState('');
  const [delCount, setDelCount] = useState('');
  const [delAgency, setDelAgency] = useState('');
  const [delLeader, setDelLeader] = useState('');
  const [delPhone, setDelPhone] = useState('');
  const [success, setSuccess] = useState(false);

  const sparks = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 3 + 2}px`,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 6 + 5}s`,
    }));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    const newDelegation = {
      id: crypto.randomUUID(),
      name: delName,
      count: delCount,
      agency: delAgency,
      leader: delLeader,
      phone: delPhone,
      createdAt: new Date().toISOString()
    };

    setDelegations((prev) => [newDelegation, ...prev]);
    setSuccess(true);

    const text = `*بيانات تسجيل الوفد الكشفي المهرجان الرقمي*:\n\n` +
      `• *اسم الوفد:* ${delName}\n` +
      `• *عدد الأعضاء:* ${delCount}\n` +
      `• *الهيئة التابع لها:* ${delAgency}\n` +
      `• *اسم القائد:* ${delLeader}\n` +
      `• *رقم الهاتف:* ${delPhone}`;

    const encodedText = encodeURIComponent(text);
    const devWhatsApp = `https://wa.me/201015374789?text=${encodedText}`;
    const groupChatUrl = `https://chat.whatsapp.com/G5qWJtJ16yWHz2Yy4bY8X9`;

    setTimeout(() => {
      window.open(devWhatsApp, '_blank');
      window.location.href = groupChatUrl;
    }, 1000);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-5 relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.06), transparent 60%), #0a0f0a' }}>

      {/* Floating Sparks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        {sparks.map((spark) => (
          <span
            key={spark.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: spark.left,
              bottom: '-20px',
              width: spark.size,
              height: spark.size,
              backgroundColor: '#f59e0b',
              boxShadow: '0 0 6px #f59e0b, 0 0 12px #d97706',
              opacity: 0,
              animation: `floatUp ${spark.duration} infinite ease-in-out`,
              animationDelay: spark.delay,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-lg relative z-20 animate-fade-in">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 h-16 w-16 rounded-xl border border-white/10 bg-white/5 p-2 overflow-hidden">
            <img src={FESTIVAL_DETAILS.logo} alt="الشعار" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white">تسجيل وفود المهرجان</h1>
          <p className="text-slate-500 text-xs mt-1">سجل بيانات وفدك للانضمام إلى مجموعة المهرجان الرسمية وتأكيد الحضور</p>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#111a11]/80 backdrop-blur-md p-6 sm:p-8 shadow-2xl transition duration-300 hover:border-white/10">
          {success ? (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-lg font-black text-white">تم التسجيل بنجاح!</h2>
              <p className="text-xs text-slate-400 leading-6 max-w-xs mx-auto">
                جاري توجيهك الآن للجروب الكشفي الرسمي للمهرجان وفتح شات مخصص مع مطور النظام لتأكيد التسجيل.
              </p>
              <div className="animate-pulse text-xs text-emerald-400 font-bold">جاري الانتقال...</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">اسم الوفد</label>
                <input type="text" value={delName} onChange={(e) => setDelName(e.target.value)} required placeholder="مثال: وفد محافظة القاهرة" className="w-full rounded-xl bg-white/[0.03] border border-white/10 p-3 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">عدد الوفد</label>
                <input type="number" value={delCount} onChange={(e) => setDelCount(e.target.value)} required placeholder="أدخل عدد المشاركين" className="w-full rounded-xl bg-white/[0.03] border border-white/10 p-3 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">الهيئة التابع لها</label>
                <input type="text" value={delAgency} onChange={(e) => setDelAgency(e.target.value)} required placeholder="مثال: جمعية الكشافة البحرية المصرية" className="w-full rounded-xl bg-white/[0.03] border border-white/10 p-3 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">اسم قائد الوفد</label>
                <input type="text" value={delLeader} onChange={(e) => setDelLeader(e.target.value)} required placeholder="الاسم الكامل للقائد" className="w-full rounded-xl bg-white/[0.03] border border-white/10 p-3 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">رقم الهاتف (واتساب)</label>
                <input type="tel" value={delPhone} onChange={(e) => setDelPhone(e.target.value)} required placeholder="مثال: 01015374789" className="w-full rounded-xl bg-white/[0.03] border border-white/10 p-3 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <button type="submit" className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 flex items-center justify-center gap-2 transition active:scale-[0.98]">
                <span>إرسال البيانات والتوجيه للجروب</span>
                <Send size={16} />
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-white/[0.06] text-center mt-5">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-400 transition-colors">
              <ArrowRight size={14} />
              العودة للرئيسية
            </Link>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
          <span>صنع بكل</span>
          <Heart size={10} className="text-red-500 fill-red-500" />
          <span>لدعم مجتمع الكشافة الرقمي بمصر</span>
        </div>
      </div>
    </main>
  );
};

export default Contact;
