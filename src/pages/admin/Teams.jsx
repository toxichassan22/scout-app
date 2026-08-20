import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Plus, Trash2, Upload, UserCheck, X, UserPlus, ShieldAlert,
  Pencil, Save, Smartphone, UserRound, CircleCheck, Clock3, Monitor,
  ShieldCheck, FileText, Check, ListChecks, Search, RefreshCw,
  Minimize2, Maximize2, AlertCircle, Eye, EyeOff, Sparkles, SlidersHorizontal
} from 'lucide-react';
import {
  getAdminTeams, createTeam, updateTeam, deleteTeam, importTeams,
  getTeamMembers, addTeamMember, deleteTeamMember,
  getTeamDevices, revokeTeamDevice,
  getAdminCompetitions, updateReportPermissions
} from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import AdminBackLink from '../../components/AdminBackLink';
import { formatDateTime12 } from '../../utils/timeFormat';

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

const formatDeviceDate = value => value ? formatDateTime12(value) : 'غير متوفر';

const getIdentityStatus = device => {
  if (device.displayName && device.role) return { label: 'بيانات مكتملة', className: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20', icon: CircleCheck };
  if (device.displayName || device.role) return { label: 'بيانات ناقصة', className: 'text-amber-300 bg-amber-500/10 border-amber-500/20', icon: Clock3 };
  return { label: 'لم يسجل هويته بعد', className: 'text-slate-300 bg-slate-500/10 border-slate-500/20', icon: UserRound };
};

const AdminTeams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'active_devices' | 'has_members' | 'empty'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('admin_teams_view') || 'compact';
  });

  const { socket } = useSocket();

  // Toast Notification
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Create Team Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ username: '', password: '', label: '', maxDevices: 24 });
  const [createShowPassword, setCreateShowPassword] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Batch Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importError, setImportError] = useState('');

  // Edit Team Modal State
  const [editingTeam, setEditingTeam] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', label: '', password: '', maxDevices: 24 });
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [editError, setEditError] = useState('');

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

  // Report Permissions Modal State
  const [reportTeam, setReportTeam] = useState(null);
  const [reportCompetitions, setReportCompetitions] = useState([]);
  const [reportCompetitionIds, setReportCompetitionIds] = useState([]);
  const [reportDeadline, setReportDeadline] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSaving, setReportSaving] = useState(false);
  const [reportError, setReportError] = useState('');

  const setViewModePreference = (mode) => {
    setViewMode(mode);
    localStorage.setItem('admin_teams_view', mode);
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  // Real-time socket events
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

  // Fallback polling: refresh every 10s
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

  // ══════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════════════

  const handleAddTeam = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError('');
    try {
      await createTeam({
        username: createForm.username.trim(),
        password: createForm.password.trim(),
        label: createForm.label.trim(),
        maxDevices: Number(createForm.maxDevices) || 24
      });
      showToast(`تم إنشاء فريق «${createForm.label}» بنجاح`);
      setShowCreateModal(false);
      setCreateForm({ username: '', password: '', label: '', maxDevices: 24 });
      await fetchTeams();
    } catch (err) {
      setCreateError(err.message || 'فشل إضافة الفريق');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleBatchImport = async (e) => {
    e.preventDefault();
    setImportSubmitting(true);
    setImportError('');
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
      showToast(`تم استيراد ${res.count} فريق بنجاح`);
      setImportText('');
      setShowImportModal(false);
      await fetchTeams();
    } catch (err) {
      setImportError(err.message || 'فشل الاستيراد الجماعي');
    } finally {
      setImportSubmitting(false);
    }
  };

  const openEditTeam = (team) => {
    setEditingTeam(team);
    setEditForm({
      username: team.username,
      label: team.label,
      password: '',
      maxDevices: team.maxDevices || 24
    });
    setEditShowPassword(false);
    setEditError('');
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    setSavingTeam(true);
    setEditError('');
    try {
      const payload = {
        username: editForm.username.trim(),
        label: editForm.label.trim(),
        maxDevices: Number(editForm.maxDevices)
      };
      if (editForm.password && editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }
      await updateTeam(editingTeam.id, payload);
      showToast(`تم تعديل بيانات فريق «${payload.label}» بنجاح`);
      setEditingTeam(null);
      await fetchTeams();
    } catch (err) {
      setEditError(err.message || 'فشل تحديث الفريق');
    } finally {
      setSavingTeam(false);
    }
  };

  const handleDelete = async (team) => {
    if (!window.confirm(`هل أنت متأكد من حذف فريق «${team.label}»؟ سيتم حذف جميع درجاته وأجهزته وأعضائه نهائياً.`)) return;
    try {
      await deleteTeam(team.id);
      showToast(`تم حذف فريق «${team.label}»`);
      await fetchTeams();
    } catch (err) {
      alert('فشل حذف الفريق: ' + (err.message || ''));
    }
  };

  // Members Modal
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

  const closeMembersModal = () => {
    setSelectedTeam(null);
    fetchTeams();
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
      const updatedMembers = await getTeamMembers(selectedTeam.id);
      setMembers(updatedMembers);
      showToast('تمت إضافة العضو للكشف بنجاح');
      fetchTeams();
    } catch (err) {
      setMemberError(err.message || 'فشل إضافة العضو');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العضو من الكشف؟')) return;
    try {
      await deleteTeamMember(memberId);
      const updatedMembers = await getTeamMembers(selectedTeam.id);
      setMembers(updatedMembers);
      showToast('تم حذف العضو من الكشف');
      fetchTeams();
    } catch (err) {
      alert('فشل حذف العضو');
    }
  };

  // Devices Modal
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

  const closeDevicesModal = () => {
    setSelectedTeamDevices(null);
    fetchTeams();
  };

  const handleRevokeDevice = async (deviceId) => {
    if (!window.confirm('هل أنت متأكد من إلغاء اعتماد هذا الجهاز؟ سيتم تسجيل خروجه فوراً.')) return;
    try {
      await revokeTeamDevice(deviceId);
      const updatedDevices = await getTeamDevices(selectedTeamDevices.id);
      setDevices(updatedDevices);
      showToast('تم إلغاء اعتماد الجهاز وتسجيل خروجه');
      fetchTeams();
    } catch (err) {
      alert('فشل إلغاء اعتماد الجهاز');
    }
  };

  // Reports Permissions Modal
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
      showToast(canSubmit
        ? `تم السماح لفريق «${teamName}» برفع التقارير المختارة`
        : `تم سحب صلاحية الرفع من فريق «${teamName}»`);
    } catch (err) {
      setReportError(err.message || 'فشل تحديث صلاحية رفع التقارير');
      setReportSaving(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════
  // FILTERED TEAMS & METRICS
  // ══════════════════════════════════════════════════════════════════════

  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
      const deviceCount = t._count?.devices || 0;
      const memberCount = t._count?.members || 0;

      if (filterType === 'active_devices' && deviceCount === 0) return false;
      if (filterType === 'has_members' && memberCount === 0) return false;
      if (filterType === 'empty' && (deviceCount > 0 || memberCount > 0)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const matchLabel = t.label?.toLowerCase().includes(q);
      const matchUser = t.username?.toLowerCase().includes(q);

      return matchLabel || matchUser;
    });
  }, [teams, filterType, searchQuery]);

  const totalDevicesActive = useMemo(() => {
    return teams.reduce((acc, t) => acc + (t._count?.devices || 0), 0);
  }, [teams]);

  const totalMembersRegistered = useMemo(() => {
    return teams.reduce((acc, t) => acc + (t._count?.members || 0), 0);
  }, [teams]);

  return (
    <div className="p-4 sm:p-6 text-right dir-rtl text-white max-w-7xl mx-auto min-h-screen">
      <AdminBackLink />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 shadow-2xl border backdrop-blur-xl transition-all animate-bounce ${
          toast.type === 'error'
            ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
            : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
        }`}>
          <Check size={18} className="shrink-0" />
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl sm:text-3xl font-black text-white">
            إدارة الفرق والكشوف الكشفية
            <Users className="text-emerald-400" size={28} />
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            إضافة وتعديل بيانات الفرق، إدارة أجهزة الدخول النشطة، كشوفات الأعضاء، وصلاحيات رفع التقارير
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setCreateForm({ username: '', password: '', label: '', maxDevices: 24 });
              setCreateShowPassword(false);
              setCreateError('');
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition active:scale-95"
          >
            <Plus size={16} />
            <span>إضافة فريق جديد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setImportText('');
              setImportError('');
              setShowImportModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-4 py-2.5 text-xs sm:text-sm font-bold transition active:scale-95"
          >
            <Upload size={16} />
            <span>استيراد جماعي (CSV)</span>
          </button>

          <button
            type="button"
            onClick={fetchTeams}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="تحديث القائمة"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {/* Top Stat Cards (3 KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-300/80">إجمالي الفرق المسجلة</p>
            <p className="text-2xl font-black text-white mt-0.5">{teams.length} <span className="text-xs font-normal text-emerald-400">فريق</span></p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users size={22} />
          </div>
        </div>

        <div className="rounded-2xl border border-sky-500/20 bg-sky-950/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-sky-300/80">الأجهزة المتصلة والنشطة</p>
            <p className="text-2xl font-black text-white mt-0.5">{totalDevicesActive} <span className="text-xs font-normal text-sky-400">جهاز نشط</span></p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Smartphone size={22} />
          </div>
        </div>

        <div className="rounded-2xl border border-violet-500/20 bg-violet-950/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-violet-300/80">إجمالي أعضاء الكشوفات</p>
            <p className="text-2xl font-black text-white mt-0.5">{totalMembersRegistered} <span className="text-xs font-normal text-violet-400">كشاف مسجل</span></p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <UserCheck size={22} />
          </div>
        </div>
      </div>

      {/* Main Teams Management Section */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 backdrop-blur-xl shadow-xl">
        {/* Toolbar: Search, Filters & View Mode Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800/80">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            <input
              type="text"
              className="ai-input !pr-10 !py-2 text-xs sm:text-sm w-full bg-slate-950/60 border-slate-800 focus:border-emerald-500"
              placeholder="بحث باسم الفريق أو اسم المستخدم (@username)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills & View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Pills */}
            <div className="inline-flex rounded-xl bg-slate-950/70 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  filterType === 'all' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                الكل ({teams.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('active_devices')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  filterType === 'active_devices' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                أجهزة نشطة ({teams.filter(t => (t._count?.devices || 0) > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('has_members')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  filterType === 'has_members' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                كشوفات ({teams.filter(t => (t._count?.members || 0) > 0).length})
              </button>
            </div>

            {/* View Mode Toggle: Compact vs Grid */}
            <div className="inline-flex rounded-xl bg-slate-950/70 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setViewModePreference('compact')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition ${
                  viewMode === 'compact' ? 'bg-slate-800 text-emerald-300 shadow border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Minimize2 size={13} />
                <span>عرض مصغر</span>
              </button>
              <button
                type="button"
                onClick={() => setViewModePreference('grid')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-slate-800 text-emerald-300 shadow border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Maximize2 size={13} />
                <span>عرض بطاقات</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content List */}
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="mx-auto animate-spin text-emerald-400 mb-3" size={28} />
            <p className="text-sm font-bold text-slate-400">جاري تحميل بيانات الفرق...</p>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
            <Users className="mx-auto text-slate-600 mb-2" size={36} />
            <p className="text-sm font-bold text-slate-400">
              {searchQuery ? 'لا توجد نتائج مطابقة لبحثك' : 'لا يوجد فرق مسجلة بعد'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-emerald-400 hover:underline"
              >
                مسح البحث
              </button>
            )}
          </div>
        ) : viewMode === 'compact' ? (
          /* ════════════════════════════════════════════════════════════════
             COMPACT VIEW (Ultra-clean, dense, comfortable rows)
             ════════════════════════════════════════════════════════════════ */
          <div className="grid gap-2">
            {filteredTeams.map((t, idx) => {
              const memberCount = t._count?.members || 0;
              const deviceCount = t._count?.devices || 0;
              const maxDev = t.maxDevices || 24;
              const isDeviceFull = deviceCount >= maxDev;
              const initial = t.label?.trim().charAt(0) || 'ف';

              return (
                <div
                  key={t.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-slate-800/90 bg-slate-950/50 hover:bg-slate-950/80 hover:border-slate-700/80 px-4 py-2.5 transition group"
                >
                  {/* Left: Index, Avatar, Team Label, Username */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[11px] font-mono text-slate-600 w-5 text-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600/30 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-300 text-xs shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white truncate">{t.label}</span>
                        <span className="font-mono text-[11px] text-emerald-400/80 dir-ltr select-all">@{t.username}</span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Badges & Management Buttons */}
                  <div className="flex flex-wrap items-center gap-2 flex-1 lg:justify-center">
                    {/* Members Roster Button */}
                    <button
                      type="button"
                      onClick={() => openTeamRoster(t)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 transition active:scale-95"
                      title="عرض وإضافة أعضاء كشف الفريق"
                    >
                      <UserCheck size={13} />
                      <span>الأعضاء ({memberCount})</span>
                    </button>

                    {/* Devices Management Button */}
                    <button
                      type="button"
                      onClick={() => openTeamDevices(t)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold transition active:scale-95 ${
                        isDeviceFull
                          ? 'border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                          : deviceCount > 0
                            ? 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                      }`}
                      title="عرض الأجهزة المسجلة وإلغاء اعتمادها"
                    >
                      <Smartphone size={13} />
                      <span>الأجهزة ({deviceCount}/{maxDev})</span>
                    </button>

                    {/* Report Permissions Button */}
                    <button
                      type="button"
                      onClick={() => openReportPermissions(t)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1 text-xs font-bold text-violet-300 transition active:scale-95"
                      title="تحديد صلاحيات رفع التقارير لهذا الفريق"
                    >
                      <FileText size={13} />
                      <span>صلاحية التقرير</span>
                    </button>
                  </div>

                  {/* Right: Edit and Delete Buttons */}
                  <div className="flex items-center gap-1 shrink-0 justify-end border-t lg:border-t-0 border-slate-800/60 pt-2 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => openEditTeam(t)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/20 text-xs font-bold transition active:scale-95"
                      title="تعديل اسم الفريق أو اسم المستخدم أو كلمة السر"
                    >
                      <Pencil size={13} />
                      <span>تعديل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(t)}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/20 transition active:scale-95"
                      title="حذف الفريق كاملاً"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ════════════════════════════════════════════════════════════════
             GRID VIEW (Rich aesthetic cards)
             ════════════════════════════════════════════════════════════════ */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTeams.map((t, idx) => {
              const memberCount = t._count?.members || 0;
              const deviceCount = t._count?.devices || 0;
              const maxDev = t.maxDevices || 24;
              const isDeviceFull = deviceCount >= maxDev;
              const initial = t.label?.trim().charAt(0) || 'ف';

              return (
                <article
                  key={t.id}
                  className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-950/60 p-5 shadow-lg hover:border-slate-700 transition"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-300 text-lg shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-base text-white truncate">{t.label}</h3>
                          <span className="font-mono text-xs text-emerald-400 dir-ltr select-all">@{t.username}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-slate-600">#{idx + 1}</span>
                    </div>

                    {/* Team Sub-features Pills */}
                    <div className="space-y-2 mt-4 pt-3 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-bold">كشف الأعضاء:</span>
                        <button
                          type="button"
                          onClick={() => openTeamRoster(t)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-300 hover:bg-emerald-500/20 transition"
                        >
                          <UserCheck size={13} />
                          <span>{memberCount} كشاف مسجل</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-bold">الأجهزة النشطة:</span>
                        <button
                          type="button"
                          onClick={() => openTeamDevices(t)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-bold transition ${
                            isDeviceFull
                              ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                              : 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20'
                          }`}
                        >
                          <Smartphone size={13} />
                          <span>{deviceCount} من {maxDev}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-bold">صلاحيات التقارير:</span>
                        <button
                          type="button"
                          onClick={() => openReportPermissions(t)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 font-bold text-violet-300 hover:bg-violet-500/20 transition"
                        >
                          <FileText size={13} />
                          <span>تعديل الصلاحية</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openEditTeam(t)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 py-2 text-xs font-black text-amber-300 transition active:scale-95"
                    >
                      <Pencil size={13} />
                      <span>تعديل الفريق</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(t)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition active:scale-95"
                      title="حذف الفريق"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════
         MODAL 1: CREATE TEAM (نافذة إضافة فريق جديد)
         ════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 dir-rtl animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 text-right shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Plus size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">إضافة فريق جديد</h2>
                  <p className="text-xs text-slate-400">تسجيل فريق كشفي جديد في المهرجان</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs font-bold text-rose-200">
                <AlertCircle size={16} className="shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleAddTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم الفريق (العرض)</label>
                <input
                  type="text"
                  value={createForm.label}
                  onChange={e => setCreateForm({ ...createForm, label: e.target.value })}
                  className="ai-input w-full bg-slate-950/70 border-slate-800 focus:border-emerald-500 font-bold text-sm"
                  placeholder="مثال: كتيبة الفرسان - القاهرة"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المستخدم (للدخول)</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={e => setCreateForm({ ...createForm, username: e.target.value })}
                  className="ai-input w-full bg-slate-950/70 border-slate-800 focus:border-emerald-500 font-mono text-sm"
                  placeholder="مثال: team1"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">كلمة السر</label>
                <div className="relative">
                  <input
                    type={createShowPassword ? 'text' : 'password'}
                    value={createForm.password}
                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                    className="ai-input !pr-3 !pl-10 w-full bg-slate-950/70 border-slate-800 focus:border-emerald-500 font-mono text-sm"
                    placeholder="أدخل كلمة السر للفريق"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setCreateShowPassword(!createShowPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {createShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">الحد الأقصى للأجهزة المسموح بها</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={createForm.maxDevices}
                  onChange={e => setCreateForm({ ...createForm, maxDevices: e.target.value })}
                  className="ai-input w-full bg-slate-950/70 border-slate-800 focus:border-emerald-500 font-mono text-sm"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                  disabled={createSubmitting}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                >
                  {createSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>جاري الإضافة...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>حفظ وتأكيد الفريق</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
         MODAL 2: BATCH IMPORT (نافذة الاستيراد الجماعي)
         ════════════════════════════════════════════════════════════════ */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 dir-rtl animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-3xl border border-blue-500/30 bg-slate-900 p-6 text-right shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Upload size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">استيراد فرق جماعي (CSV / Text)</h2>
                  <p className="text-xs text-slate-400">إضافة عدة فرق دفعة واحدة عبر لصق قائمة نصية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 p-3.5 text-xs text-blue-200 leading-6">
              <p className="font-bold mb-1">صيغة كل سطر:</p>
              <code className="bg-slate-950/80 px-2 py-1 rounded-md text-emerald-400 font-mono text-[11px] block text-left" dir="ltr">
                username, password, label
              </code>
              <p className="text-[11px] text-slate-400 mt-1">
                مثال: <span className="font-mono text-white" dir="ltr">team1, pass123, كتيبة الفرسان</span>
              </p>
            </div>

            {importError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs font-bold text-rose-200">
                <AlertCircle size={16} className="shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <form onSubmit={handleBatchImport} className="space-y-4">
              <div>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="ai-input w-full bg-slate-950/70 border-slate-800 focus:border-blue-500 font-mono text-xs min-h-[160px] p-3 leading-5"
                  placeholder="team1, pass123, الكتيبة الأولى&#10;team2, pass123, فريق الصقور&#10;team3, pass123, كشافة النصر"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                  disabled={importSubmitting}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={importSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                >
                  {importSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>جاري الاستيراد...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>بدء الاستيراد الجماعي</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
         MODAL 3: EDIT TEAM (نافذة تعديل الفريق)
         ════════════════════════════════════════════════════════════════ */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 dir-rtl animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl border border-amber-500/30 bg-slate-900 p-6 text-right shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Pencil size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">تعديل بيانات الفريق</h2>
                  <p className="text-xs text-slate-400">{editingTeam.label}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTeam(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs font-bold text-rose-200">
                <AlertCircle size={16} className="shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم العرض</label>
                <input
                  type="text"
                  className="ai-input w-full bg-slate-950/70 border-slate-800 focus:border-amber-500 font-bold"
                  value={editForm.label}
                  onChange={e => setEditForm({ ...editForm, label: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المستخدم (للدخول)</label>
                <input
                  type="text"
                  className="ai-input w-full bg-slate-950/70 border-slate-800 focus:border-amber-500 font-mono text-sm"
                  value={editForm.username}
                  onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">كلمة سر جديدة</label>
                  <span className="text-[10px] text-slate-500 font-bold">اتركها فارغة للإبقاء على الحالية</span>
                </div>
                <div className="relative">
                  <input
                    type={editShowPassword ? 'text' : 'password'}
                    className="ai-input !pr-3 !pl-10 w-full bg-slate-950/70 border-slate-800 focus:border-amber-500 font-mono text-sm"
                    placeholder="اكتب كلمة سر جديدة أو اتركها فارغة..."
                    value={editForm.password}
                    onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setEditShowPassword(!editShowPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {editShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">الحد الأقصى للأجهزة المسموح بها</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  className="ai-input w-full bg-slate-950/70 border-slate-800 focus:border-amber-500 font-mono text-sm"
                  value={editForm.maxDevices}
                  onChange={e => setEditForm({ ...editForm, maxDevices: e.target.value })}
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                  disabled={savingTeam}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingTeam}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                >
                  {savingTeam ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>حفظ التعديلات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
         MODAL 4: TEAM MEMBERS ROSTER (كشف أعضاء الفريق)
         ════════════════════════════════════════════════════════════════ */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 dir-rtl animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 text-right shadow-2xl shadow-black/80 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    كشف أعضاء: <span className="text-emerald-400">{selectedTeam.label}</span>
                  </h3>
                  <span className="text-xs text-slate-400">إجمالي المسجلين في الكشف: {members.length} كشاف</span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeMembersModal}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Add Member Form */}
            <form onSubmit={handleAddMember} className="mb-4 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <UserPlus size={14} />
                إضافة شخص جديد للكشف:
              </span>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="اسم الشخص بالكامل..."
                  className="ai-input text-right text-xs flex-1 bg-slate-900 border-slate-800"
                  required
                />

                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="ai-input text-xs text-right bg-slate-900 border-slate-800 w-32 cursor-pointer"
                >
                  <option value="عضو">عضو كشفي</option>
                  <option value="قائد الفريق">قائد الفريق</option>
                  <option value="نائب القائد">نائب القائد</option>
                  <option value="مسؤول">مسؤول إداري</option>
                </select>

                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shrink-0 active:scale-95"
                >
                  إضافة
                </button>
              </div>

              {memberError && <p className="text-xs text-rose-400 font-bold">{memberError}</p>}
            </form>

            {/* Members List */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1 min-h-[160px]">
              {loadingMembers ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <RefreshCw className="mx-auto animate-spin mb-2 text-emerald-400" size={20} />
                  جاري تحميل أعضاء الكشف...
                </div>
              ) : members.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                  لا يوجد أعضاء مضافين في كشف هذا الفريق بعد. أضف أول شخص بالأعلى!
                </div>
              ) : (
                members.map((m, idx) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-slate-500 w-5 text-center">#{idx + 1}</span>
                      <span className="font-bold text-white text-sm">{m.name}</span>
                      <span className="bg-slate-800 text-slate-300 font-bold text-[10px] px-2.5 py-0.5 rounded-full border border-slate-700">
                        {m.role}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteMember(m.id)}
                      className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition"
                      title="حذف هذا الشخص من الكشف"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-800 mt-4 flex justify-between items-center text-xs text-slate-500">
              <span>يمكنك إضافة وتعديل أي عدد من الكشافين بحرية.</span>
              <button
                type="button"
                onClick={closeMembersModal}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
         MODAL 5: TEAM REGISTERED DEVICES (إدارة أجهزة الفريق)
         ════════════════════════════════════════════════════════════════ */}
      {selectedTeamDevices && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 dir-rtl animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-3xl border border-sky-500/30 bg-slate-900 p-6 text-right shadow-2xl shadow-black/80 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                    devices.length >= (selectedTeamDevices.maxDevices || 24)
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                  }`}>
                    <Smartphone size={12} />
                    {devices.length} جهاز نشط
                  </span>
                  <span className="text-[11px] text-slate-500">الحد المسموح: {selectedTeamDevices.maxDevices || 24}</span>
                </div>
                <h3 className="text-base font-black text-white">
                  أجهزة فريق: <span className="text-sky-400">{selectedTeamDevices.label}</span>
                </h3>
              </div>

              <button
                type="button"
                onClick={closeDevicesModal}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* KPI Stats */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              {[
                { label: 'أجهزة نشطة', value: devices.length, className: 'text-sky-300', icon: Smartphone },
                { label: 'بيانات مكتملة', value: devices.filter(d => d.displayName && d.role).length, className: 'text-emerald-300', icon: CircleCheck },
                { label: 'تحتاج متابعة', value: devices.filter(d => !d.displayName || !d.role).length, className: 'text-amber-300', icon: Clock3 },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-xl border border-slate-800 bg-slate-950/50 p-2 text-center">
                    <Icon size={14} className={`mx-auto mb-0.5 ${stat.className}`} />
                    <p className={`text-base font-black ${stat.className}`}>{stat.value}</p>
                    <p className="text-[9px] font-bold text-slate-500">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Devices List */}
            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1 min-h-[160px]">
              {loadingDevices ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <RefreshCw className="mx-auto animate-spin mb-2 text-sky-400" size={20} />
                  جاري تحميل الأجهزة...
                </div>
              ) : deviceError ? (
                <div className="py-8 text-center text-xs text-rose-400">{deviceError}</div>
              ) : devices.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                  لا يوجد أجهزة مسجلة لهذا الفريق بعد. بمجرد تسجيل الدخول من هاتف سيظهر هنا.
                </div>
              ) : (
                devices.map((d, idx) => {
                  const identityStatus = getIdentityStatus(d);
                  const StatusIcon = identityStatus.icon;
                  const isLeader = d.role === 'قائد/ة';
                  return (
                    <div
                      key={d.id}
                      className="rounded-2xl bg-slate-950/60 border border-slate-800 p-3.5 text-xs hover:border-slate-700 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                            isLeader
                              ? 'border-amber-400/30 bg-amber-500/10 text-amber-300'
                              : 'border-sky-400/20 bg-sky-500/10 text-sky-300'
                          }`}>
                            {isLeader ? <ShieldCheck size={18} /> : <Smartphone size={18} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="truncate text-sm font-black text-white">
                                {d.displayName || 'مستخدم بدون اسم'}
                              </h4>
                              <span className="rounded-full border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                                جهاز #{idx + 1}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
                                isLeader ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'
                              }`}>
                                {d.role || 'عضو'}
                              </span>
                              <span className="text-slate-400" dir="ltr">
                                {getDevicePlatform(d.userAgent)}
                              </span>
                              <span className="text-slate-500">
                                {formatDeviceDate(d.lastLoginAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRevokeDevice(d.id)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/20"
                          title="إلغاء اعتماد الجهاز وتسجيل الخروج الفوري"
                        >
                          <Trash2 size={13} />
                          <span>إلغاء الاعتماد</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-800 mt-4 flex justify-between items-center text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span>المستخدم: <strong className="text-slate-300">{devices.length}</strong></span>
                <span>المتبقي: <strong className="text-emerald-300">{Math.max(0, (selectedTeamDevices.maxDevices || 24) - devices.length)}</strong></span>
              </div>
              <button
                type="button"
                onClick={closeDevicesModal}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
         MODAL 6: REPORT PERMISSIONS (صلاحيات رفع التقارير)
         ════════════════════════════════════════════════════════════════ */}
      {reportTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 dir-rtl animate-fadeIn"
          onMouseDown={event => { if (event.target === event.currentTarget && !reportSaving) closeReportPermissions(); }}
        >
          <div className="relative w-full max-w-xl rounded-3xl border border-violet-500/30 bg-slate-900 p-6 text-right shadow-2xl shadow-black/80 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">صلاحية رفع تقرير لفريق</h2>
                  <p className="text-xs text-violet-300 font-bold">{reportTeam.label || reportTeam.username}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeReportPermissions}
                disabled={reportSaving}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <span className="text-xs font-bold text-slate-400">تم اختيار {reportCompetitionIds.length} من {reportCompetitions.length}</span>
              <button
                type="button"
                onClick={() => setReportCompetitionIds(allTeamReportsSelected ? [] : reportCompetitions.map(competition => competition.id))}
                disabled={reportCompetitions.length === 0 || reportSaving || reportLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
              >
                <Check size={14} /> {allTeamReportsSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
              {reportLoading ? (
                <p className="py-8 text-center text-xs text-slate-400">جاري تحميل التقارير...</p>
              ) : reportCompetitions.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">لا توجد تقارير متاحة حالياً</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {reportCompetitions.map(competition => {
                    const selected = reportCompetitionIds.includes(competition.id);
                    return (
                      <label
                        key={competition.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                          selected ? 'border-violet-400/50 bg-violet-500/15' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleReportCompetition(competition.id)}
                          disabled={reportSaving}
                          className="h-4 w-4 accent-violet-500"
                        />
                        <span className="flex-1 text-xs font-bold text-white">{competition.name}</span>
                        {selected && <Check size={14} className="text-violet-300" />}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <label className="mt-4 block text-xs font-bold text-slate-400">
              موعد نهائي لهذا الفريق فقط (اختياري)
              <input
                type="datetime-local"
                value={reportDeadline}
                onChange={event => setReportDeadline(event.target.value)}
                disabled={reportSaving}
                className="ai-input mt-1.5 w-full bg-slate-950/70 text-xs"
              />
            </label>

            {reportError && <p className="mt-2 text-xs font-bold text-rose-400">{reportError}</p>}

            <div className="mt-5 pt-3 border-t border-slate-800 flex flex-wrap justify-end gap-2.5">
              <button
                type="button"
                onClick={closeReportPermissions}
                disabled={reportSaving}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => grantTeamReportPermission({ canSubmit: false })}
                disabled={reportSaving || reportCompetitionIds.length === 0}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-black text-white disabled:opacity-50 active:scale-95"
              >
                {reportSaving ? 'جاري التحديث...' : 'سحب من هذا الفريق'}
              </button>
              <button
                type="button"
                onClick={() => grantTeamReportPermission({ canSubmit: true })}
                disabled={reportSaving || reportCompetitionIds.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2 text-xs font-black text-white disabled:opacity-50 active:scale-95"
              >
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
