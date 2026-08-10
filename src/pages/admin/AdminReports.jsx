import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText, Loader2, RefreshCw, Sparkles, Trash2, X } from 'lucide-react';
import {
  deleteAdminReport, fetchReportFile, getAdminCompetitions, getAdminReports, getAdminTeams,
  getReportPermissions, updateReportPermission
} from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import AdminBackLink from '../../components/AdminBackLink';

const dateInput = (value) => value ? new Date(value).toISOString().slice(0, 16) : '';

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [competitionId, setCompetitionId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const { socket } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      const [r, p, t, c] = await Promise.all([getAdminReports(), getReportPermissions(), getAdminTeams(), getAdminCompetitions()]);
      setReports(r); setPermissions(p); setTeams(t); setCompetitions(c);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!socket) return;
    socket.on('admin:report:new', fetchData);
    return () => socket.off('admin:report:new', fetchData);
  }, [socket, fetchData]);

  const selectedPermission = useMemo(() => permissions.find(p => p.teamId === teamId && p.competitionId === competitionId), [permissions, teamId, competitionId]);
  useEffect(() => setDeadline(dateInput(selectedPermission?.deadline)), [selectedPermission]);

  const changePermission = async (data) => {
    if (!teamId || !competitionId) return alert('اختر الفريق والمسابقة أولاً');
    setSaving(true);
    try { await updateReportPermission(teamId, competitionId, { ...data, deadline: deadline || null }); await fetchData(); }
    catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const removeReport = async (id) => {
    if (!confirm('حذف التقرير والملف نهائياً؟')) return;
    try { await deleteAdminReport(id); await fetchData(); } catch (err) { alert(err.message); }
  };

  // Uploads are not served statically, so the file has to come through the
  // authorised download route rather than from report.fileUrl directly.
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

  // The same two selectors drive the permission form and narrow the list below,
  // so the admin stays on one team/competition instead of scanning everything.
  const filteredReports = useMemo(() => reports.filter(r => (
    (!teamId || r.teamId === teamId) && (!competitionId || r.competitionId === competitionId)
  )), [reports, teamId, competitionId]);
  const isFiltered = Boolean(teamId || competitionId);

  return <div className="p-6 text-right dir-rtl text-white">
    <AdminBackLink />
    <div className="flex items-center justify-between mb-8">
      <button onClick={fetchData} className="p-2 rounded-xl bg-slate-800 text-sky-400"><RefreshCw size={18} /></button>
      <div><h1 className="text-2xl font-black flex gap-2">إدارة تقارير الفرق <FileText className="text-emerald-400" /></h1><p className="text-xs text-slate-400 mt-1">الصلاحيات والمواعيد وإعادة فتح التسليم لكل فريق ومسابقة</p></div>
    </div>

    <section className="card p-5 rounded-2xl border border-slate-800 bg-slate-900/60 mb-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-black">اختر الفريق والمسابقة</h2>
        {isFiltered && <button onClick={() => { setTeamId(''); setCompetitionId(''); }} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-[11px] font-bold text-slate-300 transition-colors hover:text-white"><X size={13} /> إلغاء التحديد وعرض الكل</button>}
      </div>
      <p className="mb-4 text-xs text-slate-400">التحديد يصفّي قائمة التقارير بالأسفل، ويحدّد الفريق والمسابقة لتعديل صلاحية التسليم.</p>
      <div className="grid md:grid-cols-3 gap-3">
        <select className="ai-input bg-slate-950" value={teamId} onChange={e => setTeamId(e.target.value)}><option value="">اختر الفريق</option>{teams.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        <select className="ai-input bg-slate-950" value={competitionId} onChange={e => setCompetitionId(e.target.value)}><option value="">اختر المسابقة</option>{competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <input type="datetime-local" className="ai-input" value={deadline} onChange={e => setDeadline(e.target.value)} />
      </div>
      <h3 className="mt-6 mb-3 text-xs font-black text-slate-400">صلاحية التسليم للفريق والمسابقة المحدّدين</h3>
      <div className="flex flex-wrap gap-2">
        <button disabled={saving} onClick={() => changePermission({ canSubmit: true })} className="px-4 py-2 rounded-xl bg-emerald-600 text-xs font-bold">منح الصلاحية / حفظ الموعد</button>
        <button disabled={saving} onClick={() => changePermission({ canSubmit: false })} className="px-4 py-2 rounded-xl bg-red-600 text-xs font-bold">سحب الصلاحية</button>
        <button disabled={saving} onClick={() => changePermission({ reopen: true, canSubmit: true })} className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black">إعادة فتح التسليم</button>
        {selectedPermission && <span className={`px-3 py-2 rounded-xl text-xs ${selectedPermission.canSubmit ? 'text-emerald-300 bg-emerald-500/10' : 'text-red-300 bg-red-500/10'}`}>{selectedPermission.canSubmit ? 'مسموح' : 'موقوف'}{selectedPermission.reopenedAt ? ' • أُعيد فتحه' : ''}</span>}
      </div>
    </section>

    {!loading && reports.length > 0 && <div className="mb-4 text-xs font-bold text-slate-400">
      {isFiltered ? `المعروض: ${filteredReports.length} من ${reports.length} تقرير` : `إجمالي التقارير: ${reports.length}`}
    </div>}

    {loading ? <div className="py-16 text-center text-slate-500">جاري التحميل...</div>
      : reports.length === 0 ? <div className="py-16 text-center text-slate-500"><Sparkles className="mx-auto mb-3" />لا توجد تقارير مرفوعة بعد</div>
        : filteredReports.length === 0 ? <div className="py-16 text-center text-slate-500"><Sparkles className="mx-auto mb-3" />لا توجد تقارير مطابقة لهذا التحديد</div> :
          <div className="grid md:grid-cols-2 gap-4">{filteredReports.map(rep => {
        const permission = permissions.find(p => p.teamId === rep.teamId && p.competitionId === rep.competitionId);
        const expired = permission?.deadline && new Date(permission.deadline) < new Date();
        return <article key={rep.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex justify-between gap-3">
            <div className="flex gap-2">
              <button onClick={() => removeReport(rep.id)} className="p-2 text-red-400 bg-red-500/10 rounded-lg"><Trash2 size={14} /></button>
              <button onClick={() => downloadReport(rep)} disabled={downloadingId === rep.id} title="تنزيل الملف" className="p-2 text-emerald-300 bg-emerald-500/10 rounded-lg disabled:opacity-50">{downloadingId === rep.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}</button>
            </div>
            <div><h3 className="font-bold">{rep.title || rep.fileName}</h3><p className="text-xs text-emerald-400">{rep.team?.label || 'فريق'} • {rep.competition?.name || 'بدون مسابقة'}</p></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px]"><span className="bg-slate-800 px-2 py-1 rounded">تم التسليم: {new Date(rep.uploadedAt).toLocaleString('ar-EG')}</span><span className={`px-2 py-1 rounded ${!permission?.canSubmit || expired ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}>{expired ? 'انتهى الموعد' : permission?.canSubmit === false ? 'الصلاحية مسحوبة' : 'مسموح'}</span></div>
        </article>;
      })}</div>}
  </div>;
};
export default AdminReports;
