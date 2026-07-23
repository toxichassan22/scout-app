import { memo } from 'react';
import { motion } from 'framer-motion';
import { Clock, RadioTower } from 'lucide-react';

/**
 * NewsCard — بطاقة خبر تدعم ٣ حالات:
 *  1. نص فقط   → يعرض النص بشكل كارد نضيف بدون أي placeholder
 *  2. صورة فقط → يعرض الصورة بشكل كامل
 *  3. نص + صورة → الصورة فوق والنص تحتها
 *
 * الحقول: { id, title, body, photoUrl, createdAt, category }
 * (تتوافق أيضاً مع الحقول القديمة: text/photo/timestamp)
 */
const NewsCard = memo(function NewsCard({ item }) {
  if (!item) return null;

  const photo = item.photoUrl || item.photo || null;
  const title = item.title || null;
  const body  = item.body  || item.text || null;
  const date  = item.createdAt || item.timestamp;
  const category = item.category || 'توجيهات القيادة';

  const hasPhoto = Boolean(photo);
  const hasText  = Boolean(title || body);

  // ─── Meta row (تاريخ + كاتيجوري) ───────────────────────────────────
  const MetaRow = () => (
    <div className="flex items-center justify-between gap-3 text-xs text-[#6e6889]">
      <span className="inline-flex items-center gap-1.5 font-bold shrink-0">
        {date
          ? new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })
          : ''}
        <Clock size={12} />
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.1)] px-2.5 py-0.5 text-[10px] font-black text-[#c4b5fd]">
        {category}
        <RadioTower size={11} />
      </span>
    </div>
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="glass-hover group overflow-hidden !p-0 text-right"
    >
      {/* ── حالة ١: صورة فقط ── */}
      {hasPhoto && !hasText && (
        <div className="relative overflow-hidden">
          <img
            src={photo}
            alt="بلاغ ميداني"
            loading="lazy"
            className="w-full object-cover transition-transform duration-700 group-hover:scale-105 max-h-72"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(7,6,12,0.5)] to-transparent" />
          {/* ميتا على الصورة */}
          <div className="absolute bottom-0 inset-x-0 p-4">
            <MetaRow />
          </div>
        </div>
      )}

      {/* ── حالة ٢: صورة + نص ── */}
      {hasPhoto && hasText && (
        <>
          <div className="relative overflow-hidden">
            <img
              src={photo}
              alt={title || 'بلاغ ميداني'}
              loading="lazy"
              className="aspect-video w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(7,6,12,0.65)] to-transparent" />
          </div>
          <div className="p-5 space-y-3">
            <MetaRow />
            {title && <h3 className="text-base font-black leading-7 text-white">{title}</h3>}
            {body  && <p  className="text-sm leading-7 text-[#a9a3c2]">{body}</p>}
          </div>
        </>
      )}

      {/* ── حالة ٣: نص فقط (بدون أي صورة أو placeholder) ── */}
      {!hasPhoto && hasText && (
        <div className="p-5 space-y-3">
          <MetaRow />
          {title && <h3 className="text-base font-black leading-7 text-white">{title}</h3>}
          {body  && <p  className="text-sm leading-7 text-[#a9a3c2]">{body}</p>}
        </div>
      )}
    </motion.article>
  );
});

export default NewsCard;
