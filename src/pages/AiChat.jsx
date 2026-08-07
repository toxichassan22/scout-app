import { useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sendAiMessage } from '../services/api';

const AiChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async event => {
    event.preventDefault();
    const content = input.trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next); setInput(''); setError(''); setBusy(true);
    try {
      const response = await sendAiMessage(next);
      setMessages([...next, { role: 'assistant', content: response.message }]);
    } catch (err) { setError(err.message || 'مساعد الذكاء الاصطناعي غير مفعل بعد'); }
    finally { setBusy(false); }
  };
  return <main className="page-shell dir-rtl !max-w-3xl"><header className="mb-7 flex items-center justify-between"><button type="button" onClick={() => navigate('/home')} className="btn-ghost !px-4 !py-2 text-xs">العودة</button><div className="text-right"><span className="badge-violet mb-2"><Sparkles size={13} /> مساعد المخيم</span><h1 className="text-3xl font-black text-white">شات AI</h1></div></header><section className="glass-sheen glass-violet flex min-h-[60vh] flex-col p-5 sm:p-7"><div className="flex-1 space-y-3 overflow-y-auto">{messages.length === 0 && <div className="flex h-full flex-col items-center justify-center text-center text-slate-400"><Bot size={42} className="mb-3 text-violet-300" /><p className="text-sm leading-7">اسأل عن المسابقات أو البرنامج أو طريقة استخدام الموقع. المساعد لا يرى درجات الفرق الأخرى ولا يطلب كلمات مرور.</p></div>}{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`rounded-2xl p-4 text-sm leading-7 ${message.role === 'user' ? 'mr-8 bg-violet-500/15 text-violet-100' : 'ml-8 bg-white/5 text-slate-200'}`}><b className="mb-1 block text-xs text-slate-400">{message.role === 'user' ? 'أنت' : 'مساعد المخيم'}</b>{message.content}</div>)}</div>{error && <p className="my-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-center text-xs font-bold text-amber-100">{error}</p>}<form onSubmit={submit} className="mt-5 flex gap-2"><input value={input} onChange={event => setInput(event.target.value)} className="input-field flex-1" placeholder="اكتب سؤالك..." maxLength={4000} /><button className="btn-violet !px-5" disabled={busy || !input.trim()}>{busy ? '...' : <Send size={17} />}</button></form></section></main>;
};

export default AiChat;
