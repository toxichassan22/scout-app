import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCompetitions } from '../../context/CompetitionContext';

const emptyForm = { name: '', capital: '', currency: '', flag: '🚩', map: '' };

const AdminGeography = () => {
  const { geographyCountries, addCountry, updateCountry, deleteCountry } = useCompetitions();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    if (editingId) updateCountry(editingId, form);
    else addCountry(form);
    setForm(emptyForm);
    setEditingId(null);
  };

  const edit = (country) => {
    setEditingId(country.id);
    setForm({ name: country.name, capital: country.capital, currency: country.currency, flag: country.flag, map: country.map });
  };

  return (
    <main className="app-shell p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-2 text-gray-500">
            العودة
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-2xl font-black">إدارة الجغرافيا</h1>
        </header>

        <form onSubmit={submit} className="card mb-6 grid gap-3 md:grid-cols-2">
          <input className="input-field text-right" placeholder="اسم الدولة" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <input className="input-field text-right" placeholder="العاصمة" value={form.capital} onChange={(event) => setForm({ ...form, capital: event.target.value })} required />
          <input className="input-field text-right" placeholder="العملة" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} required />
          <input className="input-field text-right" placeholder="العلم" value={form.flag} onChange={(event) => setForm({ ...form, flag: event.target.value })} required />
          <input className="input-field text-right md:col-span-2" placeholder="رابط صورة الخريطة" value={form.map} onChange={(event) => setForm({ ...form, map: event.target.value })} required />
          <button type="submit" className="btn-primary flex items-center justify-center gap-2 md:col-span-2">
            {editingId ? 'حفظ التعديل' : 'إضافة دولة'}
            <Plus size={18} />
          </button>
        </form>

        <div className="grid gap-3 md:grid-cols-2">
          {geographyCountries.map((country) => (
            <article key={country.id} className="card flex items-center justify-between gap-4">
              <div className="flex gap-2">
                <button type="button" onClick={() => edit(country)} className="rounded-xl bg-gray-50 p-3 text-gray-500">
                  <Pencil size={18} />
                </button>
                <button type="button" onClick={() => deleteCountry(country.id)} className="rounded-xl bg-red-50 p-3 text-red-500">
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <h2 className="font-black">{country.name}</h2>
                  <p className="text-sm text-gray-500">{country.capital} - {country.currency}</p>
                </div>
                <span className="text-4xl">{country.flag}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
};

export default AdminGeography;
