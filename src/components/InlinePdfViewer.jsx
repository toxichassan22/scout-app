import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronRight, ChevronLeft, ZoomIn, ZoomOut, RefreshCw,
  RotateCcw, ExternalLink, Globe, Layers, Eye
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export default function InlinePdfViewer({ url, fileName }) {
  const canvasRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('canvas'); // 'canvas' | 'native'

  // Detect mobile
  const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

  // ── Load PDF with Arabic CMaps and Standard Fonts ─────────────────────────
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setPdfDoc(null);
    setCurrentPage(1);
    setZoomPercent(100);

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
          console.warn('PDF.js parse error, defaulting to native viewer:', err);
          setError(err.message || 'فشل في فتح الـ PDF');
          setViewMode('native');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  // ── Render page to Canvas ──────────────────────────────────────────────────
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

      // Render at sharp 2.0x base scale for crispness
      const baseViewport = page.getViewport({ scale: 2.0 });
      const ctx = canvas.getContext('2d', { alpha: false });

      canvas.width = baseViewport.width;
      canvas.height = baseViewport.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const task = page.render({
        canvasContext: ctx,
        viewport: baseViewport,
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
  }, [pdfDoc, currentPage, viewMode]);

  useEffect(() => {
    if (viewMode === 'canvas') {
      renderPage();
    }
  }, [renderPage, viewMode]);

  // ── Zoom controls ──────────────────────────────────────────────────────────
  const zoomIn = () => setZoomPercent(z => Math.min(300, z + 25));
  const zoomOut = () => setZoomPercent(z => Math.max(50, z - 25));
  const resetZoom = () => setZoomPercent(100);

  // ── Loading indicator ──────────────────────────────────────────────────────
  if (loading && viewMode === 'canvas') {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-950 rounded-2xl border border-slate-800 text-center min-h-[350px]">
        <RefreshCw size={32} className="animate-spin text-purple-400 mb-3" />
        <p className="text-sm font-black text-slate-200">جاري تحميل وتجهيز خطوط التقرير...</p>
        <span className="text-xs text-slate-400 mt-1">يتم ضبط الحروف والخطوط العربية بدقة</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full select-none" dir="rtl">

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800 mb-2 shrink-0 gap-2">

        {/* Page Nav & View mode toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {viewMode === 'canvas' && numPages > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 transition"
                title="الصفحة التالية"
              >
                <ChevronRight size={17} />
              </button>
              <span className="text-xs font-black text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 font-mono">
                {currentPage} / {numPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 transition"
                title="الصفحة السابقة"
              >
                <ChevronLeft size={17} />
              </button>
            </div>
          )}

          {/* View mode toggle */}
          <button
            type="button"
            onClick={() => setViewMode(m => m === 'canvas' ? 'native' : 'canvas')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
              viewMode === 'native'
                ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="التبديل بين عارض الصفحات ومستعرض المتصفح الأصلي"
          >
            {viewMode === 'native' ? <Layers size={14} /> : <Globe size={14} />}
            <span>{viewMode === 'native' ? 'العارض المخصص' : 'العارض الأصلي (توصية للجوال)'}</span>
          </button>

          {/* Direct external window */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white transition text-xs font-bold flex items-center gap-1 border border-slate-700"
            title="فتح الملف في نافذة مستقلة بملء الشاشة"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">نافذة كاملة</span>
          </a>
        </div>

        {/* Zoom Controls */}
        {viewMode === 'canvas' && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={zoomIn}
              className="p-1.5 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition font-bold text-xs flex items-center gap-1"
              title="تكبير"
            >
              <ZoomIn size={15} />
              <span className="font-mono text-[11px]">{zoomPercent}%</span>
            </button>
            <button
              type="button"
              onClick={zoomOut}
              className="p-1.5 px-2 rounded-lg bg-orange-700 hover:bg-orange-600 text-white transition font-bold text-xs"
              title="تصغير"
            >
              <ZoomOut size={15} />
            </button>
            {zoomPercent !== 100 && (
              <button
                type="button"
                onClick={resetZoom}
                className="p-1.5 px-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition font-bold text-xs"
                title="إعادة ضبط 100%"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Viewport */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto bg-slate-950 p-2 rounded-2xl border border-slate-800 min-h-[380px] flex flex-col items-center justify-start touch-pan-x touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {viewMode === 'native' || error ? (
          <div className="w-full flex-1 min-h-[420px] h-full rounded-xl overflow-hidden bg-white flex flex-col">
            <iframe
              src={url}
              title={fileName || 'معاينة ملف التقرير'}
              className="w-full flex-1 min-h-[420px] border-0"
            />
          </div>
        ) : (
          <div
            className="transition-transform duration-150 origin-top flex items-center justify-center p-2"
            style={{
              width: `${zoomPercent}%`,
              minWidth: zoomPercent > 100 ? `${zoomPercent}%` : '100%',
            }}
          >
            {rendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 rounded-xl z-10">
                <RefreshCw size={24} className="animate-spin text-purple-400" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="rounded-xl shadow-2xl border border-slate-700 bg-white block w-full max-w-full h-auto"
            />
          </div>
        )}
      </div>
    </div>
  );
}
