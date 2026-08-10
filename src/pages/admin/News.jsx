import React, { useEffect, useState } from 'react';
import { Newspaper, Pencil, Send, Trash2, X } from 'lucide-react';
import { deleteNews, getAdminTeams, getNews, publishNews, updateNews } from '../../services/api';
import AdminBackLink from '../../components/AdminBackLink';

const CATEGORIES = [{ id: 'general', label: 'عام 📢' }, { id: 'lost_found', label: 'مفقودات 🔍' }, { id: 'urgent', label: 'عاجل 🚨' }, { id: 'scoring', label: 'التقييم 🏆' }];
const empty = { title: '', body: '', photoUrl: '', category: 'general', targetTeamIds: [] };

const AdminNews = () => {
  const [news, setNews] = useState([]), [teams, setTeams] = useState([]), [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null), [loading, setLoading] = useState(true), [submitting, setSubmitting] = useState(false);
  const load = async () => { try { const [n, t] = await Promise.all([getNews(), getAdminTeams()]); setNews(n); setTeams(t); } finally { setLoading(false); } };
  useEffect(() => { load().catch(console.error) }, []);
  const toggleTeam = id => setForm(p => ({ ...p, targetTeamIds: p.targetTeamIds.includes(id) ? p.targetTeamIds.filter(x => x !== id) : [...p.targetTeamIds, id] }));
  const reset = () => { setForm(empty); setEditing(null) };
  const edit = n => { setEditing(n.id); setForm({ title: n.title, body: n.body, photoUrl: n.photoUrl || '', category: n.category || 'general', targetTeamIds: Array.isArray(n.targetTeamIds) ? n.targetTeamIds : [] }) };
  const submit = async e => { e.preventDefault(); setSubmitting(true); try { editing ? await updateNews(editing, form) : await publishNews(form); reset(); await load() } catch (err) { alert(err.message) } finally { setSubmitting(false) } };
  const remove = async id => { if (!confirm('حذف الخبر؟')) return; try { await deleteNews(id); await load() } catch (e) { alert(e.message) } };
  return <div className="p-6 text-right dir-rtl text-white"><AdminBackLink /><header className="mb-8"><h1 className="text-2xl font-black flex gap-2">الأخبار الموجهة <Newspaper className="text-sky-400" /></h1><p className="text-xs text-slate-400">إنشاء وتعديل وحذف الأخبار العامة أو المخصصة لفرق بعينها</p></header>
    <div className="grid lg:grid-cols-3 gap-6"><form onSubmit={submit} className="card p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
      <div className="flex justify-between"><button type="button" onClick={reset}><X size={18} /></button><h2 className="font-black">{editing ? 'تعديل الخبر' : 'خبر جديد'}</h2></div>
      <select className="ai-input bg-slate-950" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
      <input className="ai-input" placeholder="العنوان" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
      <textarea className="ai-input min-h-28" placeholder="المحتوى" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} required />
      <input type="url" className="ai-input" placeholder="رابط صورة اختياري" value={form.photoUrl} onChange={e => setForm({ ...form, photoUrl: e.target.value })} />
      <div><p className="text-xs text-slate-400 mb-2">الفرق المستهدفة (عدم الاختيار = الجميع)</p><div className="max-h-36 overflow-auto grid grid-cols-2 gap-2">{teams.map(t => <label key={t.id} className="text-xs bg-slate-950 p-2 rounded"><input type="checkbox" checked={form.targetTeamIds.includes(t.id)} onChange={() => toggleTeam(t.id)} className="ml-2" />{t.label}</label>)}</div></div>
      <button disabled={submitting} className="w-full py-3 rounded-xl bg-sky-500 text-slate-950 font-black flex justify-center gap-2"><Send size={16} />{editing ? 'حفظ التعديل' : 'نشر الخبر'}</button>
    </form>
      <section className="lg:col-span-2 card p-5 rounded-2xl bg-slate-900/60 border border-slate-800"><h2 className="font-black mb-4">الأخبار المنشورة ({news.length})</h2>{loading ? <p className="text-slate-500">جاري التحميل...</p> : <div className="space-y-3">{news.map(n => <article key={n.id} className="p-4 rounded-xl bg-slate-950/50 border border-slate-800"><div className="flex justify-between gap-4"><div className="flex gap-2"><button onClick={() => remove(n.id)} className="text-red-400"><Trash2 size={16} /></button><button onClick={() => edit(n)} className="text-amber-400"><Pencil size={16} /></button></div><div><div className="flex gap-2 justify-end"><span className="text-[10px] bg-slate-800 px-2 rounded">{CATEGORIES.find(c => c.id === n.category)?.label || n.category}</span><h3 className="font-bold">{n.title}</h3></div><p className="text-xs text-slate-400 mt-2">{n.body}</p><p className="text-[10px] text-sky-400 mt-2">{n.targetTeamIds?.length ? `موجه إلى ${n.targetTeamIds.length} فريق` : 'منشور لجميع الفرق'}</p></div></div></article>)}</div>}</section></div>
  </div>;
};
export default AdminNews;
