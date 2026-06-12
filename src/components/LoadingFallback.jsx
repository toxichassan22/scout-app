export const LoadingFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-200">
    <div className="relative h-14 w-14">
      <div className="absolute inset-0 rounded-full border-2 border-signal/20" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-signal animate-spin" />
    </div>
    <p className="text-sm text-slate-400 font-bold">جاري التحميل...</p>
  </div>
);
