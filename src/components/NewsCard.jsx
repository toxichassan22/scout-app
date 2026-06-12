import { Camera, Clock, RadioTower } from 'lucide-react';

const NewsCard = ({ item, showStatus = false }) => (
  <article className="hud-card overflow-hidden !p-0">
    {item.photo ? (
      <img src={item.photo} alt={item.title} className="aspect-video w-full object-cover" />
    ) : (
      <div className="relative flex aspect-video items-center justify-center border-b border-primary/15 bg-slate-950/70 text-primary/55">
        <img src="/brand/empty-news.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <Camera size={44} className="relative" />
      </div>
    )}
    <div className="p-5 text-right">
      <div className="mb-3 flex items-center justify-between gap-4 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          {new Date(item.timestamp).toLocaleDateString('ar-EG')}
          <Clock size={14} />
        </span>
        <span className="status-badge status-badge-amber">
          {item.teamName}
          <RadioTower size={13} />
        </span>
      </div>
      <h3 className="mb-2 text-xl font-black text-slate-50">{item.title}</h3>
      <p className="leading-7 text-slate-300">{item.text}</p>
      {showStatus && (
        <p className="status-badge status-badge-amber mt-4 flex justify-center p-3 text-sm">
          {item.status === 'pending' ? 'في انتظار الموافقة' : 'منشور'}
        </p>
      )}
    </div>
  </article>
);

export default NewsCard;
