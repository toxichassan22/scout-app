import { memo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

/**
 * EmptyState — حالة "مفيش بيانات" الموحّدة.
 */
const EmptyState = memo(function EmptyState({
  icon: Icon = Sparkles,
  title = 'لا يوجد محتوى حالياً',
  hint,
  action,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass flex flex-col items-center justify-center gap-3 p-12 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-[rgba(139,92,246,0.25)] bg-[rgba(139,92,246,0.08)] text-[#6e6889]">
        <Icon size={30} />
      </div>
      <p className="text-base font-black text-[#a9a3c2]">{title}</p>
      {hint && <p className="max-w-sm text-xs leading-6 text-[#6e6889]">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
});

export default EmptyState;
