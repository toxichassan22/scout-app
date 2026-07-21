import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronDown,
  LogIn,
  MapPin,
  ShieldCheck,
  Trophy,
  Users,
  Flame,
  TreePine,
  Zap,
  Sparkles,
  ArrowLeft,
  X,
  Award,
  Video,
  Globe,
  HelpCircle,
  ExternalLink,
  Shield,
  Key,
  Compass,
  Play,
  RotateCcw
} from 'lucide-react';
import { FESTIVAL_DETAILS } from '../data/mockData';
import Countdown from '../components/Countdown';

const Landing = () => {
  const navigate = useNavigate();
  const [portalModalOpen, setPortalModalOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  // 8 Official Zones from Center Map (س.jpeg)
  const officialZones = [
    { num: '١', name: 'مبنى الإدارة', color: 'border-red-500/40 text-red-400 bg-red-500/10' },
    { num: '٢', name: 'مبنى الأنشطة (الورش والـ AI)', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
    { num: '٣', name: 'المسجد', color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
    { num: '٤', name: 'المبنى الجديد', color: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
    { num: '٥', name: 'المخيم الكشفي', color: 'border-purple-500/40 text-purple-400 bg-purple-500/10' },
    { num: '٦', name: 'ملعب كرة القدم', color: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' },
    { num: '٧', name: 'ملعب كرة السلة', color: 'border-pink-500/40 text-pink-400 bg-pink-500/10' },
    { num: '٨', name: 'ملعب الخماسي', color: 'border-teal-500/40 text-teal-400 bg-teal-500/10' },
  ];

  const faqs = [
    { q: 'كيف يبدأ الفريق الكشفي المنافسة؟', a: 'يقوم قائد الفريق بالضغط على "دخول المنظومة"، واختيار بوابة الفريق، ثم إدخال اسم المستخدم وكلمة السر المخصصة.' },
    { q: 'هل نتائج المسابقات مجهولة ومباشرة؟', a: 'نعم، تظهر نتائج الفرق في جدول المتصدرين لحظياً دون إظهار أي أسماء فرق للمنافسين لتأمين سرية الهوية والعدالة.' },
    { q: 'كيف يعمل التحكيم الميداني بالـ QR Code؟', a: 'يدخل المحكّم بوابته المخصصة، ثم يدخل كود المسابقة (Passcode) ليظهر له شيت التقييم الذكي لرصد درجات الفرق فورياً.' },
    { q: 'أين يقام المهرجان وما أقرب نقطة وصول؟', a: 'يقام المهرجان في مركز شباب منشية التحرير (شارع متحف المطرية - عين شمس بالقاهرة)، وأقرب محطة هي مترو عين شمس.' }
  ];

  return (
    <main className="min-h-screen bg-[#050806] text-right dir-rtl text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-white relative overflow-hidden">
      
      {/* Background Ambient Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-emerald-600/15 via-amber-500/5 to-transparent blur-[140px] pointer-events-none z-0" />

      {/* Header / Navbar */}
      <header className="fixed top-0 inset-x-0 z-40 bg-slate-950/70 backdrop-blur-xl border-b border-emerald-500/15 shadow-xl">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          
          <button
            onClick={() => setPortalModalOpen(true)}
            className="command-button text-xs py-2.5 px-6 flex items-center gap-2.5 shadow-glow-green hover:scale-105 transition"
          >
            <LogIn size={16} />
            <span>دخول المنظومة</span>
          </button>

          {/* Logo & Branding */}
          <div className="flex items-center gap-3.5">
            <div className="text-right">
              <h1 className="text-sm font-black text-white leading-tight">{FESTIVAL_DETAILS.name}</h1>
              <span className="text-[11px] font-bold text-amber-400 tracking-tight">{FESTIVAL_DETAILS.subtitle} • {FESTIVAL_DETAILS.slogan}</span>
            </div>
            <div className="h-11 w-11 rounded-full border-2 border-emerald-500/40 bg-slate-900 p-0.5 shadow-glow-green overflow-hidden shrink-0">
              <img src="/logo.png" alt="شعار المهرجان" className="h-full w-full object-contain" />
            </div>
          </div>

        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-44 pb-20 px-6 max-w-5xl mx-auto text-center z-10">
        
        {/* Emblem Showcase Badge */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-3 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-xs font-black text-emerald-300 backdrop-blur-md mb-8 shadow-glow-green"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <span>المهرجان 30 • 21 أغسطس 2026</span>
        </motion.div>

        {/* Hero Title & Logo */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7 }}
            className="relative group"
          >
            <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-emerald-500 to-amber-500 opacity-30 blur-2xl group-hover:opacity-50 transition duration-700" />
            <img
              src="/logo.png"
              alt="شعار المهرجان الكشفي"
              className="relative h-44 w-44 sm:h-52 sm:w-52 object-contain drop-shadow-[0_0_35px_rgba(16,185,129,0.3)]"
            />
          </motion.div>

          <div className="text-center md:text-right max-w-xl">
            <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4 tracking-tight">
              كشفية بفكر ديجيتال
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-medium">
              المنظومة الرقمية الموحدة لربط الفرق الكشفية، شيتات التحكيم الميدانية، والنتائج اللحظية المجهولة بمركز شباب منشية التحرير.
            </p>
          </div>
        </div>

        {/* CTA Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
          <button
            onClick={() => setPortalModalOpen(true)}
            className="command-button text-base px-9 py-4 flex items-center gap-3 shadow-glow-green hover:scale-105 transition"
          >
            <LogIn size={20} />
            <span>ادخل إلى بوابتك الآن</span>
          </button>
          
          <a
            href="#zones"
            className="glass-card px-7 py-4 rounded-2xl text-sm font-extrabold text-slate-200 hover:text-emerald-400 border-white/10 hover:border-emerald-500/30 flex items-center gap-2 transition"
          >
            <Compass size={18} className="text-emerald-400" />
            <span>استكشف خريطة المركز</span>
          </a>
        </div>

        {/* Key Fast Facts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          <div className="glass-card p-4 rounded-2xl border-white/10 text-center">
            <span className="text-xl sm:text-2xl font-black text-emerald-400 block">٢١ أغسطس</span>
            <span className="text-[11px] font-bold text-slate-400">موعد الانطلاق 2026</span>
          </div>
          <div className="glass-card p-4 rounded-2xl border-white/10 text-center">
            <span className="text-xl sm:text-2xl font-black text-amber-400 block">٨ مناطق</span>
            <span className="text-[11px] font-bold text-slate-400">خريطة المعسكر</span>
          </div>
          <div className="glass-card p-4 rounded-2xl border-white/10 text-center">
            <span className="text-xl sm:text-2xl font-black text-cyan-400 block">٤ تحديات</span>
            <span className="text-[11px] font-bold text-slate-400">رقمية وميدانية</span>
          </div>
          <div className="glass-card p-4 rounded-2xl border-white/10 text-center">
            <span className="text-xl sm:text-2xl font-black text-purple-400 block">Sockets</span>
            <span className="text-[11px] font-bold text-slate-400">نتائج لحظية آمنة</span>
          </div>
        </div>

      </section>

      {/* Countdown Section */}
      <section className="py-12 px-6 max-w-4xl mx-auto z-10 relative">
        <div className="glass-card-emerald p-8 sm:p-10 rounded-3xl text-center border border-emerald-500/30 shadow-2xl">
          <span className="text-xs font-black text-emerald-300 uppercase tracking-widest bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 inline-block mb-6">
            متبقي على انطلاق الفعالية الكشفية
          </span>
          <Countdown targetDate={FESTIVAL_DETAILS.startDate} />
        </div>
      </section>

      {/* Official Map & 8 Zones Section */}
      <section id="zones" className="py-20 px-6 max-w-5xl mx-auto z-10 relative border-t border-white/5">
        <div className="text-center mb-12">
          <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 rounded-full">
            خريطة مركز شباب منشية التحرير
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white mt-3">مناطق المهرجان الـ ٨ الرسمية</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-2">شارع متحف المطرية - عين شمس الشرقية - القاهرة</p>
        </div>

        {/* 8 Zones Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {officialZones.map((zone, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border ${zone.color} transition hover:scale-105 text-right flex items-center justify-between`}
            >
              <span className="text-xs font-black">{zone.name}</span>
              <span className="h-7 w-7 rounded-xl font-black text-xs flex items-center justify-center border border-current">
                {zone.num}
              </span>
            </div>
          ))}
        </div>

        {/* Official Map Card Link */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-950/80">
          <div className="text-right">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <MapPin size={20} className="text-emerald-400" />
              مقر وموقع المعسكر الكشفي
            </h3>
            <p className="text-xs text-slate-300 mt-1">شارع متحف المطرية، عين شمس (أقرب محطة: مترو عين شمس)</p>
          </div>

          <a
            href="https://maps.app.goo.gl/VnjxULqUY7dTXxeA6"
            target="_blank"
            rel="noopener noreferrer"
            className="command-button text-xs py-3 px-6 flex items-center gap-2 shadow-glow-green shrink-0"
          >
            <ExternalLink size={15} />
            <span>فتح الخريطة على Google Maps</span>
          </a>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6 max-w-3xl mx-auto z-10 relative">
        <h2 className="text-xl sm:text-2xl font-black text-white text-center mb-8">أسئلة وإرشادات تهمك</h2>
        
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div key={idx} className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-right flex items-center justify-between font-black text-xs sm:text-sm text-white hover:text-emerald-300"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle size={18} className="text-amber-400 shrink-0" />
                    {faq.q}
                  </span>
                  <span>{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6 text-center text-xs text-slate-500 bg-slate-950/90">
        <p className="font-bold text-slate-300">{FESTIVAL_DETAILS.name} • {FESTIVAL_DETAILS.subtitle}</p>
        <p className="text-[10px] text-slate-500 mt-1">{FESTIVAL_DETAILS.location}</p>
      </footer>

      {/* PORTAL SELECTOR MODAL (Ultra Clean & Sleek) */}
      <AnimatePresence>
        {portalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg glass-card p-6 sm:p-8 rounded-3xl border border-emerald-500/30 bg-slate-950 shadow-2xl text-right dir-rtl"
            >
              {/* Close Button */}
              <button
                onClick={() => setPortalModalOpen(false)}
                className="absolute top-5 left-5 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>

              <div className="mb-6 text-center">
                <div className="h-12 w-12 mx-auto mb-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow-green">
                  <Shield size={24} />
                </div>
                <h3 className="text-xl font-black text-white">اختر البوابة للدخول</h3>
                <p className="text-xs text-slate-400 mt-1">حدد طبيعة حسابك للانتقال إلى شاشة الدخول المخصصة</p>
              </div>

              {/* Portal Options Cards */}
              <div className="space-y-3">
                
                {/* 1. Team Portal */}
                <button
                  onClick={() => { setPortalModalOpen(false); navigate('/login'); }}
                  className="w-full p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-right flex items-center justify-between group transition"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">بوابة الفرق الكشفية</p>
                      <p className="text-[11px] text-slate-400">للكتائب والفرق المشاركة في التحديات</p>
                    </div>
                  </div>
                  <ArrowLeft size={18} className="text-emerald-400 group-hover:-translate-x-1 transition" />
                </button>

                {/* 2. Judge Portal */}
                <button
                  onClick={() => { setPortalModalOpen(false); navigate('/judge/login'); }}
                  className="w-full p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-right flex items-center justify-between group transition"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
                      <Award size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">بوابة المحكّمين والقضاة</p>
                      <p className="text-[11px] text-slate-400">لإدخال كود المسابقة ورصد التقييمات</p>
                    </div>
                  </div>
                  <ArrowLeft size={18} className="text-amber-400 group-hover:-translate-x-1 transition" />
                </button>

                {/* 3. Admin Portal */}
                <button
                  onClick={() => { setPortalModalOpen(false); navigate('/admin/login'); }}
                  className="w-full p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-right flex items-center justify-between group transition"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-110 transition">
                      <Key size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">لوحة تحكم الأدمن (إدارة المهرجان)</p>
                      <p className="text-[11px] text-slate-400">للإدارة الكاملة والأخبار والمسابقات</p>
                    </div>
                  </div>
                  <ArrowLeft size={18} className="text-blue-400 group-hover:-translate-x-1 transition" />
                </button>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
};

export default Landing;
