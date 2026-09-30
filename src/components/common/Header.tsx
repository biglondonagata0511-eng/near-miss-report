import React from 'react';
import { Smartphone, Monitor, ShieldCheck, ShieldAlert, Wifi, Sparkles } from 'lucide-react';

interface HeaderProps {
  viewMode: 'mobile' | 'admin';
  setViewMode: (mode: 'mobile' | 'admin') => void;
  isAdminAuthenticated: boolean;
  onRequestAdminLogin: () => void;
  onAdminLogout: () => void;
  reportsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  isAdminAuthenticated,
  onRequestAdminLogin,
  onAdminLogout,
  reportsCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs print:hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        {/* Logo and title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-md shadow-orange-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight leading-tight">
                スマホで簡単ヒヤリ報告
              </h1>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 gap-1">
                <Wifi className="w-3 h-3 animate-pulse text-emerald-600" />
                クラウド同期中
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              介護現場向け ヒヤリハット・事故報告＆要因（人・物・環境）分析
            </p>
          </div>
        </div>

        {/* View Switcher and Admin Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode Switch Buttons */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 ${
                viewMode === 'mobile'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>現場スマホ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isAdminAuthenticated) {
                  onRequestAdminLogin();
                } else {
                  setViewMode('admin');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 ${
                viewMode === 'admin'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>管理者PC</span>
              {reportsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-slate-200 text-slate-700">
                  {reportsCount}
                </span>
              )}
            </button>
          </div>

          {/* Admin auth indicator if logged in */}
          {isAdminAuthenticated ? (
            <button
              type="button"
              onClick={onAdminLogout}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
              title="管理者認証解除（クリックでログアウト）"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>管理者認証済</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onRequestAdminLogin}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors"
              title="管理者パスワードを入力して認証"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>管理者ログイン</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
