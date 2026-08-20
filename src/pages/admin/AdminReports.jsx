import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, Clock, Download, FileText, ListChecks, Loader2, RefreshCw, Search, Sparkles, Trash2, Users, X } from 'lucide-react';
import {
  deleteAdminReport, fetchReportFile, getAdminCompetitions, getAdminReports, getAdminTeams,
  getReportPermissions, revokeAllReportPermissions, updateReportPermission, updateReportPermissions
} from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import AdminBackLink from '../../components/AdminBackLink';
import { formatDateTime12 } from '../../utils/timeFormat';

const dateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDate = (value) => formatDateTime12(value);

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [competitionId, setCompetitionId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [grantTeamId, setGrantTeamId] = useState('');
  const [grantCompetitionIds, setGrantCompetitionIds] = useState([]);
  const [grantDeadline, setGrantDeadline] = useState('');
  const [revokingAll, setRevokingAll] = useState(false);
  const { socket } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      const [r, p, t, c] = await Promise.all([getAdminReports(), getReportPermissions(), getAdminTeams(), getAdminCompetitions()]);
      setReports(r);
      setPermissions(p);
      setTeams(t);
      setCompetitions(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!socket) return;
    socket.on('admin:report:new', fetchData);
    return () => socket.off('admin:report:new', fetchData);
  }, [socket, fetchData]);

  const reportCompetitions = useMemo(
    () => competitions.filter(competition => String(competition.slug || '').startsWith('report-')),
    [competitions]
  );
  const selectedPermission = useMemo(
    () => permissions.find(p => p.teamId === selectedTeamId && p.competitionId === competitionId),
    [permissions, selectedTeamId, competitionId]
  );
  const grantTeam = useMemo(() => teams.find(team => team.id === grantTeamId) || null, [teams, grantTeamId]);
  const allGrantCompetitionsSelected = reportCompetitions.length > 0 && grantCompetitionIds.length === reportCompetitions.length;
  useEffect(() => setDeadline(dateInput(selectedPermission?.deadline)), [selectedPermission]);

  const reportsByTeam = useMemo(() => {
    const grouped = new Map();
    reports.forEach(report => {
      const list = grouped.get(report.teamId) || [];
      list.push(report);
      grouped.set(report.teamId, list);
    });
    return grouped;
  }, [reports]);

  const visibleTeams = useMemo(() => {
    const query = search.trim();
    return teams
      .filter(team => !query || `${team.label || ''} ${team.username || ''}`.includes(query))
      .slice()
      .sort((a, b) => {
        const aCount = reportsByTeam.get(a.id)?.length || 0;
        const bCount = reportsByTeam.get(b.id)?.length || 0;
        if (bCount !== aCount) return bCount - aCount;
        return String(a.label || '').localeCompare(String(b.label || ''), 'ar');
      });
  }, [teams, search, reportsByTeam]);

  const selectedTeam = useMemo(() => teams.find(team => team.id === selectedTeamId) || null, [teams, selectedTeamId]);
  const teamReports = useMemo(() => (reportsByTeam.get(selectedTeamId) || []).slice().sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)), [reportsByTeam, selectedTeamId]);

  const changePermission = async (data) => {
    if (!selectedTeamId || !competitionId) return alert('اختر المسابقة أولاً');
    setSaving(true);
    try {
      await updateReportPermission(selectedTeamId, competitionId, { ...data, deadline: deadline || null });
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openGrantModal = (teamId) => {
    setGrantTeamId(teamId);
    setGrantCompetitionIds([]);
    setGrantDeadline('');
  };

  const closeGrantModal = () => {
    setGrantTeamId('');
    setGrantCompetitionIds([]);
    setGrantDeadline('');
  };

  const toggleGrantCompetition = (competitionId) => {
    setGrantCompetitionIds(current => current.includes(competitionId)
      ? current.filter(id => id !== competitionId)
      : [...current, competitionId]);
  };

  const toggleAllGrantCompetitions = () => {
    setGrantCompetitionIds(allGrantCompetitionsSelected ? [] : reportCompetitions.map(competition => competition.id));
  };

  const grantPermission = async () => {
    if (!grantTeamId || grantCompetitionIds.length === 0) return alert('اختر مسابقة واحدة على الأقل');
    setSaving(true);
    try {
      await updateReportPermissions(grantTeamId, {
        competitionIds: grantCompetitionIds,
        canSubmit: true,
        deadline: grantDeadline || null,
      });
      closeGrantModal();
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const revokeAllPermissions = async () => {
    if (!window.confirm('سيتم سحب صلاحية رفع التقارير من كل الفرق في كل مسابقات التقارير. هل تريد المتابعة؟')) return;
    setRevokingAll(true);
    try {
      await revokeAllReportPermissions();
      await fetchData();
      alert('تم سحب الصلاحية من كل الفرق');
    } catch (err) {
      alert(err.message);
    } finally {
      setRevokingAll(false);
    }
  };

  const removeReport = async (id) => {
    if (!confirm('حذف التقرير والملف نهائياً؟')) return;
    try {
      await deleteAdminReport(id);
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const downloadReport = async (report) => {
    setDownloadingId(report.id);
    let objectUrl = '';
    try {
      const blob = await fetchReportFile(report.id);
      objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = report.fileName || 'report';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      alert(err.message || 'تعذر تحميل الملف');
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setDownloadingId('');
    }
  };

  const openTeam = (teamId) => {
    setSelectedTeamId(teamId);
    setCompetitionId('');
    setDeadline('');
  };

  const closeTeam = () => {
    setSelectedTeamId('');
    setCompetitionId('');
    setDeadline('');
  };

  const permissionStatus = (permission) => {
    if (!permission) return { label: 'مفتوح افتراضياً', className: 'bg-slate-800 text-slate-300' };
    const expired = permission.deadline && new Date(permission.deadline) < new Date();
    if (permission.canSubmit === false) return { label: 'موقوف', className: 'bg-red-500/10 text-red-300' };
    if (expired) return { label: 'انتهى الموعد', className: 'bg-red-500/10 text-red-300' };
    if (permission.reopenedAt) return { label: 'أُعيد فتحه', className: 'bg-amber-500/10 text-amber-200' };
    return { label: 'مسموح', className: 'bg-emerald-500/10 text-emerald-300' };
  };

  return (
    <div className="p-6 text-right dir-rtl text-white">
      <AdminBackLink />
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={fetchData} className="rounded-xl bg-slate-800 p-2 text-sky-400" title="تحديث"><RefreshCw size={18} /></button>
          <button type="button" onClick={revokeAllPermissions} disabled={revokingAll || saving} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold disabled:opacity-50">
            {revokingAll ? 'جاري السحب...' : 'سحب الصلاحية من كل الفرق'}
          </button>
        </div>
        <div>
          <h1 className="flex gap-2 text-2xl font-black">إدارة تقارير الفرق <FileText className="text-emerald-400" /></h1>
          <p className="mt-1 text-xs text-slate-400">اختر الفرقة ثم اسمح لها برفع مسابقة واحدة أو عدة مسابقات في نفس الوقت</p>
        </div>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.08] p-4">
          <div className="mb-2 flex items-center justify-between text-cyan-100">
            <span className="text-xs font-bold">الفرق المسجلة</span>
            <Users size={16} />
          </div>
          <strong className="block text-3xl font-black">{teams.length}</strong>
        </div>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.08] p-4">
          <div className="mb-2 flex items-center justify-between text-emerald-100">
            <span className="text-xs font-bold">التقارير المرفوعة</span>
            <FileText size={16} />
          </div>
          <strong className="block text-3xl font-black">{reports.length}</strong>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <div className="mb-2 flex items-center justify-between text-slate-300">
            <span className="text-xs font-bold">فرق بدون تقارير</span>
            <Sparkles size={16} />
          </div>
          <strong className="block text-3xl font-black">{teams.filter(team => !(reportsByTeam.get(team.id)?.length)).length}</strong>
        </div>
      </section>

      {loading ? (
        <div className="py-16 text-center text-slate-500">جاري التحميل...</div>
      ) : !selectedTeam ? (
        <>
          <div className="relative mb-5">
            <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="ابحث باسم الفرقة..."
              className="ai-input w-full bg-slate-950 pr-10"
            />
          </div>

          {visibleTeams.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Users className="mx-auto mb-3" />
              {teams.length === 0 ? 'لا توجد فرق مسجلة بعد' : 'لا توجد فرق مطابقة للبحث'}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTeams.map(team => {
                const teamFiles = reportsByTeam.get(team.id) || [];
                return (
                  <div key={team.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-right transition hover:-translate-y-0.5 hover:border-cyan-400/30">
                    <button type="button" onClick={() => openTeam(team.id)} className="w-full text-right">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <span className={`rounded-xl px-2.5 py-1 text-[11px] font-black ${teamFiles.length ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                          {teamFiles.length} تقرير
                        </span>
                        <ChevronLeft size={18} className="text-slate-500" />
                      </div>
                      <h2 className="text-base font-black text-white">{team.label || team.username}</h2>
                      <p className="mt-1 text-[11px] font-bold text-slate-500" dir="ltr">{team.username}</p>
                    </button>
                    <button type="button" onClick={() => openGrantModal(team.id)} className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold hover:bg-emerald-500">
                      <ListChecks size={14} /> السماح بالرفع لهذا الفريق
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={closeTeam} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white">
              <ArrowRight size={14} /> كل الفرق
            </button>
            <div>
              <h2 className="text-xl font-black">{selectedTeam.label || selectedTeam.username}</h2>
              <p className="mt-1 text-xs text-slate-400">{teamReports.length} تقرير مرفوع لهذه الفرقة</p>
            </div>
          </div>

          <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="mb-1 font-black">صلاحيات الرفع لهذه الفرقة</h3>
            <p className="mb-4 text-xs text-slate-400">السماح بالرفع يكون لهذه الفرقة فقط. اختر من النافذة أكثر من مسابقة أو حدّد الكل، ثم اضغط تم للتفعيل.</p>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <button type="button" disabled={saving || reportCompetitions.length === 0} onClick={() => openGrantModal(selectedTeamId)} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold disabled:opacity-50">
                <ListChecks size={15} /> السماح بالرفع للفرقة
              </button>
              <span className="rounded-xl bg-slate-950 px-3 py-2 text-xs text-slate-400">{reportCompetitions.length} مسابقة متاحة للتقارير</span>
            </div>
            <div className="border-t border-slate-800 pt-4">
              <p className="mb-3 text-xs font-bold text-slate-400">إعادة فتح تسليم سابق أو متابعة حالة مسابقة محددة</p>
              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <select className="ai-input bg-slate-950" value={competitionId} onChange={event => setCompetitionId(event.target.value)}>
                  <option value="">اختر المسابقة</option>
                  {reportCompetitions.map(competition => <option key={competition.id} value={competition.id}>{competition.name}</option>)}
                </select>
                <input type="datetime-local" className="ai-input" value={deadline} onChange={event => setDeadline(event.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={saving || !competitionId} onClick={() => changePermission({ reopen: true, canSubmit: true })} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 disabled:opacity-50">إعادة فتح التسليم</button>
                {competitionId && (
                  <span className={`rounded-xl px-3 py-2 text-xs ${permissionStatus(selectedPermission).className}`}>
                    {permissionStatus(selectedPermission).label}
                    {selectedPermission?.deadline ? ` • حتى ${formatDate(selectedPermission.deadline)}` : ''}
                  </span>
                )}
              </div>
            </div>
          </section>

          {teamReports.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Sparkles className="mx-auto mb-3" />
              هذه الفرقة لم ترفع أي تقارير بعد
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {teamReports.map(report => {
                const permission = permissions.find(p => p.teamId === report.teamId && p.competitionId === report.competitionId);
                const status = permissionStatus(permission);
                return (
                  <article key={report.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="flex justify-between gap-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => removeReport(report.id)} className="rounded-lg bg-red-500/10 p-2 text-red-400"><Trash2 size={14} /></button>
                        <button type="button" onClick={() => downloadReport(report)} disabled={downloadingId === report.id} title="تنزيل الملف" className="rounded-lg bg-emerald-500/10 p-2 text-emerald-300 disabled:opacity-50">
                          {downloadingId === report.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        </button>
                      </div>
                      <div>
                        <h3 className="font-bold">{report.title || report.fileName}</h3>
                        <p className="text-xs text-emerald-400">{report.competition?.name || 'بدون مسابقة'}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                      <span className="rounded bg-slate-800 px-2 py-1">تم التسليم: {formatDate(report.uploadedAt)}</span>
                      <span className={`rounded px-2 py-1 ${status.className}`}>{status.label}</span>
                      {permission?.deadline && (
                        <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1">
                          <Clock size={10} /> {formatDate(permission.deadline)}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {grantTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm dir-rtl"
          onMouseDown={event => { if (event.target === event.currentTarget) closeGrantModal(); }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="grant-report-permission-title" className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-emerald-500/30 bg-slate-950 p-5 text-right shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <button type="button" onClick={closeGrantModal} disabled={saving} className="rounded-xl bg-slate-800 p-2 text-slate-300 hover:text-white disabled:opacity-50" aria-label="إغلاق">
                <X size={18} />
              </button>
              <div>
                <h2 id="grant-report-permission-title" className="text-lg font-black text-white">السماح بالرفع للفرقة</h2>
                <p className="mt-1 text-xs text-emerald-300">{grantTeam.label || grantTeam.username}</p>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <span className="text-xs font-bold text-slate-400">تم اختيار {grantCompetitionIds.length} من {reportCompetitions.length}</span>
              <button type="button" onClick={toggleAllGrantCompetitions} disabled={reportCompetitions.length === 0 || saving} className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50">
                <Check size={14} /> {allGrantCompetitionsSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
              {reportCompetitions.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">لا توجد مسابقات تقارير متاحة حالياً</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {reportCompetitions.map(competition => {
                    const selected = grantCompetitionIds.includes(competition.id);
                    return (
                      <label key={competition.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${selected ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'}`}>
                        <input type="checkbox" checked={selected} onChange={() => toggleGrantCompetition(competition.id)} disabled={saving} className="h-4 w-4 accent-emerald-500" />
                        <span className="flex-1 text-sm font-bold text-white">{competition.name}</span>
                        {selected && <Check size={16} className="text-emerald-300" />}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <label className="mt-4 block text-xs font-bold text-slate-400">
              موعد نهائي موحّد للمسابقات المختارة (اختياري)
              <input type="datetime-local" value={grantDeadline} onChange={event => setGrantDeadline(event.target.value)} disabled={saving} className="ai-input mt-2 w-full" />
            </label>
            <div className="mt-5 flex flex-wrap justify-start gap-2">
              <button type="button" onClick={closeGrantModal} disabled={saving} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-50">إلغاء</button>
              <button type="button" onClick={grantPermission} disabled={saving || grantCompetitionIds.length === 0} className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black disabled:opacity-50">{saving ? 'جاري التفعيل...' : 'تم - تفعيل الصلاحية'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
