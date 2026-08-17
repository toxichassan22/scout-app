import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Upload, UserCheck, X, UserPlus, ShieldAlert, Pencil, Save, Smartphone, UserRound, CircleCheck, Clock3, Monitor, ShieldCheck, FileText, Check, ListChecks } from 'lucide-react';
import {
  getAdminTeams, createTeam, updateTeam, deleteTeam, importTeams,
  getTeamMembers, addTeamMember, deleteTeamMember,
  getTeamDevices, revokeTeamDevice,
  getAdminCompetitions, updateReportPermissions
} from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import AdminBackLink from '../../components/AdminBackLink';

const getDevicePlatform = (userAgent = '') => {
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : 'متصفح غير معروف';
  const platform = /Windows NT/.test(userAgent)
    ? 'Windows'
    : /Android/.test(userAgent)
      ? 'Android'
      : /iPhone|iPad|iPod/.test(userAgent)
        ? 'iOS'
        : /Mac OS X/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : 'نظام غير معروف';
  return `${browser} · ${platform}`;
};

const formatDeviceDate = value => value
  ? new Date(value).toLocaleString('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  : 'غير متوفر';

const getIdentityStatus = device => {
  if (device.displayName && device.role) return { label: 'بيانات مكتملة', className: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20', icon: CircleCheck };
  if (device.displayName || device.role) return { label: 'بيانات ناقصة', className: 'text-amber-300 bg-amber-500/10 border-amber-500/20', icon: Clock3 };
  return { label: 'لم يسجل هويته بعد', className: 'text-slate-300 bg-slate-500/10 border-slate-500/20', icon: UserRound };
};

const AdminTeams = () => {
  const [teams, setTeams] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [label, setLabel] = useState('');
  const [importText, setImportText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { socket } = useSocket();
  const [editingTeam, setEditingTeam] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', label: '', password: '', maxDevices: 24 });
  const [savingTeam, setSavingTeam] = useState(false);

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

  const [reportTeam, setReportTeam] = useState(null);
  const [reportCompetitions, setReportCompetitions] = useState([]);
  const [reportCompetitionIds, setReportCompetitionIds] = useState([]);
  const [reportDeadline, setReportDeadline] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSaving, setReportSaving] = useState(false);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    fetchTeams();
  }, []);

  // Listen for real-time device events so admin panel updates without refresh
  useEffect(() => {
    if (!socket) return;

    const refreshTeams = async () => {
      try {
        const data = await getAdminTeams();
        setTeams(data);
      } catch (err) {
        console.error(err);
      }
    };

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

  // Fallback polling: refresh every 10s in case socket events are missed
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTeams();
    }, 10000);
    return () => clearInterval(interval);
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

  const openEditTeam = (team) => {
    setEditingTeam(team);
    setEditForm({ username: team.username, label: team.label, password: '', maxDevices: team.maxDevices || 24 });
  };

  const openReportPermissions = async (team) => {
    setReportTeam(team);
    setReportCompetitionIds([]);
    setReportDeadline('');
    setReportError('');
    setReportLoading(true);
    try {
      const competitions = await getAdminCompetitions();
      const reports = competitions.filter(competition => String(competition.slug || '').startsWith('report-'));
      setReportCompetitions(reports);
      setReportCompetitionIds(reports.map(competition => competition.id));
    } catch (err) {
      setReportError(err.message || 'فشل في تحميل تقارير الفريق');
    } finally {
      setReportLoading(false);
    }
  };

  const closeReportPermissions = () => {
    setReportTeam(null);
    setReportCompetitionIds([]);
    setReportDeadline('');
    setReportError('');
  };

  const allTeamReportsSelected = reportCompetitions.length > 0 && reportCompetitionIds.length === reportCompetitions.length;

  const toggleReportCompetition = (competitionId) => {
    setReportCompetitionIds(current => current.includes(competitionId)
      ? current.filter(id => id !== competitionId)
      : [...current, competitionId]);
  };

  const grantTeamReportPermission = async ({ canSubmit }) => {
    if (!reportTeam || reportCompetitionIds.length === 0) {
      setReportError('اختر تقريراً واحداً على الأقل');
      return;
    }
    const teamName = reportTeam.label || reportTeam.username;
    setReportSaving(true);
    setReportError('');
    try {
      await updateReportPermissions(reportTeam.id, {
        competitionIds: reportCompetitionIds,
        canSubmit,
        deadline: reportDeadline || null,
      });
      setReportSaving(false);
      closeReportPermissions();
      alert(canSubmit
        ? `تم السماح لفريق ${teamName} برفع التقارير المختارة فقط`
        : `تم سحب صلاحية الرفع من فريق ${teamName} فقط`);
    } catch (err) {
      setReportError(err.message || 'فشل تحديث صلاحية رفع التقارير');
      setReportSaving(false);
    }
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    setSavingTeam(true);
    try {
      const payload = { username: editForm.username, label: editForm.label, maxDevices: Number(editForm.maxDevices) };
      if (editForm.password) payload.password = editForm.password;
      await updateTeam(editingTeam.id, payload);
      setEditingTeam(null);
      await fetchTeams();
    } catch (err) {
      alert(err.message || 'فشل تحديث الفريق');
    } finally { setSavingTeam(false); }
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
      <AdminBackLink />
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
                      <button onClick={() => openEditTeam(t)} className="text-amber-400 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20" title="تعديل بيانات الفريق">
                        <Pencil size={14} />
                      </button>
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
                        الأجهزة ({t._count?.devices || 0}/{t.maxDevices || 24})
                      </button>

                      <button
                        onClick={() => openReportPermissions(t)}
                        className="text-xs font-bold text-violet-300 hover:text-violet-200 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                        title="السماح لهذا الفريق فقط برفع تقرير"
                      >
                        <FileText size={13} />
                        صلاحية التقرير
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

      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 dir-rtl">
          <form onSubmit={handleUpdateTeam} className="card p-6 rounded-3xl bg-slate-900 border border-amber-500/30 max-w-md w-full space-y-4 text-right">
            <div className="flex justify-between"><button type="button" onClick={() => setEditingTeam(null)}><X /></button><h3 className="font-black text-white">تعديل الفريق</h3></div>
            <label className="block text-xs text-slate-400">اسم العرض<input className="ai-input mt-1" value={editForm.label} onChange={e => setEditForm({ ...editForm, label: e.target.value })} required /></label>
            <label className="block text-xs text-slate-400">اسم المستخدم<input className="ai-input mt-1" value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} required /></label>
            <label className="block text-xs text-slate-400">كلمة سر جديدة (اتركها فارغة دون تغيير)<input type="password" minLength="4" className="ai-input mt-1" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} /></label>
            <label className="block text-xs text-slate-400">الحد الأقصى للأجهزة<input type="number" min="1" max="1000" className="ai-input mt-1" value={editForm.maxDevices} onChange={e => setEditForm({ ...editForm, maxDevices: e.target.value })} required /></label>
            <button disabled={savingTeam} className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-black flex justify-center gap-2"><Save size={17} />{savingTeam ? 'جاري الحفظ...' : 'حفظ التعديلات'}</button>
          </form>
        </div>
      )}

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
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
              <button
                onClick={closeDevicesModal}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition shrink-0"
                aria-label="إغلاق إدارة الأجهزة"
              >
                <X size={18} />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-bold border ${devices.length >= (selectedTeamDevices.maxDevices || 24)
                      ? 'bg-red-500/20 text-red-300 border-red-500/30'
                      : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                    }`}>
                    <Smartphone size={12} />
                    {devices.length} نشط
                  </span>
                  <span className="text-[11px] text-slate-500">الحد: {selectedTeamDevices.maxDevices || 24}</span>
                </div>
                <h3 className="mt-2 text-lg font-black text-white">
                  إدارة أجهزة فريق <span className="text-amber-400">{selectedTeamDevices.label}</span>
                </h3>
                <p className="mt-1 text-[11px] text-slate-400">كل بطاقة تمثل جهازًا يستخدم حساب الفريق المشترك.</p>
              </div>
            </div>

            {/* Info Banner */}
            <div className="mb-3 rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-[11px] leading-6 text-sky-200">
              الاسم والصفة يكتبهما الشخص من الجهاز نفسه. لو ظهرت البطاقة بدون اسم أو صفة، فالجهاز دخل الحساب لكنه لم يكمل تسجيل بيانات المستخدم.
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              {[
                { label: 'أجهزة نشطة', value: devices.length, className: 'text-sky-300', icon: Smartphone },
                { label: 'بيانات مكتملة', value: devices.filter(d => d.displayName && d.role).length, className: 'text-emerald-300', icon: CircleCheck },
                { label: 'تحتاج متابعة', value: devices.filter(d => !d.displayName || !d.role).length, className: 'text-amber-300', icon: Clock3 },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-xl border border-slate-800 bg-slate-950/50 p-2.5 text-center">
                    <Icon size={15} className={`mx-auto mb-1 ${stat.className}`} />
                    <p className={`text-base font-black ${stat.className}`}>{stat.value}</p>
                    <p className="mt-0.5 text-[9px] font-bold text-slate-500">{stat.label}</p>
                  </div>
                );
              })}
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
                devices.map((d, idx) => {
                  const identityStatus = getIdentityStatus(d);
                  const StatusIcon = identityStatus.icon;
                  const isLeader = d.role === 'قائد/ة';
                  return (
                    <div
                      key={d.id}
                      className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleRevokeDevice(d.id)}
                          className="order-first inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-2.5 py-2 text-[10px] font-bold text-red-300 transition hover:bg-red-500/20 hover:text-red-200"
                          title="إلغاء اعتماد الجهاز — تسجيل خروج فوري"
                          aria-label={`إلغاء اعتماد جهاز ${d.displayName || idx + 1}`}
                        >
                          <Trash2 size={13} />
                          إلغاء الاعتماد
                        </button>

                        <div className="min-w-0 flex-1">
                          {/* Devices used to be listed as "جهاز 1"; each one now carries the
                              name and role its owner entered on first use. */}
                          <div className="flex items-start gap-3">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${isLeader
                              ? 'border-amber-400/30 bg-amber-500/10 text-amber-300'
                              : 'border-sky-400/20 bg-sky-500/10 text-sky-300'
                              }`}>
                              {isLeader ? <ShieldCheck size={21} /> : d.displayName ? <UserRound size={21} /> : <Smartphone size={21} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="truncate text-sm font-black text-white">
                                  {d.displayName || 'شخص لم يسجل اسمه بعد'}
                                </h4>
                                <span className="rounded-full border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                                  جهاز #{idx + 1}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${isLeader
                                  ? 'bg-amber-500/15 text-amber-300'
                                  : d.role
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : 'bg-slate-800 text-slate-500'
                                  }`}>
                                  {d.role || 'الصفة غير محددة'}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400" dir="ltr">
                                  <Monitor size={12} />
                                  {getDevicePlatform(d.userAgent)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
                              <p className="text-[9px] font-bold text-slate-500">حالة التسجيل</p>
                              <p className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${identityStatus.className}`}>
                                <StatusIcon size={12} />
                                {identityStatus.label}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
                              <p className="text-[9px] font-bold text-slate-500">آخر دخول</p>
                              <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-slate-300">
                                <Clock3 size={12} className="text-sky-300" />
                                {formatDeviceDate(d.lastLoginAt)}
                              </p>
                            </div>
                          </div>

                          <details className="mt-3 rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2">
                            <summary className="cursor-pointer text-[10px] font-bold text-slate-500 hover:text-slate-300">عرض البيانات التقنية</summary>
                            <div className="mt-2 space-y-2 border-t border-slate-800 pt-2 text-[10px]">
                              <div>
                                <p className="text-slate-500">معرف الجهاز</p>
                                <code className="mt-1 block break-all font-mono text-sky-300" dir="ltr">{d.deviceId || 'غير متوفر'}</code>
                              </div>
                              <div>
                                <p className="text-slate-500">User-Agent</p>
                                <p className="mt-1 break-all text-slate-400" dir="ltr">{d.userAgent || 'غير متوفر'}</p>
                              </div>
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-800 mt-4 flex flex-wrap gap-3 justify-between items-center text-[11px] text-slate-500">
              <div className="flex flex-wrap items-center gap-3">
                <span>النشط الآن: <strong className="text-slate-300">{devices.length}</strong></span>
                <span>المتاح: <strong className="text-emerald-300">{Math.max(0, (selectedTeamDevices.maxDevices || 24) - devices.length)}</strong></span>
              </div>
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

      {reportTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm dir-rtl"
          onMouseDown={event => { if (event.target === event.currentTarget && !reportSaving) closeReportPermissions(); }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="team-report-permission-title" className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-violet-500/30 bg-slate-950 p-5 text-right shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <button type="button" onClick={closeReportPermissions} disabled={reportSaving} className="rounded-xl bg-slate-800 p-2 text-slate-300 hover:text-white disabled:opacity-50" aria-label="إغلاق">
                <X size={18} />
              </button>
              <div>
                <h2 id="team-report-permission-title" className="text-lg font-black text-white">صلاحية رفع تقرير لهذا الفريق</h2>
                <p className="mt-1 text-xs text-violet-300">{reportTeam.label || reportTeam.username}</p>
                <p className="mt-1 text-[11px] text-slate-400">التفعيل هنا لهذا الفريق فقط، وليس لكل الفرق من صفحة التقارير.</p>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <span className="text-xs font-bold text-slate-400">تم اختيار {reportCompetitionIds.length} من {reportCompetitions.length}</span>
              <button
                type="button"
                onClick={() => setReportCompetitionIds(allTeamReportsSelected ? [] : reportCompetitions.map(competition => competition.id))}
                disabled={reportCompetitions.length === 0 || reportSaving || reportLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
              >
                <Check size={14} /> {allTeamReportsSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
              {reportLoading ? (
                <p className="py-8 text-center text-sm text-slate-500">جاري تحميل التقارير...</p>
              ) : reportCompetitions.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">لا توجد تقارير متاحة حالياً</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {reportCompetitions.map(competition => {
                    const selected = reportCompetitionIds.includes(competition.id);
                    return (
                      <label key={competition.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${selected ? 'border-violet-400/50 bg-violet-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'}`}>
                        <input type="checkbox" checked={selected} onChange={() => toggleReportCompetition(competition.id)} disabled={reportSaving} className="h-4 w-4 accent-violet-500" />
                        <span className="flex-1 text-sm font-bold text-white">{competition.name}</span>
                        {selected && <Check size={16} className="text-violet-300" />}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <label className="mt-4 block text-xs font-bold text-slate-400">
              موعد نهائي لهذا الفريق فقط (اختياري)
              <input type="datetime-local" value={reportDeadline} onChange={event => setReportDeadline(event.target.value)} disabled={reportSaving} className="ai-input mt-2 w-full" />
            </label>
            {reportError && <p className="mt-3 text-xs font-bold text-red-400">{reportError}</p>}
            <div className="mt-5 flex flex-wrap justify-start gap-2">
              <button type="button" onClick={closeReportPermissions} disabled={reportSaving} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-50">إلغاء</button>
              <button type="button" onClick={() => grantTeamReportPermission({ canSubmit: false })} disabled={reportSaving || reportCompetitionIds.length === 0} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black disabled:opacity-50">{reportSaving ? 'جاري التحديث...' : 'سحب من هذا الفريق'}</button>
              <button type="button" onClick={() => grantTeamReportPermission({ canSubmit: true })} disabled={reportSaving || reportCompetitionIds.length === 0} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2 text-xs font-black disabled:opacity-50">
                <ListChecks size={14} />
                {reportSaving ? 'جاري التفعيل...' : 'السماح لهذا الفريق فقط'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTeams;
