import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  Lock,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  X
} from 'lucide-react';
import {
  assignJudgeCompetition,
  createJudge,
  deleteJudge,
  generateCompetitionPasscode,
  getAdminCompetitions,
  getAdminJudges,
  getJudgeAssignments,
  resetJudgeDevice,
  unassignJudgeCompetition,
  updateCompetition,
  updateJudge
} from '../../services/api';
import AdminBackLink from '../../components/AdminBackLink';

const AdminJudges = () => {
  const [judges, setJudges] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'assigned' | 'unassigned'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('admin_judges_view') || 'compact';
  });

  // Edit Modal State
  const [editingJudge, setEditingJudge] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', username: '', password: '' });
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', username: '', password: '' });
  const [createShowPassword, setCreateShowPassword] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Toast Notification State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const setViewModePreference = (mode) => {
    setViewMode(mode);
    localStorage.setItem('admin_judges_view', mode);
  };

  const load = async () => {
    const [j, c] = await Promise.all([getAdminJudges(), getAdminCompetitions()]);
    setJudges(j);
    setCompetitions(c.filter(x => x.type === 'manual_judged'));
    const pairs = await Promise.all(j.map(async x => [x.id, await getJudgeAssignments(x.id)]));
    setAssignments(Object.fromEntries(pairs));
  };

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, []);

  const assigned = (jid, cid) => assignments[jid]?.some(a => a.competitionId === cid);
  const judgesOf = cid => judges.filter(judge => assigned(judge.id, cid));
  const availableCompsFor = jid => competitions.filter(c => !assigned(jid, c.id) && judgesOf(c.id).length < 2);

  // Edit Handler
  const openEditModal = (judge) => {
    setEditingJudge(judge);
    setEditForm({
      name: judge.name || '',
      username: judge.username || '',
      password: ''
    });
    setEditShowPassword(false);
    setEditError('');
  };

  const closeEditModal = () => {
    setEditingJudge(null);
    setEditForm({ name: '', username: '', password: '' });
    setEditError('');
  };

  const handleUpdateJudge = async (e) => {
    e.preventDefault();
    if (!editingJudge) return;

    setEditSubmitting(true);
    setEditError('');

    try {
      const payload = {
        name: editForm.name.trim(),
        username: editForm.username.trim()
      };
      if (editForm.password && editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      await updateJudge(editingJudge.id, payload);
      showToast(`تم تحديث بيانات المحكم «${payload.name}» بنجاح`);
      closeEditModal();
      await load();
    } catch (err) {
      setEditError(err.message || 'فشل في تحديث بيانات المحكم');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Create Handler
  const openCreateModal = () => {
    setCreateForm({ name: '', username: '', password: '' });
    setCreateShowPassword(false);
    setCreateError('');
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm({ name: '', username: '', password: '' });
    setCreateError('');
  };

  const handleCreateJudge = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError('');

    try {
      await createJudge({
        name: createForm.name.trim(),
        username: createForm.username.trim(),
        password: createForm.password.trim()
      });
      showToast(`تم إنشاء المحكم «${createForm.name}» بنجاح`);
      closeCreateModal();
      await load();
    } catch (err) {
      setCreateError(err.message || 'فشل في إنشاء المحكم');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const removeJudge = async j => {
    if (!confirm(`حذف المحكم «${j.name}» نهائياً؟`)) return;
    try {
      await deleteJudge(j.id);
      showToast(`تم حذف المحكم «${j.name}»`);
      if (editingJudge?.id === j.id) closeEditModal();
      await load();
    } catch (err) {
      alert(err.message);
    }
  };

  const resetJudgeDeviceLock = async judge => {
    if (!confirm(`فتح قفل جهاز المحكم «${judge.name}»؟ سيتم تسجيل خروجه من الجهاز الحالي ليتمكن من الدخول من جهاز جديد.`)) return;
    try {
      await resetJudgeDevice(judge.id);
      showToast(`تم فتح قفل جهاز المحكم «${judge.name}» بنجاح`);
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleAssignment = async (jid, cid) => {
    try {
      if (assigned(jid, cid)) {
        await unassignJudgeCompetition(jid, cid);
        showToast('تم إلغاء التكليف');
      } else {
        await assignJudgeCompetition(jid, cid);
        showToast('تم تكليف المسابقة للمحكم');
      }
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  const setCode = async (c, mode) => {
    try {
      if (mode === 'generate') {
        await generateCompetitionPasscode(c.id);
        showToast(`تم توليد كود جديد لمسابقة ${c.name}`);
      } else if (mode === 'revoke') {
        if (!confirm(`إلغاء كود «${c.name}» وإغلاق المسابقة؟`)) return;
        await updateCompetition(c.id, { revoke: true });
        showToast(`تم إلغاء كود مسابقة ${c.name}`);
      } else {
        const code = prompt('أدخل كود المحكم المخصص', c.passcode || '');
        if (code !== null) {
          await updateCompetition(c.id, { passcode: code });
          showToast(`تم تخصيص كود مسابقة ${c.name}`);
        }
      }
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  // Filtered & Searched Judges
  const filteredJudges = useMemo(() => {
    return judges.filter(j => {
      const judgeComps = (assignments[j.id] || []).map(a => a.competition).filter(Boolean);
      const isAssigned = judgeComps.length > 0;

      if (filterType === 'assigned' && !isAssigned) return false;
      if (filterType === 'unassigned' && isAssigned) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const matchName = j.name?.toLowerCase().includes(q);
      const matchUser = j.username?.toLowerCase().includes(q);
      const matchComp = judgeComps.some(c => c.name?.toLowerCase().includes(q));

      return matchName || matchUser || matchComp;
    });
  }, [judges, assignments, filterType, searchQuery]);

  const assignedCount = useMemo(() => {
    return judges.filter(j => (assignments[j.id] || []).some(a => a.competition)).length;
  }, [judges, assignments]);

  const unassignedCount = judges.length - assignedCount;

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

      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-black text-white">
            المحكمون والتكليفات
            <UserCheck className="text-blue-400" size={28} />
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            إدارة حسابات المحكمين، تعديل كلمات المرور، تكليف المسابقات، والتحكم بالأجهزة
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition active:scale-95"
          >
            <UserPlus size={16} /> إضافة محكم جديد
          </button>
        </div>
      </header>

      {/* Judges Management Section */}
      <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 backdrop-blur-xl shadow-xl">
        {/* Controls Toolbar: Search, Filters & View Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800/80">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            <input
              type="text"
              className="ai-input !pr-10 !py-2 text-xs sm:text-sm w-full bg-slate-950/60 border-slate-800 focus:border-blue-500"
              placeholder="بحث بالاسم، اسم المستخدم، أو المسابقة..."
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

          {/* Filter Pills & Density View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Pills */}
            <div className="inline-flex rounded-xl bg-slate-950/70 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  filterType === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                الكل ({judges.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('assigned')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  filterType === 'assigned' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                مكلف ({assignedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('unassigned')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  filterType === 'unassigned' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                بدون تكليف ({unassignedCount})
              </button>
            </div>

            {/* View Mode Toggle: Compact vs Detailed */}
            <div className="inline-flex rounded-xl bg-slate-950/70 p-1 border border-slate-800" title="تغيير طريقة العرض">
              <button
                type="button"
                onClick={() => setViewModePreference('compact')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition ${
                  viewMode === 'compact' ? 'bg-slate-800 text-cyan-300 shadow border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Minimize2 size={13} />
                <span>عرض مصغر</span>
              </button>
              <button
                type="button"
                onClick={() => setViewModePreference('detailed')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition ${
                  viewMode === 'detailed' ? 'bg-slate-800 text-cyan-300 shadow border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Maximize2 size={13} />
                <span>عرض تفصيلي</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="mx-auto animate-spin text-blue-400 mb-3" size={28} />
            <p className="text-sm font-bold text-slate-400">جاري تحميل بيانات المحكمين والتكليفات...</p>
          </div>
        ) : filteredJudges.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
            <UserCheck className="mx-auto text-slate-600 mb-2" size={36} />
            <p className="text-sm font-bold text-slate-400">
              {searchQuery ? 'لا توجد نتائج مطابقة لبحثك' : 'لا يوجد محكمون مسجلون بعد'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-blue-400 hover:underline"
              >
                مسح البحث
              </button>
            )}
          </div>
        ) : viewMode === 'compact' ? (
          /* ════════════════════════════════════════════════════════════════
             COMPACT / MINIMUM VIEW (عرض مصغر مريح وسهل القراءة)
             ════════════════════════════════════════════════════════════════ */
          <div className="grid gap-2">
            {filteredJudges.map((j, idx) => {
              const judgeComps = (assignments[j.id] || []).map(a => a.competition).filter(Boolean);
              const judgeAvailableComps = availableCompsFor(j.id);
              const initial = j.name?.trim().charAt(0) || 'م';

              return (
                <div
                  key={j.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-slate-800/90 bg-slate-950/50 hover:bg-slate-950/80 hover:border-slate-700/80 px-4 py-2.5 transition group"
                >
                  {/* Left info: Index, Avatar, Name, Username */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[11px] font-mono text-slate-600 w-5 text-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600/30 to-cyan-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-300 text-xs shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white truncate">{j.name}</span>
                        <span className="font-mono text-[11px] text-blue-400/80 dir-ltr select-all">@{j.username}</span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Assigned Competitions & Quick Assignment */}
                  <div className="flex flex-wrap items-center gap-1.5 flex-1 lg:justify-center">
                    {judgeComps.length === 0 ? (
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-900/60 border border-slate-800/80 rounded-lg px-2 py-0.5">
                        بدون تكليف
                      </span>
                    ) : (
                      judgeComps.map(c => (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-300 shadow-sm"
                        >
                          <span>{c.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleAssignment(j.id, c.id)}
                            className="hover:text-red-400 rounded-full hover:bg-red-500/20 p-0.5 transition"
                            title="إلغاء التكليف"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))
                    )}

                    {/* Quick Assign Dropdown */}
                    {judgeAvailableComps.length > 0 && (
                      <select
                        className="ai-input !py-0.5 !px-2 text-[11px] font-bold max-w-[150px] bg-slate-900 border-slate-700/60 rounded-lg cursor-pointer text-slate-300 hover:border-blue-500"
                        value=""
                        onChange={e => {
                          if (e.target.value) toggleAssignment(j.id, e.target.value);
                        }}
                      >
                        <option value="">+ تكليف مسابقة</option>
                        {judgeAvailableComps.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({judgesOf(c.id).length}/2)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Right: Actions (Edit, Reset Device, Delete) */}
                  <div className="flex items-center gap-1 shrink-0 justify-end border-t lg:border-t-0 border-slate-800/60 pt-2 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(j)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/20 text-xs font-bold transition active:scale-95"
                      title="تعديل الاسم أو اسم المستخدم أو كلمة المرور"
                    >
                      <Pencil size={13} />
                      <span>تعديل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => resetJudgeDeviceLock(j)}
                      className="p-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/20 transition active:scale-95"
                      title="فتح قفل جهاز المحكم (تسجيل الخروج)"
                    >
                      <RefreshCw size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeJudge(j)}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/20 transition active:scale-95"
                      title="حذف المحكم نهائياً"
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
             DETAILED VIEW (عرض تفصيلي ببطاقات مريحة)
             ════════════════════════════════════════════════════════════════ */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredJudges.map((j, idx) => {
              const judgeComps = (assignments[j.id] || []).map(a => a.competition).filter(Boolean);
              const judgeAvailableComps = availableCompsFor(j.id);
              const initial = j.name?.trim().charAt(0) || 'م';

              return (
                <article
                  key={j.id}
                  className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-950/60 p-5 shadow-lg hover:border-slate-700 transition"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-600/20 border border-blue-500/30 flex items-center justify-center font-black text-blue-300 text-base shrink-0">
                          {initial}
                        </div>
                        <div>
                          <h3 className="font-black text-base text-white">{j.name}</h3>
                          <span className="font-mono text-xs text-blue-400 dir-ltr select-all">@{j.username}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-slate-600">#{idx + 1}</span>
                    </div>

                    {/* Assigned Competitions Section */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                      <p className="text-[11px] font-bold text-slate-400 mb-2">المسابقات المكلف بها:</p>
                      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                        {judgeComps.length === 0 ? (
                          <span className="text-xs text-slate-500">لا توجد مسابقات مكلف بها</span>
                        ) : (
                          judgeComps.map(c => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300"
                            >
                              {c.name}
                              <button
                                type="button"
                                onClick={() => toggleAssignment(j.id, c.id)}
                                className="hover:text-red-400"
                                title="إلغاء التكليف"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Add Assignment Select */}
                    {judgeAvailableComps.length > 0 && (
                      <div className="mt-3">
                        <select
                          className="ai-input w-full text-xs font-bold bg-slate-900 border-slate-700/80 rounded-xl cursor-pointer"
                          value=""
                          onChange={e => {
                            if (e.target.value) toggleAssignment(j.id, e.target.value);
                          }}
                        >
                          <option value="">+ تكليف مسابقة جديدة</option>
                          {judgeAvailableComps.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({judgesOf(c.id).length}/2 محكمين)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(j)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 py-2 text-xs font-black text-amber-300 transition active:scale-95"
                    >
                      <Pencil size={14} /> تعديل البيانات
                    </button>

                    <button
                      type="button"
                      onClick={() => resetJudgeDeviceLock(j)}
                      className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 transition active:scale-95"
                      title="فتح قفل الجهاز"
                    >
                      <RefreshCw size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeJudge(j)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition active:scale-95"
                      title="حذف المحكم"
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
         COMPETITION PASSCODES TABLE
         ════════════════════════════════════════════════════════════════ */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 backdrop-blur-xl shadow-xl">
        <h2 className="mb-1 flex items-center gap-2 text-base sm:text-lg font-black text-white">
          أكواد المسابقات
          <KeyRound size={20} className="text-amber-400" />
        </h2>
        <p className="mb-4 text-xs text-slate-400">
          كود الدخول المخصص لتحكيم كل مسابقة (يمكن تكليف محكم أو محكمين لكل مسابقة دون تكرار تقييم الفريق).
        </p>

        {competitions.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">لا توجد مسابقات تحكيم يدوي حالياً.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="text-xs text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3 font-bold">المسابقة</th>
                  <th className="py-3 px-3 font-bold">المحكم المكلف</th>
                  <th className="py-3 px-3 font-bold">كود الدخول</th>
                  <th className="py-3 px-3 font-bold text-center">إجراءات الكود</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {competitions.map(c => {
                  const owners = judgesOf(c.id);
                  return (
                    <tr key={c.id} className="hover:bg-slate-950/40 transition">
                      <td className="py-3.5 px-3 font-black text-white">{c.name}</td>
                      <td className="py-3.5 px-3 text-xs text-slate-300">
                        {owners.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {owners.map(o => (
                              <span key={o.id} className="inline-block rounded-md bg-slate-800 px-2 py-0.5 text-xs font-bold text-cyan-300">
                                {o.name}
                              </span>
                            ))}
                            <span className="text-[10px] text-slate-500 font-mono self-center">({owners.length}/2)</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-bold">غير مكلّف (0/2)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-mono text-sm font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                          {c.passcode || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCode(c, 'generate')}
                            className="rounded-xl bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-black text-slate-950 transition active:scale-95"
                          >
                            توليد تلقائي
                          </button>
                          <button
                            type="button"
                            onClick={() => setCode(c, 'custom')}
                            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition active:scale-95"
                          >
                            تخصيص
                          </button>
                          {c.passcode && (
                            <button
                              type="button"
                              onClick={() => setCode(c, 'revoke')}
                              className="rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1.5 text-xs font-bold transition active:scale-95"
                            >
                              إلغاء
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════
         EDIT JUDGE MODAL POPUP (نافذة تعديل المحكم المنبثقة)
         ════════════════════════════════════════════════════════════════ */}
      {editingJudge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 dir-rtl animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl border border-amber-500/30 bg-slate-900 p-6 text-right shadow-2xl shadow-black/80">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Pencil size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">تعديل بيانات المحكم</h2>
                  <p className="text-xs text-slate-400">{editingJudge.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error banner */}
            {editError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs font-bold text-rose-200">
                <AlertCircle size={16} className="shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleUpdateJudge} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">الاسم الكامل للمحكم</label>
                <input
                  type="text"
                  className="ai-input w-full bg-slate-950/70 border-slate-800 focus:border-amber-500 font-bold"
                  placeholder="مثال: القائد أحمد حسن"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المستخدم (للدخول)</label>
                <input
                  type="text"
                  className="ai-input w-full bg-slate-950/70 border-slate-800 focus:border-amber-500 font-mono text-sm"
                  placeholder="مثال: ahmed_judge"
                  value={editForm.username}
                  onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">كلمة المرور الجديدة</label>
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

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                  disabled={editSubmitting}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                >
                  {editSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
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
         CREATE JUDGE MODAL POPUP (نافذة إضافة محكم جديد)
         ════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 dir-rtl animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl border border-blue-500/30 bg-slate-900 p-6 text-right shadow-2xl shadow-black/80">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">إضافة محكم جديد</h2>
                  <p className="text-xs text-slate-400">إنشاء حساب للمحكم ثم تكليفه بالمسابقة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error banner */}
            {createError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs font-bold text-rose-200">
                <AlertCircle size={16} className="shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {/* Create Form */}
            <form onSubmit={handleCreateJudge} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المحكم</label>
                <input
                  type="text"
                  className="ai-input w-full bg-slate-950/70 border-slate-800 focus:border-blue-500 font-bold"
                  placeholder="مثال: القائد محمد علي"
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المستخدم (للدخول)</label>
                <input
                  type="text"
                  className="ai-input w-full bg-slate-950/70 border-slate-800 focus:border-blue-500 font-mono text-sm"
                  placeholder="مثال: mohamed_judge"
                  value={createForm.username}
                  onChange={e => setCreateForm({ ...createForm, username: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">كلمة السر</label>
                <div className="relative">
                  <input
                    type={createShowPassword ? 'text' : 'password'}
                    className="ai-input !pr-3 !pl-10 w-full bg-slate-950/70 border-slate-800 focus:border-blue-500 font-mono text-sm"
                    placeholder="أدخل كلمة السر للمحكم"
                    value={createForm.password}
                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
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

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                  disabled={createSubmitting}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                >
                  {createSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>جاري الإضافة...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>إضافة المحكم</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminJudges;
