import { memo } from 'react';
import { ImageOff, Video } from 'lucide-react';

/**
 * MediaSlot — مكان محجوز للصور/الفيديوهات اللي هتتعبّى لاحقاً.
 *
 * الاستخدام:
 *   <MediaSlot name="hero-video" kind="video" ratio="16/9" label="فيديو الهيرو" />
 *   <MediaSlot name="news-empty" kind="image" src={img} alt="..." />  ← لما الصورة تجهز
 *
 * لما الميديا تجهز: مرر src (وللفيديو: poster + autoplay مفعّل افتراضياً) ومفيش داعي
 * تغيّر أي حاجة تانية — الـ placeholder بيختفي تلقائياً.
 */
const MediaSlot = memo(function MediaSlot({
  name,          // اسم فريد للمكان (يُربط بـ MEDIA_MANIFEST.md)
  kind = 'image', // 'image' | 'video'
  src,
  poster,
  alt = '',
  ratio = '16/9', // aspect-ratio
  label,          // وصف يظهر داخل الـ placeholder
  className = '',
  rounded = 'rounded-3xl',
  overlay = true, // تظليل سفلي فوق الميديا لقراءة النص
  children,       // محتوى فوق الميديا (مثلاً عنوان على الهيرو)
}) {
  const hasMedia = Boolean(src);

  return (
    <div
      data-media-slot={name}
      className={`media-slot relative overflow-hidden ${rounded} ${className}`}
      style={{ aspectRatio: hasMedia || !ratio ? undefined : ratio }}
    >
      {hasMedia ? (
        <>
          {kind === 'video' ? (
            <video
              src={src}
              poster={poster}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <img src={src} alt={alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          )}
          {overlay && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(7,6,12,0.85)] via-transparent to-[rgba(7,6,12,0.25)]" />
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.1)] text-[#a78bfa]">
            {kind === 'video' ? <Video size={26} /> : <ImageOff size={26} />}
          </div>
          <div>
            <p className="text-sm font-black text-[#c4b5fd]">{label || (kind === 'video' ? 'فيديو قادم' : 'صورة قادمة')}</p>
            <p className="mt-1 font-mono text-[10px] text-[#6e6889]" dir="ltr">slot: {name}</p>
          </div>
        </div>
      )}
      {children && <div className="relative z-10 h-full w-full">{children}</div>}
    </div>
  );
});

export default MediaSlot;
