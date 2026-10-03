import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Printer, 
  Trash2, 
  AlertTriangle, 
  Sparkles, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  ShieldCheck,
  Save,
  FolderDown
} from 'lucide-react';
import { Report, LOCATION_OPTIONS, SITUATION_CATEGORIES, CARE_LEVEL_OPTIONS, FACILITY_BRANCH_OPTIONS } from '../../types/report';

interface ReportDetailModalProps {
  report: Report | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Report) => Promise<boolean>;
  onDelete: (id: string) => void;
  onOpenPrint: (report: Report) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onOpenPrint,
}) => {
  const [formData, setFormData] = useState<Report | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (report) {
      setFormData({ ...report });
    }
  }, [report]);

  if (!isOpen || !formData) return null;

  const handleFieldChange = (field: keyof Report, value: any) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setIsSaving(true);
    const success = await onSave({
      ...formData,
      updatedAt: new Date().toISOString(),
    });
    setIsSaving(false);
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const isHiyari = formData.type === 'hiyari';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-black ${
                isHiyari ? 'bg-amber-400 text-slate-950' : 'bg-rose-500 text-white'
              }`}
            >
              {isHiyari ? 'ヒヤリハット報告' : '事故報告書'}
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              {formData.residentName?.replace(/[\s　]*様[\s　]*$/, '')} 様の事案詳細・管理者精査
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenPrint(formData)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer"
              title="公式書式で保存（保存先指定）・印刷"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>保存・印刷</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-5">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>更新内容を保存しました（クラウド・端末間同期済）</span>
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              基本情報
            </h3>
            {/* 対象事業所 */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                対象・発生事業所
              </label>
              <select
                value={formData.facilityBranch || FACILITY_BRANCH_OPTIONS[0]}
                onChange={(e) => handleFieldChange('facilityBranch', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 text-xs font-bold text-slate-900 focus:bg-white"
              >
                {FACILITY_BRANCH_OPTIONS.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  利用者氏名
                </label>
                <input
                  type="text"
                  value={formData.residentName}
                  onChange={(e) => handleFieldChange('residentName', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  年齢
                </label>
                <input
                  type="number"
                  value={formData.age !== null && formData.age !== undefined ? formData.age : ''}
                  onChange={(e) =>
                    handleFieldChange('age', e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="未入力可"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-bold font-meiryo-num"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  要介護度
                </label>
                <select
                  value={formData.careLevel || '未設定'}
                  onChange={(e) => handleFieldChange('careLevel', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  {CARE_LEVEL_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  発生日
                </label>
                <input
                  type="date"
                  value={formData.occurrenceDate}
                  onChange={(e) => handleFieldChange('occurrenceDate', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-bold font-meiryo-num"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  発生場所
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  {LOCATION_OPTIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  場所詳細
                </label>
                <input
                  type="text"
                  value={formData.locationDetail || ''}
                  onChange={(e) => handleFieldChange('locationDetail', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Situation Detail */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              発生状況の詳細
            </label>
            <textarea
              rows={3}
              value={formData.situationDescription}
              onChange={(e) => handleFieldChange('situationDescription', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm leading-relaxed"
            />
          </div>

          {/* Section 3: Factors 3-category Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800">
              要因の3分類（人・もの・環境）の分析内容
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 1. Personal */}
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 space-y-1.5">
                <span className="text-xs font-bold text-blue-900 block">
                  1. 本人・職員要因
                </span>
                <div className="flex flex-wrap gap-1 mb-1">
                  {formData.factorsPersonalTags?.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-blue-200/70 text-blue-900 text-[10px] font-semibold">
                      {t}
                    </span>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={formData.factorsPersonal || ''}
                  onChange={(e) => handleFieldChange('factorsPersonal', e.target.value)}
                  placeholder="本人の様子・職員要因の記述"
                  className="w-full p-2 bg-white rounded-lg border border-blue-200 text-xs"
                />
              </div>

              {/* 2. Material */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-1.5">
                <span className="text-xs font-bold text-emerald-900 block">
                  2. 物的・設備要因
                </span>
                <div className="flex flex-wrap gap-1 mb-1">
                  {formData.factorsMaterialTags?.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-emerald-200/70 text-emerald-900 text-[10px] font-semibold">
                      {t}
                    </span>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={formData.factorsMaterial || ''}
                  onChange={(e) => handleFieldChange('factorsMaterial', e.target.value)}
                  placeholder="物的・設備（車椅子や靴等）の記述"
                  className="w-full p-2 bg-white rounded-lg border border-emerald-200 text-xs"
                />
              </div>

              {/* 3. Environmental */}
              <div className="p-3 bg-violet-50/50 rounded-xl border border-violet-200 space-y-1.5">
                <span className="text-xs font-bold text-violet-900 block">
                  3. 環境・運用要因
                </span>
                <div className="flex flex-wrap gap-1 mb-1">
                  {formData.factorsEnvironmentalTags?.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-violet-200/70 text-violet-900 text-[10px] font-semibold">
                      {t}
                    </span>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={formData.factorsEnvironmental || ''}
                  onChange={(e) => handleFieldChange('factorsEnvironmental', e.target.value)}
                  placeholder="環境（床・動線・ルール等）の記述"
                  className="w-full p-2 bg-white rounded-lg border border-violet-200 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Emergency Response and Preventive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                応急処置・直後の対応
              </label>
              <textarea
                rows={2}
                value={formData.emergencyResponse || ''}
                onChange={(e) => handleFieldChange('emergencyResponse', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                現場の再発防止策・改善提案
              </label>
              <textarea
                rows={2}
                value={formData.preventiveMeasures || ''}
                onChange={(e) => handleFieldChange('preventiveMeasures', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          {/* Section 5: Supervisor Evaluation & Sign-off */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                管理者・事故防止委員会 コメント＆確認
              </span>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.supervisorConfirmed || false}
                  onChange={(e) => handleFieldChange('supervisorConfirmed', e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded-md border-amber-300 focus:ring-amber-500"
                />
                <span className="text-xs font-bold text-slate-800">管理者確認済み</span>
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                管理者の所見・指示事項・検討された恒久対策
              </label>
              <textarea
                rows={3}
                value={formData.supervisorComment || ''}
                onChange={(e) => handleFieldChange('supervisorComment', e.target.value)}
                placeholder="管理者の視点から、設備改善の指示や委員会での検討事項、職員への指導内容を記入"
                className="w-full p-2.5 rounded-xl border border-amber-200 bg-white text-xs leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  進捗ステータス
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  className="w-full p-2 rounded-lg border border-amber-200 bg-white text-xs font-bold"
                >
                  <option value="submitted">提出済（要確認）</option>
                  <option value="reviewing">確認中（検討・処置中）</option>
                  <option value="resolved">対策完了（クローズ）</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  報告者
                </label>
                <input
                  type="text"
                  value={formData.reporterName || ''}
                  onChange={(e) => handleFieldChange('reporterName', e.target.value)}
                  className="w-full p-2 rounded-lg border border-amber-200 bg-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('この報告書を完全に削除しますか？')) {
                  onDelete(formData.id);
                  onClose();
                }
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>削除</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                閉じる
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-amber-200"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? '保存中...' : '変更を保存'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
