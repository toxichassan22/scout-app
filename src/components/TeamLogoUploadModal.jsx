import React, { useState } from 'react';
import { Camera, Upload, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { apiFetch } from '../services/api';

export default function TeamLogoUploadModal({ isOpen, onClose, onSuccess, required = false }) {
  const [logoBase64, setLogoBase64] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار صورة صالحة (PNG, JPG, WEBP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('حجم الصورة كبير جداً؛ الحد الأقصى 10 ميجابايت');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target.result;
      setLogoBase64(result);
      setPreviewUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!logoBase64) {
      setError('يرجى رفع أو اختيار صورة لوجو الفريق أولاً');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await apiFetch('/auth/team/logo', {
        method: 'PATCH',
        body: JSON.stringify({ logoUrl: logoBase64 }),
      });
      if (res.success || res.logoUrl) {
        if (onSuccess) onSuccess(res.logoUrl || logoBase64);
        if (onClose) onClose();
      } else {
        throw new Error(res.error || 'فشل في حفظ اللوجو');
      }
    } catch (err) {
      setError(err.message || 'تعذر حفظ صورة لوجو الفريق');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 dir-rtl animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-amber-500/40 bg-slate-950 p-6 shadow-[0_0_60px_rgba(245,158,11,0.25)] text-right">
        {onClose && !required && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 left-5 rounded-full p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="إغلاق"
          >
            ✕
          </button>
        )}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10 text-amber-300">
          <Camera size={28} />
        </div>

        <h2 className="text-xl font-black text-white text-center mb-2">شعار ولوجو الفريق 🛡️</h2>
        <p className="text-xs leading-6 text-slate-300 text-center mb-6">
          {required
            ? 'لازم ترفع لوجو الفريق عشان تكمل التسجيل وتفتح الدخول لباقي الأعضاء.'
            : 'يمكنك رفع أو تحديث صورة الشعار/اللوجو الخاص بفريقك ليظهر في لوحة الشرف وملفاتكم الكشفية.'}
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-300 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/60 p-6 transition hover:border-amber-400/50">
            {previewUrl ? (
              <img src={previewUrl} alt="لوجو الفريق" className="h-28 w-28 rounded-2xl object-cover border-2 border-amber-400/50 shadow-xl mb-3" />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 mb-3">
                <ImageIcon size={36} className="mb-2 text-slate-500" />
                <span className="text-xs font-bold text-slate-300">اختر صورة لوجو الفريق من جهازك</span>
              </div>
            )}

            <label className="btn-ghost cursor-pointer text-xs font-black px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl">
              <Upload size={14} className="inline ml-1" />
              {previewUrl ? 'تغيير الصورة' : 'اختر صورة من جهازك'}
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving || !logoBase64}
            className="w-full btn-primary py-3.5 text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            {saving ? 'جاري حفظ اللوجو...' : 'حفظ اعتماد اللوجو واكمال التسجيل'}
          </button>
        </form>
      </div>
    </div>
  );
}
