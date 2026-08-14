import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronRight, ChevronLeft, ZoomIn, ZoomOut, RefreshCw,
  RotateCcw, ExternalLink, Globe, Layers, Smartphone
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// Detect mobile / tablet
const IS_MOBILE = typeof window !== 'undefined' &&
  (window.innerWidth < 768 || /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

export default function InlinePdfViewer({ url, fileName }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomFactor, setZoomFactor] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  // Mobile defaults to 'native' to avoid broken Arabic glyphs
  const [viewMode, setViewMode] = useState(IS_MOBILE ? 'native' : 'canvas');

  // ── Load PDF (only needed for canvas mode) ────────────────────────────────
  useEffect(() => {
    if (!url || viewMode !== 'canvas') {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    setPdfDoc(null);
    setCurrentPage(1);
    setZoomFactor(1.0);

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('تعذر تحميل ملف PDF');
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        const doc = await pdfjsLib.getDocument({
          data: new Uint8Array(buf),
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
          enableXfa: true,
          verbosity: 0,
        }).promise;

        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.warn('PDF.js error, falling back to native viewer:', err);
          setError(err.message || 'فشل في فتح الـ PDF');
          setViewMode('native');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [url, viewMode]);

  // ── Render current page to canvas ─────────────────────────────────────────
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || viewMode !== 'canvas') return;
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch (_) {}
      renderTaskRef.current = null;
    }
    setRendering(true);
    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const containerW = containerRef.current?.clientWidth || 500;
      const unscaled = page.getViewport({ scale: 1 });
      const fitScale = Math.max(0.4, (containerW - 24) / unscaled.width);
      const viewport = page.getViewport({ scale: fitScale * zoomFactor });

      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext('2d', { alpha: false });
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const task = page.render({
        canvasContext: ctx,
        viewport,
        intent: 'display',
      });
      renderTaskRef.current = task;
      await task.promise;
      renderTaskRef.current = null;
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Render error:', err);
      }
    } finally {
      setRendering(false);
    }
  }, [pdfDoc, currentPage, zoomFactor, viewMode]);

  useEffect(() => {
    if (viewMode === 'canvas') renderPage();
  }, [renderPage, viewMode]);

  // ── Zoom helpers ──────────────────────────────────────────────────────────
  const changeZoom = (delta) => setZoomFactor(z => Math.min(3.5, Math.max(0.5, Number((z + delta).toFixed(2)))));
  const resetZoom = () => setZoomFactor(1.0);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading && viewMode === 'canvas') {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-950 rounded-2xl border border-slate-800 text-center min-h-[350px]">
        <RefreshCw size={32} className="animate-spin text-purple-400 mb-3" />
        <p className="text-sm font-black text-slate-200">جاري تحميل التقرير...</p>
        <span className="text-xs text-slate-400 mt-1">يتم تجهيز الملف للعرض</span>
      </div>
    );
  }

  // ── NATIVE VIEW: embed + direct open button (mobile-first) ────────────────
  if (viewMode === 'native' || error) {
    return (
      <div className="flex flex-col h-full select-none" dir="rtl">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-2 shrink-0 gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Switch to canvas (desktop) */}
            {!IS_MOBILE && (
              <button
                type="button"
                onClick={() => setViewMode('canvas')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
              >
                <Layers size={14} />
                <span>العارض المخصص (صفحة بصفحة)</span>
              </button>
            )}

            {IS_MOBILE && (
              <span className="text-xs text-emerald-300 font-bold flex items-center gap-1">
                <Smartphone size={14} />
                عارض الجوال الأصلي — الحروف العربية واضحة
              </span>
            )}
          </div>

          {/* Open externally */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition text-xs font-bold flex items-center gap-1.5 shadow-lg"
          >
            <ExternalLink size={14} />
            فتح التقرير بملء الشاشة ↗
          </a>
        </div>

        {/* Embedded viewer */}
        <div className="flex-1 rounded-2xl overflow-hidden bg-white border border-slate-700 min-h-[400px]">
          <object
            data={url}
            type="application/pdf"
            className="w-full h-full min-h-[500px]"
            style={{ minHeight: '60vh' }}
          >
            {/* Fallback for browsers that don't support <object> for PDF */}
            <iframe
              src={url}
              title={fileName || 'معاينة التقرير'}
              className="w-full h-full min-h-[500px] border-0"
              style={{ minHeight: '60vh' }}
            />
          </object>
        </div>

        {/* Prominent mobile action: Open in external app */}
        {IS_MOBILE && (
          <div className="mt-2 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm transition shadow-lg"
            >
              <ExternalLink size={18} />
              📱 افتح التقرير في قارئ PDF الخاص بجهازك
            </a>
          </div>
        )}
      </div>
    );
  }

  // ── CANVAS VIEW: PDF.js page-by-page (desktop) ────────────────────────────
  return (
    <div ref={containerRef} className="flex flex-col h-full select-none" dir="rtl">

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-2 shrink-0 gap-2">

        {/* Page nav & mode toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {numPages > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
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
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 transition"
                title="الصفحة السابقة"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('native')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
              title="التبديل للعارض الأصلي"
            >
              <Globe size={14} />
              <span>العارض الأصلي (لو الحروف مكسرة)</span>
            </button>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white transition text-xs font-bold flex items-center gap-1 border border-slate-700"
              title="فتح في نافذة جديدة"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">نافذة جديدة</span>
            </a>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => changeZoom(+0.25)}
            className="p-1.5 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition font-bold text-xs flex items-center gap-1"
            title="تكبير"
          >
            <ZoomIn size={16} />
            <span className="font-mono text-[11px]">{Math.round(zoomFactor * 100)}%</span>
          </button>
          <button
            type="button"
            onClick={() => changeZoom(-0.25)}
            className="p-1.5 px-2 rounded-lg bg-orange-700 hover:bg-orange-600 text-white transition font-bold text-xs"
            title="تصغير"
          >
            <ZoomOut size={16} />
          </button>
          {zoomFactor !== 1.0 && (
            <button
              type="button"
              onClick={resetZoom}
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition font-bold text-xs"
              title="إعادة ضبط الحجم"
            >
              <RotateCcw size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Canvas viewport */}
      <div className="flex-1 overflow-auto bg-slate-950 p-2 rounded-2xl border border-slate-800 min-h-[380px]">
        <div className="relative inline-block min-w-full text-center m-auto">
          {rendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 rounded-xl z-10">
              <RefreshCw size={24} className="animate-spin text-purple-400" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="mx-auto rounded-xl shadow-2xl border border-slate-700 bg-white block max-w-full"
          />
        </div>
      </div>
    </div>
  );
}
