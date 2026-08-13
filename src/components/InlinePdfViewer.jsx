import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronRight, ChevronLeft, ZoomIn, ZoomOut, RefreshCw, AlertCircle } from 'lucide-react';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export default function InlinePdfViewer({ url, fileName }) {
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renderedPages, setRenderedPages] = useState({});

  useEffect(() => {
    if (!url) return;
    let isCancelled = false;
    setLoading(true);
    setError('');
    setPdfDoc(null);
    setRenderedPages({});
    setCurrentPage(1);

    const loadPdf = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('تعذر تحميل ملف PDF');
        const arrayBuffer = await response.arrayBuffer();
        if (isCancelled) return;

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        if (isCancelled) return;
        console.error('PDF.js loading failed:', err);
        setError(err.message || 'فشل في قراءة ملف الـ PDF');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [url]);

  // Render current page when pdfDoc, currentPage, or scale changes
  useEffect(() => {
    if (!pdfDoc || !currentPage) return;
    let isCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const containerWidth = containerRef.current?.clientWidth || 360;
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        // Calculate responsive scale based on mobile container width
        const autoScale = Math.min(Math.max((containerWidth - 24) / unscaledViewport.width, 0.8), 2.5);
        const effectiveScale = scale ? autoScale * (scale / 1.2) : autoScale;
        const viewport = page.getViewport({ scale: effectiveScale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.className = 'mx-auto rounded-xl shadow-lg border border-slate-800 my-2 max-w-full block bg-white';

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        if (isCancelled) return;

        const imgDataUrl = canvas.toDataURL('image/png');
        setRenderedPages((prev) => ({
          ...prev,
          [currentPage]: imgDataUrl,
        }));
      } catch (err) {
        console.error(`Page ${currentPage} render failed:`, err);
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, scale]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-950 rounded-2xl border border-slate-800 text-center min-h-[300px]">
        <RefreshCw size={28} className="animate-spin text-purple-400 mb-3" />
        <p className="text-xs font-bold text-slate-300">جاري عرض صفحات الـ PDF مباشرة على الشاشة...</p>
        <span className="text-[11px] text-slate-500 mt-1">برجاء الانتظار ثوانٍ معدودة</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center min-h-[300px] flex flex-col justify-center items-center">
        <AlertCircle size={28} className="text-amber-400 mb-2" />
        <p className="text-xs font-bold text-red-400 mb-3">{error}</p>
        {/* Native Fallback embed */}
        <div className="w-full h-80 rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
          <iframe src={url} title="PDF Fallback" className="w-full h-full border-0" />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full dir-rtl select-none">
      {/* Top Mobile Control Bar */}
      <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-3 shrink-0 gap-2">
        {/* Page Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 disabled:hover:bg-slate-800 transition"
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
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 disabled:hover:bg-slate-800 transition"
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
            title="تكبير الصفحة"
          >
            <ZoomIn size={16} />
          </button>

          <button
            onClick={() => setScale((s) => Math.max(0.6, s - 0.25))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            title="تصغير الصفحة"
          >
            <ZoomOut size={16} />
          </button>
        </div>
      </div>

      {/* Rendered PDF Page Image */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-2 sm:p-4 rounded-2xl border border-slate-800 text-center min-h-[350px] flex items-center justify-center">
        {renderedPages[currentPage] ? (
          <img
            src={renderedPages[currentPage]}
            alt={`صفحة التقرير ${currentPage}`}
            className="mx-auto rounded-xl shadow-2xl border border-slate-800 max-w-full block bg-white transition-all duration-200"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-slate-400">
            <RefreshCw size={22} className="animate-spin text-purple-400 mb-2" />
            <span className="text-xs font-bold text-slate-300">جاري تجهيز وعرض صفحة التقرير {currentPage}...</span>
          </div>
        )}
      </div>
    </div>
  );
}
