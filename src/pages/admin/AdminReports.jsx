import React, { useState, useEffect } from 'react';
import { FileText, Download, Sparkles } from 'lucide-react';
import { getAdminReports } from '../../services/api';

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const data = await getAdminReports();
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 text-right dir-rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            تقارير الفرق المرفوعة
            <FileText size={24} className="text-emerald-400" />
          </h1>
          <p className="text-slate-400 text-xs mt-1">استعراض وتحميل الملفات والتقارير المرفوعة من الفرق الكشفية</p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500">جاري تحميل التقارير...</div>
      ) : reports.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
          <Sparkles size={32} className="mx-auto mb-3 text-slate-600" />
          <p className="font-bold text-slate-400">لا توجد تقارير مرفوعة حتى الآن</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {reports.map((rep) => (
            <div key={rep.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <a
                href={rep.fileUrl}
                download={rep.fileName}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Download size={14} />
                تنزيل الملف
              </a>

              <div>
                <p className="text-sm font-bold text-white">{rep.fileName}</p>
                <p className="text-xs text-emerald-400 font-bold mt-0.5">{rep.team?.label || 'فريق'}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">
                  {new Date(rep.uploadedAt).toLocaleString('ar-EG')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReports;
