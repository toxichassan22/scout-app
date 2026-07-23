import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Edit3, Clock, MapPin, Sparkles, CheckCircle2, X } from 'lucide-react';
import { getAgenda, addAgendaItem, deleteAgendaItem, updateAgendaItem } from '../../services/api';

const TYPE_OPTIONS = [
  { value: 'ceremony', label: 'احتفالية / مراسم 🎖️' },
  { value: 'competition', label: 'مسابقة ميدانية 🏆' },
  { value: 'workshop', label: 'ورشة / تجميع 🛠️' },
];

const AdminAgenda = () => {
  const [zones, setZones] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('competition');
  const [zoneId, setZoneId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchAgenda();
  }, []);

  const fetchAgenda = async () => {
    try {
      const res = await getAgenda();
      setZones(res.zones || []);
      setAgenda(res.agenda || []);
      if (res.zones && res.zones.length > 0 && !zoneId) {
        setZoneId(res.zones[0].id);
      }
    } catch (err) {
      console.error('Failed to load agenda:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setTitle(item.title || '');
    setType(item.type || 'competition');
    setZoneId(item.zoneId || (zones[0]?.id || ''));
    setStartTime(item.startTime || '');
    setEndTime(item.endTime || '');
    setDescription(item.description || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setType('competition');
    setStartTime('');
    setEndTime('');
    setDescription('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !startTime || !endTime || !zoneId) return;

    setSubmitting(true);
    setSuccessMsg('');
    try {
      if (editingId) {
        await updateAgendaItem(editingId, {
          title,
          type,
          zoneId,
          startTime,
          endTime,
          description
        });
        setSuccessMsg('تم تعديل الفعالية بنجاح وتحديثها لحظياً للجميع!');
        handleCancelEdit();
      } else {
        await addAgendaItem({
          title,
          type,
          zoneId,
          startTime,
          endTime,
          description
        });
        setSuccessMsg('تمت إضافة الفعالية بنجاح إلى جدول المهرجان!');
        setTitle('');
        setDescription('');
        setStartTime('');
        setEndTime('');
      }
      await fetchAgenda();
    } catch (err) {
      alert('حدث خطأ أثناء حفظ الفعالية.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت تأكد من حذف هذه الفعالية من البرنامج؟')) return;
    try {
      await deleteAgendaItem(id);
      setAgenda((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) handleCancelEdit();
    } catch (err) {
      alert('فشل في حذف الفعالية');
    }
  };

  return (
    <main className="app-shell dir-rtl min-h-screen p-4 sm:p-6 text-right">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <Calendar className="text-cyan-400" size={28} />
              إدارة برنامج المهرجان الكشفي
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 font-bold">
              تعديل وإضافة فعاليات الجدول الزمني للمخيم بالدقيقة والموقع
            </p>
          </div>
          <span className="rounded-full border border-cyan-500/30 bg-cyan-950/40 px-4 py-1.5 text-xs font-mono font-black text-cyan-300">
            {agenda.length} فعاليات مسجلة
          </span>
        </header>

        {/* Add/Edit Agenda Form */}
        <section className={`card p-6 rounded-3xl border transition-all ${
          editingId ? 'border-amber-500/50 bg-amber-950/20 shadow-amber-500/10' : 'border-slate-800 bg-slate-900/60 shadow-xl'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              {editingId ? (
                <>
                  <Edit3 size={20} className="text-amber-400" />
                  تعديل بيانات الفعالية
                </>
              ) : (
                <>
                  <Plus size={20} className="text-cyan-400" />
                  إضافة فعالية جديدة إلى البرنامج
                </>
              )}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300 hover:text-white"
              >
                <X size={14} /> إلغاء التعديل
              </button>
            )}
          </div>

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-300">
              <CheckCircle2 size={16} />
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">عنوان الفعالية *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: مسابقة تسميع القرآن الكريم"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">نوع الفعالية *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">المنطقة / الموقع *</label>
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>منطقة {z.name} ({z.numberLabel})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">من وقت *</label>
                <input
                  type="text"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="08:00"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">إلى وقت *</label>
                <input
                  type="text"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="09:00"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-1 flex items-end gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full rounded-xl px-6 py-2.5 text-sm font-black transition active:scale-98 disabled:opacity-50 ${
                    editingId
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:opacity-90'
                      : 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 hover:opacity-90'
                  }`}
                >
                  {submitting ? 'جاري الحفظ...' : editingId ? 'تعديل الفعالية' : 'إضافة الفعالية'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">تفاصيل ومكونات الفعالية</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اكتب التحديات أو المسابقات المشمولة في هذه الفعالية..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </form>
        </section>

        {/* Existing Agenda Items List */}
        <section className="space-y-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Clock size={20} className="text-amber-400" />
            فعاليات المهرجان الحالية ({agenda.length})
          </h2>

          {loading ? (
            <p className="text-sm font-bold text-slate-400 text-center py-8">جاري التحميل...</p>
          ) : agenda.length === 0 ? (
            <p className="text-sm font-bold text-slate-400 text-center py-8">لا توجد فعاليات مضافة بعد</p>
          ) : (
            <div className="space-y-3">
              {agenda.map((item) => (
                <article
                  key={item.id}
                  className={`card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border transition ${
                    editingId === item.id ? 'border-amber-400 bg-amber-950/30' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5 text-right flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-xs font-black text-amber-300 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1">
                        {item.startTime} — {item.endTime}
                      </span>
                      <h3 className="text-base font-black text-white">{item.title}</h3>
                    </div>
                    {item.description && (
                      <p className="text-xs leading-6 text-slate-400">{item.description}</p>
                    )}
                    {item.zone && (
                      <p className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
                        <MapPin size={13} />
                        منطقة {item.zone.name} ({item.zone.numberLabel})
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-amber-300 transition hover:bg-amber-500/20"
                      title="تعديل الفعالية"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-red-400 transition hover:bg-red-500/20"
                      title="حذف الفعالية"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
};

export default AdminAgenda;
