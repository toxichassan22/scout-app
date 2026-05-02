import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCompetitions } from '../../context/CompetitionContext';

const emptyTwoTruths = {
  question: '',
  options: [
    { text: '', isLie: false },
    { text: '', isLie: false },
    { text: '', isLie: true },
  ],
};

const emptyGenius = { question: '', options: ['', '', '', ''], answer: '' };

const AdminQuestions = () => {
  const { questions, addQuestion, updateQuestion, deleteQuestion } = useCompetitions();
  const [activeTab, setActiveTab] = useState('two_truths');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyTwoTruths);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setEditingId(null);
    setForm(tab === 'two_truths' ? emptyTwoTruths : emptyGenius);
  };

  const edit = (question) => {
    setEditingId(question.id);
    setForm(JSON.parse(JSON.stringify(question)));
  };

  const submit = (event) => {
    event.preventDefault();
    if (activeTab === 'genius' && !form.answer) return;
    if (editingId) updateQuestion(activeTab, editingId, form);
    else addQuestion(activeTab, form);
    setEditingId(null);
    setForm(activeTab === 'two_truths' ? emptyTwoTruths : emptyGenius);
  };

  const updateTwoTruthOption = (index, changes) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...changes } : changes.isLie ? { ...option, isLie: false } : option,
      ),
    }));
  };

  return (
    <main className="app-shell p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-2 text-gray-500">
            العودة
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-2xl font-black">إدارة الأسئلة</h1>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-sm">
          <button type="button" onClick={() => switchTab('two_truths')} className={`rounded-xl py-3 font-bold ${activeTab === 'two_truths' ? 'bg-primary text-white' : 'text-gray-500'}`}>
            حقيقتان وكذبة
          </button>
          <button type="button" onClick={() => switchTab('genius')} className={`rounded-xl py-3 font-bold ${activeTab === 'genius' ? 'bg-primary text-white' : 'text-gray-500'}`}>
            عبقرينو
          </button>
        </div>

        <form onSubmit={submit} className="card mb-6 space-y-3">
          <input className="input-field text-right" placeholder="نص السؤال" value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} required />
          {activeTab === 'two_truths' ? (
            form.options.map((option, index) => (
              <div key={index} className="flex items-center gap-3">
                <label className="flex items-center gap-2 whitespace-nowrap text-sm font-bold text-gray-600">
                  الكذبة
                  <input type="radio" checked={option.isLie} onChange={() => updateTwoTruthOption(index, { isLie: true })} />
                </label>
                <input className="input-field text-right" placeholder={`الخيار ${index + 1}`} value={option.text} onChange={(event) => updateTwoTruthOption(index, { text: event.target.value })} required />
              </div>
            ))
          ) : (
            <>
              {form.options.map((option, index) => (
                <input key={index} className="input-field text-right" placeholder={`الخيار ${index + 1}`} value={option} onChange={(event) => setForm({ ...form, options: form.options.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)) })} required />
              ))}
              <select className="input-field text-right" value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} required>
                <option value="">اختر الإجابة الصحيحة</option>
                {form.options.filter(Boolean).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </>
          )}
          <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2">
            {editingId ? 'حفظ السؤال' : 'إضافة سؤال'}
            <Plus size={18} />
          </button>
        </form>

        <div className="grid gap-3">
          {questions[activeTab].map((question) => (
            <article key={question.id} className="card text-right">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <button type="button" onClick={() => edit(question)} className="rounded-xl bg-gray-50 p-3 text-gray-500">
                    <Pencil size={18} />
                  </button>
                  <button type="button" onClick={() => deleteQuestion(activeTab, question.id)} className="rounded-xl bg-red-50 p-3 text-red-500">
                    <Trash2 size={18} />
                  </button>
                </div>
                <h2 className="font-black">{question.question}</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {activeTab === 'two_truths'
                  ? question.options.map((option, index) => (
                      <p key={index} className={`rounded-xl p-3 text-sm font-bold ${option.isLie ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{option.text}</p>
                    ))
                  : question.options.map((option) => (
                      <p key={option} className={`rounded-xl p-3 text-sm font-bold ${option === question.answer ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>{option}</p>
                    ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
};

export default AdminQuestions;
