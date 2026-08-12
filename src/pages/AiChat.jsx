import { useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sendAiMessage } from '../services/api';

function getAiErrorMessage(error) {
  if (error.code === 'AI_NOT_CONFIGURED') return 'مساعد الذكاء الاصطناعي غير مفعّل حالياً. تواصلوا مع الإدارة.';
  if (error.code === 'AI_TIMEOUT' || error.status === 504) return 'استغرق المساعد وقتاً طويلاً في الرد. حاول مرة أخرى.';
  if (error.code === 'AI_RATE_LIMITED' || error.status === 429) {
    const retryHint = error.retryAfter ? ` جرّب بعد ${error.retryAfter} ثانية.` : '';
    return `تم الوصول إلى الحد المؤقت للمساعد.${retryHint}`;
  }
  if (error.isNetworkError) return 'تعذر الوصول إلى خادم المساعد. تحقق من الاتصال ثم حاول مرة أخرى.';
  if (error.status >= 500) return 'تعذر اتصال المساعد بمزود الذكاء الاصطناعي. حاول مرة أخرى بعد قليل.';
  return error.message || 'تعذر إكمال طلب المساعد حالياً.';
}

const AiChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retryContent, setRetryContent] = useState('');

  const sendMessage = async (content, previousMessages = messages) => {
    const next = [...previousMessages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setError('');
    setBusy(true);
    try {
      const response = await sendAiMessage(next);
      setMessages([...next, { role: 'assistant', content: response.message }]);
      setRetryContent('');
    } catch (err) {
      setRetryContent(content);
      setError(getAiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = async event => {
    event.preventDefault();
    const content = input.trim();
    if (!content || busy) return;
    await sendMessage(content);
  };

  const retry = async () => {
    if (!retryContent || busy) return;
    const previousMessages = messages.at(-1)?.role === 'user' && messages.at(-1)?.content === retryContent
      ? messages.slice(0, -1)
      : messages;
    await sendMessage(retryContent, previousMessages);
  };

  return (
    <main className="page-shell dir-rtl !max-w-3xl">
      <header className="mb-7 flex items-center justify-between gap-4">
        <button type="button" onClick={() => navigate('/home')} className="btn-ghost shrink-0 !px-4 !py-2 text-xs">العودة</button>
        <div className="min-w-0 text-right">
          <span className="badge-violet mb-2"><Sparkles size={13} /> مساعد المخيم</span>
          <h1 className="text-3xl font-black text-white">شات AI</h1>
        </div>
      </header>
      <section className="glass-sheen glass-violet flex min-h-[60vh] min-w-0 flex-col p-5 sm:p-7">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
              <Bot size={42} className="mb-3 text-violet-300" />
              <p className="text-sm leading-7">اسأل عن المسابقات أو البرنامج أو طريقة استخدام الموقع. المساعد لا يرى درجات الفرق الأخرى ولا يطلب كلمات مرور.</p>
            </div>
          )}
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`min-w-0 break-words rounded-2xl p-4 text-sm leading-7 ${message.role === 'user' ? 'mr-8 bg-violet-500/15 text-violet-100' : 'ml-8 bg-white/5 text-slate-200'}`}>
              <b className="mb-1 block text-xs text-slate-400">{message.role === 'user' ? 'أنت' : 'مساعد المخيم'}</b>
              {message.content}
            </div>
          ))}
        </div>
        {error && (
          <div role="alert" className="my-3 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-center text-xs font-bold text-amber-100">
            <p>{error}</p>
            {retryContent && <button type="button" onClick={retry} disabled={busy} className="rounded-lg border border-amber-300/30 px-3 py-1.5 text-amber-200 transition hover:bg-amber-300/10 disabled:opacity-50">إعادة المحاولة</button>}
          </div>
        )}
        <form onSubmit={submit} className="mt-5 flex min-w-0 gap-2">
          <input value={input} onChange={event => setInput(event.target.value)} className="input-field min-w-0 flex-1" placeholder="اكتب سؤالك..." maxLength={4000} />
          <button type="submit" aria-label="إرسال السؤال" className="btn-violet shrink-0 !px-5" disabled={busy || !input.trim()}>{busy ? '...' : <Send size={17} />}</button>
        </form>
      </section>
    </main>
  );
};

export default AiChat;
