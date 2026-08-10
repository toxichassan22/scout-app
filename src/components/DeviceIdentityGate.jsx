import { useState } from 'react';
import { BadgeCheck, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SCOUT_ROLES, updateOwnDeviceIdentity } from '../services/api';

/**
 * A team account is shared by the whole patrol, so the account alone does not say who
 * is holding the phone. This asks once per device and blocks until answered, which is
 * what lets the admin screens and the group activities show a person rather than
 * "device 3".
 */
const DeviceIdentityGate = () => {
  const { user, logout, setDeviceIdentity } = useAuth();
  const [name, setName] = useState(user?.deviceName || '');
  const [role, setRole] = useState(user?.deviceRole || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async event => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return setError('اكتب اسمك كاملاً');
    if (!role) return setError('اختر صفتك');
    setSaving(true);
    setError('');
    try {
      const result = await updateOwnDeviceIdentity(trimmed, role);
      setDeviceIdentity(result.deviceName ?? trimmed, result.deviceRole ?? role);
    } catch (err) {
      setError(err.message || 'تعذر حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="app-shell flex min-h-screen items-center justify-center p-5 text-right">
      <section className="glass relative z-10 w-full max-w-md p-6 sm:p-8">
        <span className="badge-ember mb-4">
          <BadgeCheck size={13} />
          {user?.label || 'فريقك'}
        </span>

        <h1 className="text-2xl font-black text-white">مين اللي بيستخدم الجهاز ده؟</h1>
        <p className="mt-2 text-sm leading-7 text-[#a9a3c2]">
          حساب الفريق مشترك، فمحتاجين نعرف اسمك وصفتك مرة واحدة على هذا الجهاز. هتظهر
          في أنشطة الفريق وعند الإدارة.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="identity-name" className="mb-2 block text-xs font-black text-[#a9a3c2]">اسمك</label>
            <input
              id="identity-name"
              value={name}
              onChange={event => setName(event.target.value)}
              className="input-field w-full text-sm"
              placeholder="الاسم كاملاً"
              maxLength={80}
              autoComplete="name"
              required
            />
          </div>

          <div>
            <span className="mb-2 block text-xs font-black text-[#a9a3c2]">صفتك</span>
            <div className="grid grid-cols-2 gap-2">
              {SCOUT_ROLES.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRole(option)}
                  aria-pressed={role === option}
                  className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${role === option
                    ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25'
                    }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-xs font-bold text-red-300">
              {error}
            </p>
          )}

          <button type="submit" disabled={saving} className="btn-ember w-full">
            <UserRound size={17} />
            {saving ? 'جاري الحفظ...' : 'يلا نبدأ'}
          </button>
        </form>

        <button
          type="button"
          onClick={logout}
          className="mt-5 flex w-full items-center justify-center gap-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-slate-300"
        >
          <LogOut size={13} />
          دخول بحساب فريق آخر
        </button>
      </section>
    </main>
  );
};

export default DeviceIdentityGate;
