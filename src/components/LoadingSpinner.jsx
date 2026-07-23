import { memo } from 'react';

/**
 * LoadingSpinner — مؤشر تحميل موحّد (جمرة بتلف).
 */
const LoadingSpinner = memo(function LoadingSpinner({ label = 'جاري التحميل...', size = 'md' }) {
  const sizes = {
    sm: 'h-5 w-5 border-2',
    md: 'h-9 w-9 border-[3px]',
    lg: 'h-12 w-12 border-4',
  };
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div
        className={`${sizes[size] || sizes.md} rounded-full border-[rgba(245,158,11,0.15)] border-t-[#f59e0b] animate-spin`}
        style={{ animationDuration: '0.8s' }}
      />
      {label && <p className="text-xs font-bold text-[#6e6889]">{label}</p>}
    </div>
  );
});

export default LoadingSpinner;
