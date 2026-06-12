import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
          <div className="max-w-md w-full rounded-lg border border-red-500/30 bg-slate-900/80 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-400 text-2xl font-black">!</div>
            <h2 className="text-xl font-black mb-2">حدث خطأ غير متوقع</h2>
            <p className="text-sm text-slate-400 mb-5">نعتذر عن هذا الخلل. يمكنك إعادة المحاولة أو العودة للرئيسية.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={this.handleReload} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/30 active:scale-95 transition">
                إعادة التحميل
              </button>
              <button onClick={this.handleReset} className="rounded-lg border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-bold text-slate-200 active:scale-95 transition">
                الرئيسية
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
