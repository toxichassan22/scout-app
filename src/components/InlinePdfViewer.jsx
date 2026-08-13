import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronRight, ChevronLeft, ZoomIn, ZoomOut, RefreshCw, AlertCircle } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export default function InlinePdfViewer({ url }) {
  const canvasRef     = useRef(null);
  const containerRef  = useRef(null);
  const wrapperRef    = useRef(null);
  const renderTaskRef = useRef(null);

  // Touch tracking refs (no re-renders)
  const pinchDistRef  = useRef(null);
  const pinchZoomRef  = useRef(null);
  const lastTouchRef  = useRef(null);  // for single-finger manual scroll
  const zoomFactorRef = useRef(1.0);

  const [pdfDoc,      setPdfDoc]      = useState(null);
  const [numPages,    setNumPages]    = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomFactor,  setZoomFactor]  = useState(1.0);
  const [loading,     setLoading]     = useState(true);
  const [rendering,   setRendering]   = useState(false);
  const [error,       setError]       = useState('');

  // ── Load PDF ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true); setError(''); setPdfDoc(null);
    setCurrentPage(1); setZoomFactor(1.0); zoomFactorRef.current = 1.0;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('تعذر تحميل ملف PDF');
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelled) return;
        setPdfDoc(doc); setNumPages(doc.numPages); setLoading(false);
      } catch (err) {
        if (!cancelled) { setError(err.message || 'فشل في فتح الـ PDF'); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  // ── Render page ────────────────────────────────────────────────────────────
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch (_) {}
      renderTaskRef.current = null;
    }
    setRendering(true);
    try {
      const page       = await pdfDoc.getPage(currentPage);
      const canvas     = canvasRef.current;
      if (!canvas) return;

      const containerW = containerRef.current?.clientWidth || 340;
      const unscaled   = page.getViewport({ scale: 1 });
      const fitScale   = (containerW - 24) / unscaled.width;
      const viewport   = page.getViewport({ scale: fitScale * zoomFactor });

      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext('2d');
      canvas.width  = Math.floor(viewport.width  * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width  = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      await task.promise;
      renderTaskRef.current = null;
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') console.error('Render error:', err);
    } finally {
      setRendering(false);
    }
  }, [pdfDoc, currentPage, zoomFactor]);

  useEffect(() => { renderPage(); }, [renderPage]);

  // ── Touch handlers: touchAction:'none' → full JS control ──────────────────
  // Single finger  → manual scroll (mirrors native scroll feel)
  // Two fingers    → pinch-to-zoom (re-renders PDF at new scale, stays sharp)
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const dist = (t) => {
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onStart = (e) => {
      if (e.touches.length === 2) {
        // Begin pinch
        pinchDistRef.current = dist(e.touches);
        pinchZoomRef.current = zoomFactorRef.current;
        lastTouchRef.current = null;
      } else if (e.touches.length === 1) {
        // Begin single-finger scroll
        lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        pinchDistRef.current = null;
      }
    };

    const onMove = (e) => {
      e.preventDefault(); // safe: touchAction:'none' means no browser handling

      if (e.touches.length === 2 && pinchDistRef.current !== null) {
        // Pinch → update zoom, re-render at full quality
        const ratio   = dist(e.touches) / pinchDistRef.current;
        const newZoom = Math.min(3.5, Math.max(0.5, pinchZoomRef.current * ratio));
        zoomFactorRef.current = newZoom;
        setZoomFactor(newZoom);

      } else if (e.touches.length === 1 && lastTouchRef.current) {
        // Single finger → scroll the wrapper manually
        const dx = lastTouchRef.current.x - e.touches[0].clientX;
        const dy = lastTouchRef.current.y - e.touches[0].clientY;
        el.scrollLeft += dx;
        el.scrollTop  += dy;
        lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onEnd = (e) => {
      if (e.touches.length < 2) {
        pinchDistRef.current = null;
        pinchZoomRef.current = null;
      }
      if (e.touches.length === 0) {
        lastTouchRef.current = null;
      }
    };

    // All passive:false so preventDefault() works (touchAction:'none' makes this safe)
    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    el.addEventListener('touchend',   onEnd,   { passive: false });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
    };
  }, []);

  // ── Zoom helpers ───────────────────────────────────────────────────────────
  const changeZoom = (delta) => {
    const z = Math.min(3.5, Math.max(0.5, zoomFactorRef.current + delta));
    zoomFactorRef.current = z; setZoomFactor(z);
  };
  const resetZoom = () => { zoomFactorRef.current = 1.0; setZoomFactor(1.0); };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-950 rounded-2xl border border-slate-800 text-center min-h-[300px]">
      <RefreshCw size={28} className="animate-spin text-purple-400 mb-3" />
      <p className="text-xs font-bold text-slate-300">جاري تحميل ملف التقرير...</p>
      <span className="text-[11px] text-slate-500 mt-1">برجاء الانتظار ثوانٍ معدودة</span>
    </div>
  );

  if (error) return (
    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center min-h-[300px] flex flex-col justify-center items-center">
      <AlertCircle size={28} className="text-amber-400 mb-2" />
      <p className="text-xs font-bold text-red-400 mb-3">{error}</p>
      <div className="w-full h-80 rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
        <iframe src={url} title="PDF Fallback" className="w-full h-full border-0" />
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="flex flex-col h-full select-none" dir="rtl">

      {/* Control Bar */}
      <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-3 shrink-0 gap-2">

        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 transition">
            <ChevronRight size={18} />
          </button>
          <span className="text-xs font-black text-purple-300 bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/20 font-mono">
            صفحة {currentPage} من {numPages}
          </span>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 transition">
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Zoom buttons */}
        <div className="flex items-center gap-1">
          <button onClick={() => changeZoom(+0.25)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition">
            <ZoomIn size={16} />
          </button>
          <button onClick={() => changeZoom(-0.25)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition">
            <ZoomOut size={16} />
          </button>
          {zoomFactor !== 1.0 && (
            <button onClick={resetZoom}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-bold transition"
              title="إعادة الحجم">⟳</button>
          )}
        </div>
      </div>

      {/* Canvas scroll wrapper
          touchAction:'none' → JS controls ALL touch (scroll + pinch)
          overflow:auto      → scrollbars still visible/usable on desktop */}
      <div
        ref={wrapperRef}
        className="flex-1 overflow-auto bg-slate-950 p-2 rounded-2xl border border-slate-800 min-h-[350px]"
        style={{ touchAction: 'none' }}
      >
        <div className="relative inline-block min-w-full text-center">
          {rendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 rounded-xl z-10">
              <RefreshCw size={20} className="animate-spin text-purple-400" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="mx-auto rounded-xl shadow-2xl border border-slate-700 bg-white block"
          />
        </div>
      </div>
    </div>
  );
}
