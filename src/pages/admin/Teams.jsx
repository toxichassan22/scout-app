import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminTeams = () => {
  const { teams, addTeam, updateTeam, deleteTeam, getTeamLoginCount, maxTeamLogins } = useAuth();
  const [newTeam, setNewTeam] = useState('');
  const [editing, setEditing] = useState(null);

  const handleAdd = (event) => {
    event.preventDefault();
    if (addTeam(newTeam)) setNewTeam('');
  };

  const handleEdit = (event) => {
    event.preventDefault();
    if (editing && updateTeam(editing.oldName, editing.name)) setEditing(null);
  };

  return (
    <main className="app-shell p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-2 text-gray-500">
            العودة
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-2xl font-black">إدارة الفرق</h1>
        </header>

        <form onSubmit={handleAdd} className="card mb-6 flex flex-col gap-3 sm:flex-row">
          <button type="submit" className="btn-primary flex items-center justify-center gap-2">
            إضافة
            <UserPlus size={18} />
          </button>
          <input className="input-field text-right" placeholder="اسم الفريق الجديد" value={newTeam} onChange={(event) => setNewTeam(event.target.value)} required />
        </form>

        {editing && (
          <form onSubmit={handleEdit} className="card mb-6 flex flex-col gap-3 border-primary sm:flex-row">
            <button type="submit" className="btn-primary">حفظ</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-xl bg-gray-100 px-5 py-3 font-bold">إلغاء</button>
            <input className="input-field text-right" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} required />
          </form>
        )}

        <div className="grid gap-3">
          {teams.map((team) => (
            <article key={team} className="card flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setEditing({ oldName: team, name: team })} className="rounded-xl bg-gray-50 p-3 text-gray-500">
                  <Pencil size={18} />
                </button>
                <button type="button" onClick={() => deleteTeam(team)} className="rounded-xl bg-red-50 p-3 text-red-500">
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <h2 className="text-lg font-black">{team}</h2>
                  <p className="text-sm text-gray-500">{getTeamLoginCount(team)} / {maxTeamLogins} أعضاء مسجلين</p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Users />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
};

export default AdminTeams;
