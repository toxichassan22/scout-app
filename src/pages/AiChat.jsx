import { useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sendAiMessageStream } from '../services/api';

function getAiErrorMessage(error) {
  if (error.code === 'AI_NOT_CONFIGURED') return 'مساعد الذكاء الاصطناعي غير مفعّل حالياً. تواصلوا مع الإدارة.';
  if (error.code === 'AI_PROVIDER_AUTH') return 'مفاتيح مزود الذكاء الاصطناعي غير مقبولة. راجعوا مفاتيح الـ API الخاصة بالمزود.';
  if (error.code === 'AI_TIMEOUT' || error.status === 504) return 'استغرق المساعد وقتاً طويلاً في الرد. حاول مرة أخرى.';
  if (error.code === 'AI_RATE_LIMITED' || error.status === 429) {
    const retryHint = error.retryAfter ? ` جرّب بعد ${error.retryAfter} ثانية.` : '';
    return `تم الوصول إلى الحد المؤقت للمساعد.${retryHint}`;
  }
  if (error.isNetworkError) return 'تعذر الوصول إلى خادم المساعد. تحقق من الاتصال ثم حاول مرة أخرى.';
  if (error.status >= 500) return 'تعذر اتصال المساعد بمزود الذكاء الاصطناعي. حاول مرة أخرى بعد قليل.';
  return error.message || 'تعذر إكمال طلب المساعد حالياً.';
}

function formatAiContent(content) {
  return String(content || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\s+(?=#{1,6}\s)/g, '\n')
    .replace(/\s*\|+\s*/g, '\n')
    .replace(/\s*[-–—]{4,}\s*/g, '\n')
    .replace(/\s+(?=[•●▪]\s)/g, '\n')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
}

function AiMessageContent({ content }) {
  return (
    <div className="space-y-1.5 break-words">
      {formatAiContent(content).map((line, index) => {
        const isHeading = /^#{1,6}\s/.test(line);
        const isBullet = /^[•●▪]\s?/.test(line);
        const text = line.replace(/^#{1,6}\s*/, '').replace(/^[•●▪]\s?/, '');
        return (
          <p key={`${index}-${text}`} className={isHeading ? 'font-black text-white' : 'leading-7'}>
            {isBullet && <span className="me-1.5 text-cyan-300">•</span>}
            {text}
          </p>
        );
      })}
    </div>
  );
}

const AiChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retryRequest, setRetryRequest] = useState(null);

  const sendMessage = async (content, previousMessages = messages) => {
    const next = [...previousMessages, { role: 'user', content }];
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput('');
    setError('');
    setBusy(true);
    let streamedContent = '';
    try {
      await sendAiMessageStream(next, chunk => {
        streamedContent += chunk;
        setMessages(current => {
          const lastIndex = current.length - 1;
          if (lastIndex < 0 || current[lastIndex]?.role !== 'assistant') {
            return [...current, { role: 'assistant', content: streamedContent }];
          }
          return [...current.slice(0, lastIndex), { ...current[lastIndex], content: streamedContent }];
        });
      });
      setRetryRequest(null);
    } catch (err) {
      setMessages(current => {
        const last = current.at(-1);
        return last?.role === 'assistant' && !last.content ? current.slice(0, -1) : current;
      });
      setRetryRequest({ content, previousMessages });
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
    if (!retryRequest || busy) return;
    await sendMessage(retryRequest.content, retryRequest.previousMessages);
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
              <AiMessageContent content={message.content} />
              {busy && index === messages.length - 1 && message.role === 'assistant' && <span className="ms-1 animate-pulse text-cyan-300">▌</span>}
            </div>
          ))}
        </div>
        {error && (
          <div role="alert" className="my-3 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-center text-xs font-bold text-amber-100">
            <p>{error}</p>
            {retryRequest && <button type="button" onClick={retry} disabled={busy} className="rounded-lg border border-amber-300/30 px-3 py-1.5 text-amber-200 transition hover:bg-amber-300/10 disabled:opacity-50">إعادة المحاولة</button>}
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
