import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Upload, UserCheck, X, UserPlus, ShieldAlert, Award } from 'lucide-react';
import {
  getAdminTeams, createTeam, deleteTeam, importTeams,
  getTeamMembers, addTeamMember, deleteTeamMember,
  getTeamDevices, revokeTeamDevice
} from '../../services/api';
import { useSocket } from '../../context/SocketContext';

const AdminTeams = () => {
  const [teams, setTeams] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [label, setLabel] = useState('');
  const [importText, setImportText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { socket } = useSocket();

  // Selected Team Roster Modal State
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('عضو');
  const [memberError, setMemberError] = useState('');

  // Selected Team Devices Modal State
  const [selectedTeamDevices, setSelectedTeamDevices] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceError, setDeviceError] = useState('');

  useEffect(() => {
    fetchTeams();
  }, []);

  // Listen for real-time device events so admin panel updates without refresh
  useEffect(() => {
    if (!socket) return;

    const refreshTeams = () => fetchTeams();

    socket.on('device:registered', refreshTeams);
    socket.on('device:revoked', refreshTeams);
    socket.on('team:created', refreshTeams);
    socket.on('team:deleted', refreshTeams);
    return () => {
      socket.off('device:registered', refreshTeams);
      socket.off('device:revoked', refreshTeams);
      socket.off('team:created', refreshTeams);
      socket.off('team:deleted', refreshTeams);
    };
  }, [socket]);

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

  const openTeamRoster = async (team) => {
    setSelectedTeam(team);
    setLoadingMembers(true);
    setMemberError('');
    try {
      const data = await getTeamMembers(team.id);
      setMembers(data);
    } catch (err) {
      console.error(err);
      setMemberError('فشل في جلب أعضاء الفريق');
    } finally {
      setLoadingMembers(false);
    }
  };

  const closeDevicesModal = () => {
    setSelectedTeamDevices(null);
    fetchTeams();
  };

  const closeMembersModal = () => {
    setSelectedTeam(null);
    fetchTeams();
  };

  const openTeamDevices = async (team) => {
    setSelectedTeamDevices(team);
    setLoadingDevices(true);
    setDeviceError('');
    try {
      const data = await getTeamDevices(team.id);
      setDevices(data);
    } catch (err) {
      console.error(err);
      setDeviceError('فشل في جلب أجهزة الفريق');
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleRevokeDevice = async (deviceId) => {
    if (!window.confirm('هل أنت متأكد من إلغاء اعتماد هذا الجهاز؟ سيتم تسجيل خروجه فوراً.')) return;
    try {
      await revokeTeamDevice(deviceId);
      const updatedDevices = await getTeamDevices(selectedTeamDevices.id);
      setDevices(updatedDevices);
      fetchTeams();
    } catch (err) {
      alert('فشل إلغاء اعتماد الجهاز');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim() || !selectedTeam) return;
    setMemberError('');

    try {
      await addTeamMember(selectedTeam.id, {
        name: newMemberName.trim(),
        role: newMemberRole
      });
      setNewMemberName('');
      // Refresh members and teams list
      const updatedMembers = await getTeamMembers(selectedTeam.id);
      setMembers(updatedMembers);
      fetchTeams();
    } catch (err) {
      setMemberError(err.message || 'فشل إضافة العضو');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العضو من قاعدة البيانات؟')) return;
    try {
      await deleteTeamMember(memberId);
      const updatedMembers = await getTeamMembers(selectedTeam.id);
      setMembers(updatedMembers);
      fetchTeams();
    } catch (err) {
      alert('فشل حذف العضو');
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
    if (!window.confirm('هل أنت متأكد من حذف هذا الفريق؟ سيتم حذف درجاته وأعضائه أيضاً.')) return;
    try {
      await deleteTeam(id);
      fetchTeams();
    } catch (err) {
      alert('فشل حذف الفريق');
    }
  };

  return (
    <div className="p-6 text-right dir-rtl font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            إدارة الفرق والكشوف الكشفية
            <Users size={24} className="text-emerald-400" />
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            إضافة وتعديل الفرق، وعرض وحذف وإضافة أعضاء الفريق فوق الـ 24 شخصاً
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Individual Creation */}
        <div className="card p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Plus size={16} className="text-emerald-400" />
            إضافة فريق جديد
          </h2>

          <form onSubmit={handleAddTeam} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">اسم الفريق الداخلي</label>
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
            <div className="space-y-2.5 max-h-[55vh] overflow-y-auto">
              {teams.map((t) => {
                const memberCount = t._count?.members || 0;
                return (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-red-400 hover:text-red-300 p-1.5 rounded-lg bg-red-500/10 border border-red-500/20"
                        title="حذف الفريق كاملاً"
                      >
                        <Trash2 size={14} />
                      </button>

                      <button
                        onClick={() => openTeamRoster(t)}
                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                        title="إدارة أعضاء الفريق"
                      >
                        <UserCheck size={13} />
                        الأعضاء ({memberCount})
                      </button>

                      <button
                        onClick={() => openTeamDevices(t)}
                        className="text-xs font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                        title="الأجهزة المسجلة للفريق"
                      >
                        <ShieldAlert size={13} />
                        الأجهزة ({t._count?.devices || 0}/24)
                      </button>
                    </div>

                    <div
                      onClick={() => openTeamRoster(t)}
                      className="cursor-pointer text-right flex-1 mr-3"
                    >
                      <p className="text-xs font-black text-white hover:text-amber-400 transition">{t.label}</p>
                      <p className="text-[10px] text-slate-500 font-mono">@{t.username}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Team Members Roster Modal ═══ */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 dir-rtl">
          <div className="card p-6 rounded-3xl bg-slate-900 border border-emerald-500/30 max-w-xl w-full text-right shadow-2xl relative max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <button
                onClick={closeMembersModal}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-3 py-1 rounded-full font-mono font-bold">
                  {members.length} عضواً مسجلاً
                </span>
                <h3 className="text-base font-black text-white">
                  كشف أعضاء فريق: <span className="text-amber-400">{selectedTeam.label}</span>
                </h3>
              </div>
            </div>

            {/* Add Member Form (Beyond 24) */}
            <form onSubmit={handleAddMember} className="mb-5 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                <UserPlus size={15} />
                إضافة شخص جديد لـ {selectedTeam.label} (تجاوز الـ 24 شخصاً):
              </span>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="اسم الشخص بالكامل..."
                  className="ai-input text-right text-xs flex-1"
                  required
                />

                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="ai-input text-xs text-right bg-slate-900 w-32"
                >
                  <option value="عضو">عضو كشفي</option>
                  <option value="قائد الفريق">قائد الفريق</option>
                  <option value="نائب القائد">نائب القائد</option>
                  <option value="مسؤول">مسؤول إداري</option>
                </select>

                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shrink-0"
                >
                  إضافة
                </button>
              </div>

              {memberError && <p className="text-xs text-red-400 font-bold">{memberError}</p>}
            </form>

            {/* Members List */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              <h4 className="text-xs font-bold text-slate-400 mb-2">قائمة الكشف المسجل ({members.length}):</h4>

              {loadingMembers ? (
                <div className="py-8 text-center text-xs text-slate-500">جاري تحميل أعضاء الكشف...</div>
              ) : members.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                  لا يوجد أعضاء مضافين في كشف هذا الفريق بعد. أضف أول شخص بالأعلى!
                </div>
              ) : (
                members.map((m, idx) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <button
                      onClick={() => handleDeleteMember(m.id)}
                      className="text-red-400 hover:text-red-300 p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition"
                      title="حذف هذا الشخص من قاعدة البيانات"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="flex items-center gap-3">
                      <span className="bg-slate-800 text-slate-300 font-mono text-[10px] px-2 py-0.5 rounded-md">
                        {m.role}
                      </span>
                      <span className="font-bold text-white">{m.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-800 mt-4 flex justify-between items-center text-[11px] text-slate-500">
              <span>يمكنك إضافة أي عدد من الكشافين بحرية بدون تقييد بـ 24</span>
              <button
                onClick={closeMembersModal}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ═══ Team Registered Devices Modal ═══ */}
      {selectedTeamDevices && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 dir-rtl">
          <div className="card p-6 rounded-3xl bg-slate-900 border border-sky-500/30 max-w-xl w-full text-right shadow-2xl relative max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <button
                onClick={closeDevicesModal}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-mono font-bold border ${
                  devices.length >= 24
                    ? 'bg-red-500/20 text-red-300 border-red-500/30'
                    : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                }`}>
                  {devices.length} / 24 جهاز مسجل
                </span>
                <h3 className="text-base font-black text-white">
                  أجهزة فريق: <span className="text-amber-400">{selectedTeamDevices.label}</span>
                </h3>
              </div>
            </div>

            {/* Info Banner */}
            <div className="mb-4 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300 leading-5">
              📱 كل جهاز يسجل دخول الفريق من موبايل يُحسب هنا تلقائياً. الحد الأقصى <strong>24 جهاز</strong> لكل فريق.
              إلغاء اعتماد أي جهاز سيؤدي لتسجيل خروجه فوراً وتفريغ مكان لجهاز جديد.
            </div>

            {/* Devices List */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {loadingDevices ? (
                <div className="py-8 text-center text-xs text-slate-500">جاري تحميل الأجهزة...</div>
              ) : deviceError ? (
                <div className="py-8 text-center text-xs text-red-400">{deviceError}</div>
              ) : devices.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                  لا يوجد أجهزة مسجلة لهذا الفريق بعد. أول ما حد يسجل دخول من موبايل هيظهر هنا.
                </div>
              ) : (
                devices.map((d, idx) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <button
                      onClick={() => handleRevokeDevice(d.id)}
                      className="text-red-400 hover:text-red-300 p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition"
                      title="إلغاء اعتماد الجهاز — تسجيل خروج فوري"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="flex-1 mr-3">
                      <p className="font-mono text-[10px] text-sky-300 break-all" dir="ltr">{d.deviceId}</p>
                      <p className="text-[10px] text-slate-500 mt-1 truncate" dir="ltr">{d.userAgent}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        آخر دخول: {new Date(d.lastLoginAt).toLocaleString('ar-EG')}
                      </p>
                    </div>

                    <span className="text-[10px] font-mono text-slate-500 shrink-0">#{idx + 1}</span>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-800 mt-4 flex justify-between items-center text-[11px] text-slate-500">
              <span>الحد الأقصى التلقائي: 24 جهاز لكل فريق</span>
              <button
                onClick={closeDevicesModal}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTeams;
