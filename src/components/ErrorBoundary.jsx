import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('⚠️ [ErrorBoundary caught exception]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || String(this.state.error || 'خطأ غير معروف');

      return (
        <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
          <div className="max-w-md w-full rounded-3xl border border-red-500/30 bg-slate-900/90 p-7 text-center shadow-2xl backdrop-blur-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-3xl font-black shadow-inner">
              !
            </div>
            <h2 className="text-xl font-black text-white mb-2">حدث خطأ غير متوقع</h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              نعتذر عن هذا الخلل. يمكنك إعادة المحاولة أو العودة للصفحة الرئيسية.
            </p>

            {errorMessage && (
              <div className="text-right text-xs font-mono text-red-300 bg-red-950/40 p-3 rounded-2xl border border-red-500/20 mb-5 break-words">
                <span className="font-bold text-red-400 block mb-1">تفاصيل الخطأ:</span>
                {errorMessage}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="rounded-2xl bg-emerald-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-95 transition hover:bg-emerald-400"
              >
                إعادة التحميل 🔄
              </button>
              <button
                onClick={this.handleReset}
                className="rounded-2xl border border-slate-700 bg-slate-800/80 px-5 py-2.5 text-xs font-bold text-slate-200 active:scale-95 transition hover:bg-slate-700"
              >
                الرئيسية 🏠
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
