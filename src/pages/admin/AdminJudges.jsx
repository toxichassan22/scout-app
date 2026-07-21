import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Trash2, KeyRound, ShieldAlert, Sparkles } from 'lucide-react';
import { getAdminJudges, createJudge, deleteJudge, getAdminCompetitions, generateCompetitionPasscode } from '../../services/api';

const AdminJudges = () => {
  const [judges, setJudges] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [generatedPasscodes, setGeneratedPasscodes] = useState({});

  const fetchData = async () => {
    try {
      const [jList, cList] = await Promise.all([getAdminJudges(), getAdminCompetitions()]);
      setJudges(jList);
      setCompetitions(cList.filter(c => c.type === 'manual_judged'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddJudge = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createJudge({ name, username, password });
      setName('');
      setUsername('');
      setPassword('');
      fetchData();
    } catch (err) {
      setError(err.message || 'فشل في إنشاء المحكم');
    }
  };

  const handleDeleteJudge = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المحكم؟')) return;
    try {
      await deleteJudge(id);
      fetchData();
    } catch (err) {
      alert('فشل الحذف');
    }
  };

  const handleGeneratePasscode = async (compId) => {
    try {
      const res = await generateCompetitionPasscode(compId);
      setGeneratedPasscodes(prev => ({ ...prev, [compId]: res.passcode }));
      fetchData();
    } catch (err) {
      alert('فشل في توليد الكود');
    }
  };

  return (
    <div className="p-6 text-right dir-rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            إدارة المحكمين وأكواد التقييم
            <UserCheck size={24} className="text-blue-400" />
          </h1>
          <p className="text-slate-400 text-xs mt-1">إنشاء حسابات المحكمين وتوليد أكواد المرور لفتح المسابقات الميدانية</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form: Create Judge */}
        <div className="card p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Plus size={16} className="text-blue-400" />
            إضافة محكّم جديد
          </h2>

          <form onSubmit={handleAddJudge} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">اسم المحكّم الكامل</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="ai-input text-right text-xs"
                placeholder="مثال: د. أحمد المحكم"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">اسم المستخدم للدخول</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="ai-input text-right text-xs"
                placeholder="judge1"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">كلمة السر</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ai-input text-right text-xs"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-xs text-red-400 font-bold">{error}</p>}

            <button type="submit" className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition">
              إنشاء حساب المحكّم
            </button>
          </form>
        </div>

        {/* Passcode Generator Section */}
        <div className="card p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <KeyRound size={16} className="text-amber-400" />
            أكواد مسابقات التقييم اليدوي
          </h2>

          {competitions.length === 0 ? (
            <p className="text-xs text-slate-500">لا توجد مسابقات من نوع تقييم يدوي حالياً</p>
          ) : (
            <div className="space-y-3">
              {competitions.map((comp) => (
                <div key={comp.id} className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${comp.isOpen ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {comp.isOpen ? 'مفتوحة' : 'مغلقة'}
                    </span>
                    <span className="text-xs font-bold text-slate-200">{comp.name}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleGeneratePasscode(comp.id)}
                      className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[11px] font-bold transition"
                    >
                      توليد كود جديد
                    </button>
                    <span className="text-sm font-mono font-black text-amber-400 tracking-wider">
                      {generatedPasscodes[comp.id] || comp.passcode || '----'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Judges List */}
        <div className="card p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
          <h2 className="text-sm font-bold text-white mb-4">قائمة المحكّمين المعتمدين ({judges.length})</h2>

          {loading ? (
            <div className="text-xs text-slate-500 py-4 text-center">جاري التحميل...</div>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {judges.map((j) => (
                <div key={j.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <button onClick={() => handleDeleteJudge(j.id)} className="text-red-400 hover:text-red-300 p-1">
                    <Trash2 size={15} />
                  </button>
                  <div>
                    <p className="text-xs font-bold text-slate-200">{j.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">@{j.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminJudges;
