import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronRight, ChevronLeft, ZoomIn, ZoomOut, RefreshCw,
  AlertCircle, RotateCcw, ExternalLink, Globe, Layers
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

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
  const [viewMode, setViewMode] = useState('canvas'); // 'canvas' | 'native'

  // ── Load PDF with Arabic CMaps and Standard Fonts ─────────────────────────
  useEffect(() => {
    if (!url) return;
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

        // Pass cMapUrl and standardFontDataUrl so Arabic ligatures, bidi, and fonts render properly
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
          setViewMode('native'); // Auto-fallback to native browser PDF viewer
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  // ── Render current page ────────────────────────────────────────────────────
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

      const containerW = containerRef.current?.clientWidth || 340;
      const unscaled = page.getViewport({ scale: 1 });
      const fitScale = Math.max(0.4, (containerW - 32) / unscaled.width);
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
    if (viewMode === 'canvas') {
      renderPage();
    }
  }, [renderPage, viewMode]);

  // ── Zoom helpers ───────────────────────────────────────────────────────────
  const changeZoom = (delta) => setZoomFactor(z => Math.min(3.5, Math.max(0.5, Number((z + delta).toFixed(2)))));
  const resetZoom = () => setZoomFactor(1.0);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading && viewMode === 'canvas') {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-950 rounded-2xl border border-slate-800 text-center min-h-[350px]">
        <RefreshCw size={32} className="animate-spin text-purple-400 mb-3" />
        <p className="text-sm font-black text-slate-200">جاري تحميل وتجهيز خطوط التقرير...</p>
        <span className="text-xs text-slate-400 mt-1">يتم الآن ضبط الحروف والخطوط العربية</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full select-none" dir="rtl">

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-3 shrink-0 gap-2">

        {/* View Mode Toggle & Page nav */}
        <div className="flex items-center gap-2 flex-wrap">
          {viewMode === 'canvas' && numPages > 0 && (
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
              onClick={() => setViewMode(m => m === 'canvas' ? 'native' : 'canvas')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
                viewMode === 'native'
                  ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="التبديل بين عارض الصفحات ومستعرض المتصفح المباشر"
            >
              {viewMode === 'native' ? <Layers size={14} /> : <Globe size={14} />}
              <span>{viewMode === 'native' ? 'العارض المخصص' : 'عارض المتصفح المباشر'}</span>
            </button>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white transition text-xs font-bold flex items-center gap-1 border border-slate-700"
              title="فتح الملف في نافذة جديدة"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">فتح في نافذة جديدة</span>
            </a>
          </div>
        </div>

        {/* Zoom controls in canvas mode */}
        {viewMode === 'canvas' && (
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
        )}
      </div>

      {/* Main Viewport */}
      <div className="flex-1 overflow-auto bg-slate-950 p-2 rounded-2xl border border-slate-800 min-h-[380px] flex flex-col">
        {viewMode === 'native' || error ? (
          <div className="w-full flex-1 min-h-[400px] h-full rounded-xl overflow-hidden bg-white">
            <iframe
              src={url}
              title={fileName || 'معاينة ملف التقرير'}
              className="w-full h-full min-h-[450px] border-0"
            />
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
