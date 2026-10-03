import React, { useRef, useState } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  Database, 
  RefreshCw, 
  FileSpreadsheet, 
  AlertCircle, 
  Check, 
  KeyRound, 
  Users 
} from 'lucide-react';
import { Report, Resident } from '../../types/report';
import { 
  exportReportsAsJSON, 
  exportReportsAsCSV, 
  importReportsFromJSON, 
  cleanUpAllLegacyDummyData,
  clearAllReports,
  clearAllResidents,
  setAdminPassword,
  verifyAdminPassword,
  getLocalResidents
} from '../../lib/storage';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: Report[];
  residents?: Resident[];
  onDataChanged: () => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  reports,
  residents,
  onDataChanged,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Password change state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentResidents = residents || getLocalResidents();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportStatus('データを読み込み・復元中...');

    const res = await importReportsFromJSON(file);
    if (res.success) {
      setImportStatus(`${res.count}件のデータ（報告書・利用者マスター）を正常に復元しました！`);
      onDataChanged();
      setTimeout(() => setImportStatus(null), 3500);
    } else {
      setImportStatus(null);
      setImportError(res.error || '復元に失敗しました');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearDummyData = async () => {
    if (window.confirm('過去のダミー登録事項（ダミー報告書・ダミー利用者）をクラウドおよび端末から全て消去しますか？\n※ご自身で入力された実際の報告データは残ります。')) {
      setImportStatus('ダミーデータを消去中...');
      const res = await cleanUpAllLegacyDummyData();
      onDataChanged();
      setImportStatus(`ダミー情報を全消去しました（報告書: ${res.reportsRemoved}件、利用者: ${res.residentsRemoved}件を削除）`);
      setTimeout(() => setImportStatus(null), 3500);
    }
  };

  const handleClearAllReports = async () => {
    if (window.confirm('【確認】すべての報告書（テスト・ダミー含む全データ）を削除しますか？\n※本番運用の初期化として一度すべてクリアにしたい場合のみ実行してください。')) {
      await clearAllReports();
      onDataChanged();
      setImportStatus('すべての報告書データをクリアしました。');
      setTimeout(() => setImportStatus(null), 3500);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyAdminPassword(currentPass)) {
      setPassError('現在のパスワードが正しくありません');
      return;
    }
    if (newPass.length < 4) {
      setPassError('新しいパスワードは4文字以上で設定してください');
      return;
    }
    setAdminPassword(newPass);
    setPassSuccess(true);
    setPassError(null);
    setCurrentPass('');
    setNewPass('');
    setTimeout(() => setPassSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              データ保存・復元・管理設定
            </h3>
            <p className="text-xs text-slate-500">
              報告書および利用者マスターのバックアップ・復元
            </p>
          </div>
        </div>

        {/* Notifications */}
        {importStatus && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        {importError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Section 1: Backup & Export */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-indigo-600" />
                データ保存（バックアップ）
              </span>
              <span className="text-xs font-bold text-slate-500">
                報告: {reports.length}件 / 利用者: {currentResidents.length}名
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              報告書データおよび登録された利用者マスターを安全にファイルとして保存します。
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => exportReportsAsJSON(reports, currentResidents)}
                className="py-2.5 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>JSON一括バックアップ</span>
              </button>
              <button
                type="button"
                onClick={() => exportReportsAsCSV(reports)}
                className="py-2.5 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>報告一覧をCSV出力</span>
              </button>
            </div>
          </div>

          {/* Section 2: Restore from Backup */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-emerald-600" />
              データ復元（バックアップファイルの取込）
            </span>
            <p className="text-xs text-slate-500 leading-relaxed">
              保存したJSONバックアップファイルを読み込み、報告書と利用者マスターを復元します。
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>バックアップファイルを選択して復元</span>
            </button>
          </div>

          {/* Section 3: Password Settings */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-amber-600" />
              管理者パスワードの変更
            </span>
            <form onSubmit={handlePasswordSubmit} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="現在のパスワード"
                  className="px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs"
                />
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="新しいパスワード (4文字以上)"
                  className="px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs"
                />
              </div>

              {passError && (
                <p className="text-xs text-red-600 font-semibold">{passError}</p>
              )}
              {passSuccess && (
                <p className="text-xs text-emerald-600 font-semibold">
                  パスワードを更新しました
                </p>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg"
              >
                パスワードを変更
              </button>
            </form>
          </div>

          {/* Section 4: Data Cleanup (本番公開用データクリア) */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearDummyData}
                className="text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold transition-colors cursor-pointer"
                title="初期作成時のダミー報告書とダミー利用者を消去"
              >
                <RefreshCw className="w-3 h-3" />
                <span>ダミー登録事項を全消去</span>
              </button>
              <button
                type="button"
                onClick={handleClearAllReports}
                className="text-xs text-slate-500 hover:text-red-600 px-2 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
                title="報告書を全件クリア"
              >
                <span>全報告クリア</span>
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-bold text-slate-700"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
