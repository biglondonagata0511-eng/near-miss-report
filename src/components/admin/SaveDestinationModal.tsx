import React, { useState, useEffect } from 'react';
import { 
  X, 
  FolderDown, 
  FileText, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  HardDrive, 
  FileCode, 
  FileSpreadsheet, 
  Info,
  ShieldCheck,
  Download,
  Loader2
} from 'lucide-react';
import { Report } from '../../types/report';
import { 
  generatePdfBlobFromElement, 
  generateStandaloneHtml, 
  saveWithLocationPicker 
} from '../../lib/pdfExport';

interface SaveDestinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report?: Report | null;
  reportsList?: Report[] | null;
  elementToCapture?: HTMLElement | null;
  titleLabel?: string;
  onPrint?: () => void;
}

export const SaveDestinationModal: React.FC<SaveDestinationModalProps> = ({
  isOpen,
  onClose,
  report,
  reportsList,
  elementToCapture,
  titleLabel = 'ヒヤリハット報告書',
  onPrint,
}) => {
  const isListMode = !!reportsList && !report;

  // Format selection: 'pdf' | 'html' | 'json'
  const [format, setFormat] = useState<'pdf' | 'html' | 'json'>('pdf');

  // File name state
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    status: 'idle' | 'success' | 'canceled' | 'error';
    message: string;
    method?: 'picker' | 'download';
  }>({ status: 'idle', message: '' });

  // Generate default file name when modal opens
  useEffect(() => {
    if (!isOpen) {
      setSaveStatus({ status: 'idle', message: '' });
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (isListMode && reportsList) {
      setFileName(`【介護集計】ヒヤリ・事故報告一覧_${todayStr}`);
    } else if (report) {
      const cleanName = report.residentName?.replace(/[\s　]*様[\s　]*$/, '') || '利用者';
      const kind = report.type === 'accident' ? '事故報告書' : 'ヒヤリ報告書';
      const occDate = report.occurrenceDate || todayStr;
      setFileName(`【${kind}】${occDate}_${cleanName}様_公式保管`);
    } else {
      setFileName(`【ヒヤリ報告】${todayStr}_介護記録`);
    }
  }, [isOpen, report, reportsList, isListMode]);

  if (!isOpen) return null;

  const handleExecuteSave = async () => {
    setIsProcessing(true);
    setSaveStatus({ status: 'idle', message: '' });

    try {
      let blob: Blob;

      if (format === 'pdf') {
        if (!elementToCapture) {
          throw new Error('保存対象の文書レイアウトが見つかりませんでした。');
        }
        blob = await generatePdfBlobFromElement(elementToCapture, {
          title: fileName,
        });
      } else if (format === 'html') {
        const innerHtml = elementToCapture?.innerHTML || '<div>報告書データ</div>';
        blob = generateStandaloneHtml(fileName, innerHtml);
      } else {
        // json
        const dataToSave = report || reportsList || {};
        blob = new Blob([JSON.stringify(dataToSave, null, 2)], {
          type: 'application/json;charset=utf-8',
        });
      }

      // Open save location picker
      const result = await saveWithLocationPicker(blob, fileName, format);

      if (result.canceled) {
        setSaveStatus({
          status: 'canceled',
          message: '保存がキャンセルされました。保存先フォルダを選び直して再度お試しください。',
        });
      } else if (result.success) {
        const methodText =
          result.method === 'picker'
            ? '指定されたフォルダー・場所に正常に保存されました。'
            : 'ブラウザのダウンロード・保存先に正常に出力されました。';
        setSaveStatus({
          status: 'success',
          message: `保存が完了しました！ ${methodText}`,
          method: result.method,
        });
      } else {
        setSaveStatus({
          status: 'error',
          message: `保存時にエラーが発生しました: ${result.error || '不明なエラー'}`,
        });
      }
    } catch (err: any) {
      console.error('Save error:', err);
      setSaveStatus({
        status: 'error',
        message: `保存処理に失敗しました: ${err?.message || 'エラーが発生しました'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FolderDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                報告書の保存先を指定して保管
              </h3>
              <p className="text-[11px] text-blue-200">
                事故報告・ヒヤリハット記録の確実な保存・ファイル出力
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          {/* Target Document Info Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
            <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shrink-0">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-slate-800 text-xs truncate">
                  {isListMode
                    ? 'ヒヤリハット・事故一覧集計表'
                    : `${report?.residentName?.replace(/[\s　]*様[\s　]*$/, '')} 様の${
                        report?.type === 'accident' ? '事故報告書' : 'ヒヤリハット報告書'
                      }`}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800">
                  {isListMode ? `全 ${reportsList?.length || 0} 件` : '公式公文書様式'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>介護記録・施設運営基準による保管対象書類（2年〜5年間保存）</span>
              </div>
            </div>
          </div>

          {/* File Name Configuration */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              保存ファイル名（保存先で識別しやすい名称）
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="ファイル名を入力..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-mono font-bold text-slate-600 text-xs">
                .{format}
              </span>
            </div>
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
              保存形式（ファイル形式）の選択
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  format === 'pdf'
                    ? 'bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-black text-xs flex items-center gap-1 text-rose-600 mb-0.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF形式 (*.pdf)</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  【推奨】A4公文書印刷そのままの高画質レイアウト
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormat('html')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  format === 'html'
                    ? 'bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-black text-xs flex items-center gap-1 text-blue-600 mb-0.5">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>電子公文書 (*.html)</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  オフラインPCでもブラウザで開けて印刷も可能な単体原本
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  format === 'json'
                    ? 'bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-black text-xs flex items-center gap-1 text-emerald-600 mb-0.5">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>データ控え (*.json)</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  システム内でのバックアップ・再読み込み用の構造化データ
                </p>
              </button>
            </div>
          </div>

          {/* Save Destination Guide Box */}
          <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl text-[11px] text-blue-950 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-blue-900">
              <FolderDown className="w-4 h-4 text-blue-600" />
              <span>保存先の指定方法について</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              下の<strong>「保存先フォルダーを指定して保存」</strong>ボタンを押すと、パソコンの<strong>『名前を付けて保存（フォルダー選択画面）』</strong>が開き、施設の共有サーバーや介護記録フォルダー、デスクトップ、USBメモリなど、<strong>お好きな保管場所を自由に指定して保存</strong>できます。
            </p>
            <div className="text-[10px] text-slate-500 bg-white/70 p-2 rounded-lg border border-blue-100">
              💡 <strong>ヒント</strong>：ブラウザ設定で「各ファイルの保存先を毎回確認する」をONにすると、どのファイルでも常に保存先フォルダーを指定できます。
            </div>
          </div>

          {/* Status Feedback Banner */}
          {saveStatus.status === 'success' && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="leading-snug">
                <div>{saveStatus.message}</div>
                <div className="text-[10px] font-normal text-emerald-700 mt-0.5">
                  ※事故防止委員会・施設管理規定のフォルダへ大切に保管してください。
                </div>
              </div>
            </div>
          )}

          {saveStatus.status === 'canceled' && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-medium flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{saveStatus.message}</span>
            </div>
          )}

          {saveStatus.status === 'error' && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{saveStatus.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleExecuteSave}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ファイルを生成・保存中...</span>
                </>
              ) : (
                <>
                  <FolderDown className="w-4 h-4" />
                  <span>保存先フォルダーを指定して保存</span>
                </>
              )}
            </button>

            {onPrint && (
              <button
                type="button"
                onClick={() => {
                  onPrint();
                }}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                title="紙のプリンター印刷へ"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>印刷する</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
