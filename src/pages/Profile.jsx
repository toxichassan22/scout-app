import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, LogOut, Shield, Lock, Award, Fingerprint, Flame, Trophy, Star, CheckCircle, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompetitions } from '../context/CompetitionContext';
import { useNavigate } from 'react-router-dom';
import { FESTIVAL_DETAILS } from '../data/mockData';

const Profile = () => {
  const { user, logout } = useAuth();
  const { submissions } = useCompetitions();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const teamName = user?.label || user?.name || user?.username || 'فرقة الصقور';
  const myReportsCount = submissions.filter(
    (s) => (s.teamName === teamName || s.teamName === user?.username) && s.data?.type === 'report'
  ).length;

  return (
    <main className="page-shell dir-rtl flex min-h-[85vh] flex-col items-center justify-center relative">
      {/* ═══ خلفية فيديو / صورة خلفية متفاعلة للملف الشخصي ═══ */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-20">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
          poster="https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=1920&q=80"
        >
          <source src="https://assets.mixkit.co/videos/preview/mixkit-camp-fire-in-the-middle-of-the-forest-41655-large.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#07060c] via-[#07060c]/80 to-[#07060c]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl z-10"
      >
        {/* ═══ بطاقة الهوية الرقمية الكشفية (SCOUT ID CARD) ═══ */}
        <div className="hud-frame glass-sheen relative overflow-hidden rounded-[2.5rem] border border-[rgba(245,158,11,0.35)] bg-gradient-to-b from-[rgba(20,16,38,0.95)] via-[rgba(12,10,22,0.92)] to-[rgba(7,6,12,0.98)] p-7 sm:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_50px_-15px_rgba(139,92,246,0.3)] backdrop-blur-2xl">
          
          {/* Glowing Top Ambient Line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#f59e0b] to-transparent opacity-80" />

          {/* Header Row: Shield Icon & Scout ID Badge */}
          <div className="relative z-10 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.12)] text-[#fcd34d]">
                <ShieldCheck size={22} />
              </div>
              <span className="badge-ember text-xs font-black">
                بطاقة الكشاف الموثّقة
              </span>
            </div>

            <div className="text-left" dir="ltr">
              <p className="font-mono text-xs font-black tracking-widest text-[#f59e0b]">SCOUT ID • 2026</p>
              <p className="font-mono text-[9px] font-bold text-[#6e6889]">DIGITAL SCOUT CAMP</p>
            </div>
          </div>

          {/* Main Info Block: Emblem & Team Name & Leader */}
          <div className="relative z-10 mb-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-right">
            {/* Glowing Avatar Emblem Box */}
            <motion.div
              whileHover={{ scale: 1.05, rotate: 2 }}
              className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-[2rem] border-2 border-[rgba(245,158,11,0.5)] bg-gradient-to-br from-[rgba(245,158,11,0.25)] via-[rgba(139,92,246,0.2)] to-[rgba(7,6,12,0.9)] shadow-[0_0_35px_rgba(245,158,11,0.4)] p-4"
            >
              <Flame size={48} className="animate-flame text-[#fcd34d]" />
              <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl border-2 border-[#0c0a16] bg-[#10b981] text-xs font-black text-[#052e1f] shadow-lg">
                ✓
              </span>
            </motion.div>

            {/* Team Details */}
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                {teamName}
              </h1>
              <p className="mt-1.5 text-sm font-bold text-[#a9a3c2]">
                قائد: <span className="text-white">{user?.leaderName || 'أحمد الكشاف'}</span>
              </p>
              <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <span className="flex items-center gap-1.5 text-xs font-black text-[#6ee7b7]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10b981] animate-pulse" />
                  متصل الآن بالساحة
                </span>
                <span className="text-[#6e6889]">|</span>
                <span className="text-xs font-mono text-[#a78bfa]" dir="ltr">@{user?.username || 'scout_team'}</span>
              </div>
            </div>
          </div>

          <div className="divider-glow relative z-10 mb-7" />

          {/* ═══ STATS GRID — المركز / النقاط / الشارات والتقارير ═══ */}
          <div className="relative z-10 grid grid-cols-3 gap-3.5 mb-8">
            {/* 1. المركز */}
            <motion.div
              whileHover={{ y: -3 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)] p-4 text-center shadow-[0_0_20px_rgba(245,158,11,0.15)]"
            >
              <Trophy size={20} className="text-[#fcd34d] mb-1" />
              <span className="text-xl sm:text-2xl font-black text-[#fcd34d]">الأول</span>
              <span className="text-[10px] font-bold text-[#a9a3c2] mt-1">المركز</span>
            </motion.div>

            {/* 2. النقاط */}
            <motion.div
              whileHover={{ y: -3 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-[rgba(139,92,246,0.35)] bg-[rgba(139,92,246,0.08)] p-4 text-center shadow-[0_0_20px_rgba(139,92,246,0.15)]"
            >
              <Star size={20} className="text-[#c4b5fd] mb-1" />
              <span className="font-mono text-xl sm:text-2xl font-black text-white" dir="ltr">2840</span>
              <span className="text-[10px] font-bold text-[#a9a3c2] mt-1">النقاط</span>
            </motion.div>

            {/* 3. الشارات / التقارير */}
            <motion.div
              whileHover={{ y: -3 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.08)] p-4 text-center shadow-[0_0_20px_rgba(16,185,129,0.15)]"
            >
              <Award size={20} className="text-[#6ee7b7] mb-1" />
              <span className="font-mono text-xl sm:text-2xl font-black text-[#6ee7b7]" dir="ltr">
                {myReportsCount}/24
              </span>
              <span className="text-[10px] font-bold text-[#a9a3c2] mt-1">تقارير مرفوعة</span>
            </motion.div>
          </div>

          {/* Additional Info Rows */}
          <div className="relative z-10 space-y-3 mb-6">
            <div className="flex items-center justify-between rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(7,6,12,0.5)] p-4">
              <span className="badge-fern !text-[11px]">نشط وتفاعلي</span>
              <div className="flex items-center gap-2 text-xs font-bold text-[#a9a3c2]">
                حالة العضوية
                <Shield size={16} className="text-[#6ee7b7]" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(7,6,12,0.5)] p-4">
              <span className="badge-violet !text-[11px]">محجوبة حتى الختام 🔥</span>
              <div className="flex items-center gap-2 text-xs font-bold text-[#a9a3c2]">
                خصوصية الترتيب
                <Lock size={16} className="text-[#a78bfa]" />
              </div>
            </div>
          </div>

          {/* Footer ID Details */}
          <div className="relative z-10 flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.08)] text-[11px] font-mono text-[#6e6889]">
            <span dir="ltr">انضم: 1 رجب 1447</span>
            <span dir="ltr">ID: SCT-2026-0142</span>
          </div>
        </div>

        {/* ═══ زران: رفع تقرير جديد + الخروج ═══ */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <button
            onClick={() => navigate('/upload-report')}
            className="btn-ember btn-shine w-full !py-4 text-sm font-black"
          >
            <FileText size={18} />
            رفع تقرير جديد
          </button>

          <button
            onClick={handleLogout}
            className="btn-danger w-full !py-4 text-sm font-black"
          >
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </div>
      </motion.div>
    </main>
  );
};

export default Profile;
