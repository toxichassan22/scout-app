import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronRight, ChevronLeft, ZoomIn, ZoomOut, RefreshCw, AlertCircle } from 'lucide-react';

// Configure PDF.js worker — must match installed pdfjs-dist version 3.11.174
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export default function InlinePdfViewer({ url, fileName }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Pinch-to-zoom touch tracking refs
  const pinchStartDistRef = useRef(null);
  const pinchStartScaleRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');

  // Load the PDF document from URL
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setPdfDoc(null);
    setCurrentPage(1);

    const loadPdf = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('تعذر تحميل ملف PDF');
        const arrayBuffer = await response.arrayBuffer();
        if (cancelled) return;

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const doc = await loadingTask.promise;
        if (cancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('PDF.js load error:', err);
        setError(err.message || 'فشل في فتح ملف الـ PDF');
        setLoading(false);
      }
    };

    loadPdf();
    return () => { cancelled = true; };
  }, [url]);

  // Render the current page directly onto the canvas element
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    // Cancel any in-progress render task
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch (_) {}
      renderTaskRef.current = null;
    }

    setRendering(true);
    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const containerWidth = containerRef.current?.clientWidth || 340;
      const unscaled = page.getViewport({ scale: 1 });
      // Fit to container width, then apply user zoom
      const fitScale = (containerWidth - 16) / unscaled.width;
      const effectiveScale = fitScale * (scale / 1.2);
      const viewport = page.getViewport({ scale: effectiveScale });

      const ctx = canvas.getContext('2d');

      // Use devicePixelRatio for crisp rendering on retina / mobile screens
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderTask = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Page render error:', err);
      }
    } finally {
      setRendering(false);
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // ── Pinch-to-zoom handlers ──────────────────────────────────────────────────
  const getPinchDist = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      pinchStartDistRef.current = getPinchDist(e.touches);
      pinchStartScaleRef.current = scale;
    }
  }, [scale]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      e.preventDefault();
      const newDist = getPinchDist(e.touches);
      const ratio = newDist / pinchStartDistRef.current;
      const newScale = Math.min(3.0, Math.max(0.6, pinchStartScaleRef.current * ratio));
      setScale(newScale);
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
      pinchStartScaleRef.current = null;
    }
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-950 rounded-2xl border border-slate-800 text-center min-h-[300px]">
        <RefreshCw size={28} className="animate-spin text-purple-400 mb-3" />
        <p className="text-xs font-bold text-slate-300">جاري تحميل ملف التقرير...</p>
        <span className="text-[11px] text-slate-500 mt-1">برجاء الانتظار ثوانٍ معدودة</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center min-h-[300px] flex flex-col justify-center items-center">
        <AlertCircle size={28} className="text-amber-400 mb-2" />
        <p className="text-xs font-bold text-red-400 mb-3">{error}</p>
        <div className="w-full h-80 rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
          <iframe src={url} title="PDF Fallback" className="w-full h-full border-0" />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full select-none" dir="rtl">
      {/* Control Bar */}
      <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-3 shrink-0 gap-2">
        {/* Page Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 transition"
            title="الصفحة التالية"
          >
            <ChevronRight size={18} />
          </button>

          <span className="text-xs font-black text-purple-300 bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/20 font-mono">
            صفحة {currentPage} من {numPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 transition"
            title="الصفحة السابقة"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.min(2.5, s + 0.25))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            title="تكبير"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => setScale((s) => Math.max(0.6, s - 0.25))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            title="تصغير"
          >
            <ZoomOut size={16} />
          </button>
        </div>
      </div>

      {/* Canvas Container — pinch-to-zoom re-renders at new scale for crisp output */}
      <div
        className="flex-1 overflow-auto bg-slate-950 p-2 rounded-2xl border border-slate-800 text-center min-h-[350px] flex items-start justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-x pan-y' }}
      >
        <div className="relative inline-block">
          {rendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 rounded-xl z-10">
              <RefreshCw size={20} className="animate-spin text-purple-400" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="mx-auto rounded-xl shadow-2xl border border-slate-700 bg-white block"
            style={{ maxWidth: '100%', touchAction: 'none' }}
          />
        </div>
      </div>
    </div>
  );
}
