import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Upload } from 'lucide-react';
import { getAdminTeams, createTeam, deleteTeam, importTeams } from '../../services/api';

const AdminTeams = () => {
  const [teams, setTeams] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [label, setLabel] = useState('');
  const [importText, setImportText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const data = await getAdminTeams();
      setTeams(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createTeam({ username, password, label });
      setUsername('');
      setPassword('');
      setLabel('');
      fetchTeams();
    } catch (err) {
      setError(err.message || 'فشل إضافة الفريق');
    }
  };

  const handleBatchImport = async (e) => {
    e.preventDefault();
    setError('');
    // Format lines: username,password,label OR username label
    const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = lines.map(line => {
      const parts = line.split(/[,;\t]/).map(p => p.trim());
      if (parts.length >= 3) {
        return { username: parts[0], password: parts[1], label: parts[2] };
      }
      return { username: parts[0], password: 'team123', label: parts[1] || parts[0] };
    });

    try {
      const res = await importTeams(parsed);
      alert(`تم استيراد ${res.count} فريق بنجاح`);
      setImportText('');
      fetchTeams();
    } catch (err) {
      setError(err.message || 'فشل الاستيراد الجماعي');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الفريق؟ سيتم حذف درجاته أيضاً.')) return;
    try {
      await deleteTeam(id);
      fetchTeams();
    } catch (err) {
      alert('فشل حذف الفريق');
    }
  };

  return (
    <div className="p-6 text-right dir-rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            إدارة الفرق الكشفية المشاركة
            <Users size={24} className="text-emerald-400" />
          </h1>
          <p className="text-slate-400 text-xs mt-1">إضافة واستيراد وحذف حسابات الفرق واسمائهم الداخلية الخاصة بالأدمن</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Individual Creation */}
        <div className="card p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Plus size={16} className="text-emerald-400" />
            إضافة فريق فردي
          </h2>

          <form onSubmit={handleAddTeam} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">الاسم الداخلي (خاص بالأدمن فقط)</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="ai-input text-right text-xs"
                placeholder="مثال: الكتيبة الأولى"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">اسم المستخدم للدخول</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="ai-input text-right text-xs font-mono"
                placeholder="team1"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">كلمة السر</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ai-input text-right text-xs font-mono"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-xs text-red-400 font-bold">{error}</p>}

            <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition">
              حفظ وتأكيد الفريق
            </button>
          </form>
        </div>

        {/* Batch Import */}
        <div className="card p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
          <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Upload size={16} className="text-blue-400" />
            استيراد جماعي (CSV / النص)
          </h2>
          <p className="text-[11px] text-slate-400 mb-3">
            ضع كل فريق في سطر بصيغة: <br /><code className="text-emerald-400">username, password, label</code>
          </p>

          <form onSubmit={handleBatchImport} className="space-y-3">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="ai-input text-right text-xs font-mono min-h-[140px]"
              placeholder="team1, pass123, الكتيبة الأولى&#10;team2, pass123, فريق الصقور"
              required
            />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition">
              بدء الاستيراد الجماعي
            </button>
          </form>
        </div>

        {/* Teams List */}
        <div className="card p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
          <h2 className="text-sm font-bold text-white mb-4">قائمة الفرق المسجلة ({teams.length})</h2>

          {loading ? (
            <div className="text-xs text-slate-500 py-4 text-center">جاري تحميل الفرق...</div>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {teams.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-300 p-1">
                    <Trash2 size={15} />
                  </button>
                  <div>
                    <p className="text-xs font-bold text-white">{t.label}</p>
                    <p className="text-[10px] text-slate-500 font-mono">@{t.username}</p>
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

export default AdminTeams;
