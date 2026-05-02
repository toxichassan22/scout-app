import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

const AdminLogin = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loginAdmin(form.username, form.password)) {
      navigate('/admin/dashboard');
    } else {
      setError('بيانات الدخول غير صحيحة');
    }
  };

  return (
    <div className="app-shell flex min-h-screen items-center justify-center p-6">
      <div className="tech-panel w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-lg border border-signal/25 bg-signal/10 text-signal">
          <ShieldCheck size={40} />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-50">لوحة التحكم</h1>
        <p className="mb-8 text-slate-400">تسجيل دخول المشرفين</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-right">
            <label className="mb-2 block text-sm font-medium text-slate-300">اسم المستخدم</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({...form, username: e.target.value})}
              className="input-field"
              required
            />
          </div>

          <div className="text-right">
            <label className="mb-2 block text-sm font-medium text-slate-300">كلمة المرور</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
              className="input-field"
              required
            />
          </div>

          {error && <p className="rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p>}

          <button type="submit" className="btn-primary w-full">
            دخول المشرف
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
