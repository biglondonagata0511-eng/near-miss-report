import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, X, Check } from 'lucide-react';
import { verifyAdminPassword, setAdminPassword, getAdminPassword } from '../../lib/storage';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [currentPassForChange, setCurrentPassForChange] = useState('');
  const [newPass, setNewPass] = useState('');
  const [changeSuccess, setChangeSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(password)) {
      setError(null);
      setPassword('');
      onSuccess();
    } else {
      setError('パスワードが正しくありません。（初期設定: 1234）');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyAdminPassword(currentPassForChange)) {
      setError('現在のパスワードが一致しません');
      return;
    }
    if (!newPass.trim() || newPass.length < 4) {
      setError('新しいパスワードは4文字以上で入力してください');
      return;
    }
    setAdminPassword(newPass.trim());
    setChangeSuccess(true);
    setError(null);
    setTimeout(() => {
      setIsChangingPass(false);
      setChangeSuccess(false);
      setCurrentPassForChange('');
      setNewPass('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 mx-auto border border-amber-200">
          <Lock className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-center text-slate-800 mb-1">
          {isChangingPass ? '管理者パスワードの変更' : '管理者認証'}
        </h3>
        <p className="text-xs text-center text-slate-500 mb-5">
          {isChangingPass
            ? '安全な管理のため新しいパスワードを設定します'
            : '集計・分析、報告書の修正・削除にはパスワードが必要です'}
        </p>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {changeSuccess && (
          <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-700">
            <Check className="w-4 h-4 shrink-0" />
            <span>パスワードを変更しました</span>
          </div>
        )}

        {!isChangingPass ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                管理者パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力（初期値: 1234）"
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                ※ 現場職員の誤操作を防ぐため保護されています（初期値: 1234）
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-semibold text-white shadow-sm shadow-amber-200 transition-colors"
              >
                認証して進む
              </button>
            </div>

            <div className="text-center pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setIsChangingPass(true);
                }}
                className="text-xs text-slate-500 hover:text-amber-600 inline-flex items-center gap-1 font-medium"
              >
                <KeyRound className="w-3.5 h-3.5" />
                パスワードを変更する
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                現在のパスワード
              </label>
              <input
                type="password"
                value={currentPassForChange}
                onChange={(e) => setCurrentPassForChange(e.target.value)}
                placeholder="現在のパスワード"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                新しいパスワード（4文字以上）
              </label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="新しいパスワード"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsChangingPass(false);
                  setError(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                戻る
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-semibold text-white"
              >
                変更を保存
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
