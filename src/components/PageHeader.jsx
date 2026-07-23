import { memo } from 'react';
import { motion } from 'framer-motion';

/**
 * PageHeader — ترويسة الصفحة الموحّدة (kicker + عنوان + وصف + إجراء اختياري).
 */
const PageHeader = memo(function PageHeader({
  kicker,        // نص صغير فوق العنوان (مثلاً: "النشرة الرسمية")
  badge,         // { icon: Icon, text, tone: 'violet'|'ember'|'fern'|'mute' }
  title,         // العنوان الرئيسي
  description,   // وصف سطرين
  icon: Icon,    // أيقونة كبيرة بجانب العنوان
  tone = 'violet', // لون الهوية: violet | ember | fern
  action,        // عنصر إجراء اختياري (زر/رابط) يظهر في الجهة المقابلة
}) {
  const tones = {
    violet: { glass: 'glass-violet', text: 'text-scout', badge: 'badge-violet', iconBox: 'border-[rgba(139,92,246,0.35)] bg-[rgba(139,92,246,0.12)] text-[#a78bfa]' },
    ember: { glass: 'glass-ember', text: 'text-fire', badge: 'badge-ember', iconBox: 'border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.12)] text-[#fcd34d]' },
    fern: { glass: 'glass-fern', text: 'text-oasis', badge: 'badge-fern', iconBox: 'border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.12)] text-[#6ee7b7]' },
  };
  const t = tones[tone] || tones.violet;
  const BadgeIcon = badge?.icon;

  return (
    <motion.header
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-sheen ${t.glass} mb-8 p-6 sm:p-8`}
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1 text-right">
          {badge && (
            <span className={`${t.badge} mb-3`}>
              {BadgeIcon && <BadgeIcon size={13} />}
              {badge.text}
            </span>
          )}
          {kicker && <p className="section-kicker mb-1.5">{kicker}</p>}
          <h1 className={`text-2xl font-black sm:text-3xl ${t.text} flex items-center justify-start gap-3`}>
            {title}
            {Icon && <Icon size={30} className="shrink-0" />}
          </h1>
          {description && (
            <p className="mt-3 max-w-xl text-sm leading-7 text-[#a9a3c2]">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0 self-center">{action}</div>}
      </div>
    </motion.header>
  );
});

export default PageHeader;
