import { LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const WaitingForLeaderGate = () => {
  const { user, logout } = useAuth();

  return (
    <main className="app-shell flex min-h-screen items-center justify-center p-5 text-right">
      <section className="glass relative z-10 w-full max-w-md p-6 sm:p-8">
        <span className="badge-ember mb-4">
          <ShieldAlert size={13} />
          {user?.label || 'فريقك'}
        </span>

        <h1 className="text-2xl font-black text-white">في انتظار قائد الفريق</h1>
        <p className="mt-3 text-sm leading-7 text-[#a9a3c2]">
          يجب على قائد الفريق أولاً تسجيل صفته ورفع لوجو الفريق قبل إمكانية تسجيل بقية الأعضاء.
        </p>

        <button
          type="button"
          onClick={logout}
          className="mt-6 flex w-full items-center justify-center gap-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-slate-300"
        >
          <LogOut size={13} />
          دخول بحساب فريق آخر
        </button>
      </section>
    </main>
  );
};

export default WaitingForLeaderGate;
