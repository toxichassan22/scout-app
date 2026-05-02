import { Camera, Clock } from 'lucide-react';

const NewsCard = ({ item, showStatus = false }) => (
  <article className="card overflow-hidden !p-0">
    {item.photo ? (
      <img src={item.photo} alt={item.title} className="aspect-video w-full object-cover" />
    ) : (
    <div className="flex aspect-video items-center justify-center border-b border-slate-800 bg-slate-900 text-slate-600">
        <Camera size={44} />
      </div>
    )}
    <div className="p-5 text-right">
      <div className="mb-3 flex items-center justify-between gap-4 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          {new Date(item.timestamp).toLocaleDateString('ar-EG')}
          <Clock size={14} />
        </span>
        <span className="rounded-lg border border-accent/20 bg-accent/10 px-3 py-1 font-bold text-accent">{item.teamName}</span>
      </div>
      <h3 className="mb-2 text-lg font-black text-slate-50">{item.title}</h3>
      <p className="leading-7 text-slate-300">{item.text}</p>
      {showStatus && (
        <p className="mt-4 rounded-lg border border-accent/20 bg-accent/10 p-3 text-center text-sm font-bold text-accent">
          {item.status === 'pending' ? 'في انتظار الموافقة' : 'منشور'}
        </p>
      )}
    </div>
  </article>
);

export default NewsCard;
