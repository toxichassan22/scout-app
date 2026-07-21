import React from 'react';
import { ShieldCheck, LogOut, Shield, Lock, Award, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="page-shell text-right dir-rtl">
      <div className="max-w-md mx-auto glass-card p-6 sm:p-8 rounded-3xl border border-emerald-500/20 bg-slate-950/70 shadow-2xl text-center">
        
        {/* Scout Badge Avatar */}
        <div className="relative mx-auto mb-6 h-24 w-24 rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/20 to-slate-900 p-2 flex items-center justify-center text-emerald-400 shadow-glow-green">
          <ShieldCheck size={48} />
          <span className="absolute -bottom-2 -right-2 h-7 w-7 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center border-2 border-slate-950 shadow-md">
            ✓
          </span>
        </div>

        <h1 className="text-2xl font-black text-white">{user?.label || user?.username || 'فريق كشفي'}</h1>
        <p className="text-slate-400 text-xs font-mono mt-1">@{user?.username}</p>

        {/* Identity Badges */}
        <div className="mt-8 space-y-3 text-right">
          <div className="glass-card p-4 rounded-2xl border-white/10 bg-slate-900/40 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              نشط ومسجل
            </span>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <span>حالة الحساب الكشفي</span>
              <Shield size={16} className="text-emerald-400" />
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border-white/10 bg-slate-900/40 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              JWT Encrypted
            </span>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <span>نظام الأمان والتوثيق</span>
              <Lock size={16} className="text-amber-400" />
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border-white/10 bg-slate-900/40 flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              محفوظ ومجهول
            </span>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <span>خصوصية الترتيب</span>
              <Award size={16} className="text-blue-400" />
            </div>
          </div>
        </div>

        {/* Logout Action */}
        <button
          onClick={handleLogout}
          className="w-full mt-8 py-3.5 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-extrabold text-sm flex items-center justify-center gap-2 transition active:scale-98"
        >
          <LogOut size={18} />
          تسجيل الخروج من الحساب
        </button>
      </div>
    </div>
  );
};

export default Profile;
