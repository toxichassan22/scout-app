import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, Clock, Download, FileText, Loader2, RefreshCw, Search, Sparkles, Trash2, Users } from 'lucide-react';
import {
  deleteAdminReport, fetchReportFile, getAdminCompetitions, getAdminReports, getAdminTeams,
  getReportPermissions, updateReportPermission
} from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import AdminBackLink from '../../components/AdminBackLink';

const dateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDate = (value) => value ? new Date(value).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '';

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

  const selectedPermission = useMemo(
    () => permissions.find(p => p.teamId === selectedTeamId && p.competitionId === competitionId),
    [permissions, selectedTeamId, competitionId]
  );
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
      <div className="mb-8 flex items-center justify-between">
        <button type="button" onClick={fetchData} className="rounded-xl bg-slate-800 p-2 text-sky-400"><RefreshCw size={18} /></button>
        <div>
          <h1 className="flex gap-2 text-2xl font-black">إدارة تقارير الفرق <FileText className="text-emerald-400" /></h1>
          <p className="mt-1 text-xs text-slate-400">اختر الفرقة أولاً، ثم راجع تقاريرها وأدر صلاحية التسليم لمسابقة محددة</p>
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
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => openTeam(team.id)}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-right transition hover:-translate-y-0.5 hover:border-cyan-400/30"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className={`rounded-xl px-2.5 py-1 text-[11px] font-black ${teamFiles.length ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                        {teamFiles.length} تقرير
                      </span>
                      <ChevronLeft size={18} className="text-slate-500" />
                    </div>
                    <h2 className="text-base font-black text-white">{team.label || team.username}</h2>
                    <p className="mt-1 text-[11px] font-bold text-slate-500" dir="ltr">{team.username}</p>
                  </button>
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
            <h3 className="mb-1 font-black">صلاحية التسليم لهذه الفرقة</h3>
            <p className="mb-4 text-xs text-slate-400">اختر المسابقة ثم امنح أو اسحب الصلاحية، أو حدّد موعداً نهائياً، أو أعد فتح التسليم بعد الرفع الأول.</p>
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <select className="ai-input bg-slate-950" value={competitionId} onChange={event => setCompetitionId(event.target.value)}>
                <option value="">اختر المسابقة</option>
                {competitions.map(competition => <option key={competition.id} value={competition.id}>{competition.name}</option>)}
              </select>
              <input type="datetime-local" className="ai-input" value={deadline} onChange={event => setDeadline(event.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={saving} onClick={() => changePermission({ canSubmit: true })} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold disabled:opacity-50">منح الصلاحية / حفظ الموعد</button>
              <button type="button" disabled={saving} onClick={() => changePermission({ canSubmit: false })} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold disabled:opacity-50">سحب الصلاحية</button>
              <button type="button" disabled={saving} onClick={() => changePermission({ reopen: true, canSubmit: true })} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 disabled:opacity-50">إعادة فتح التسليم</button>
              {competitionId && (
                <span className={`rounded-xl px-3 py-2 text-xs ${permissionStatus(selectedPermission).className}`}>
                  {permissionStatus(selectedPermission).label}
                  {selectedPermission?.deadline ? ` • حتى ${formatDate(selectedPermission.deadline)}` : ''}
                </span>
              )}
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
    </div>
  );
};

export default AdminReports;
