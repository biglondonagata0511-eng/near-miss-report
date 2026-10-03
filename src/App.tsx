/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Monitor, 
  BarChart3, 
  FileText, 
  Database, 
  PlusCircle, 
  ListFilter, 
  Users,
  ShieldCheck, 
  Printer, 
  Share2, 
  Sparkles,
  Wifi
} from 'lucide-react';
import { Report, Resident } from './types/report';
import { 
  subscribeReports, 
  subscribeResidents,
  saveReport, 
  deleteReport, 
  getLocalReports,
  getLocalResidents,
  cleanUpAllLegacyDummyData
} from './lib/storage';
import { testConnection } from './lib/firebase';
import { Header } from './components/common/Header';
import { MobileReportForm } from './components/mobile/MobileReportForm';
import { MobileReportList } from './components/mobile/MobileReportList';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ReportTable } from './components/admin/ReportTable';
import { ReportDetailModal } from './components/admin/ReportDetailModal';
import { PrintPreviewModal } from './components/admin/PrintPreviewModal';
import { DataManagementModal } from './components/admin/DataManagementModal';
import { AdminAuthModal } from './components/admin/AdminAuthModal';
import { ResidentMasterManagement } from './components/admin/ResidentMasterManagement';

export default function App() {
  // Reports state (synchronized via Firestore and localStorage)
  const [reports, setReports] = useState<Report[]>(() => getLocalReports());
  
  // Residents state (利用者マスター)
  const [residents, setResidents] = useState<Resident[]>(() => getLocalResidents());

  // View Mode: 'mobile' (現場スマホ) | 'admin' (管理者PC)
  const [viewMode, setViewMode] = useState<'mobile' | 'admin'>(() => {
    return 'mobile'; // Default to mobile for immediate intuitive test as requested by user
  });

  // Mobile Sub-tabs: 'form' | 'list'
  const [mobileTab, setMobileTab] = useState<'form' | 'list'>('form');

  // Admin Sub-tabs: 'dashboard' | 'table' | 'residents'
  const [adminTab, setAdminTab] = useState<'dashboard' | 'table' | 'residents'>('dashboard');

  // Admin authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('hiyari_admin_session') === 'true';
  });
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [pendingAdminAction, setPendingAdminAction] = useState<(() => void) | null>(null);

  // Modals
  const [selectedReportForDetail, setSelectedReportForDetail] = useState<Report | null>(null);
  const [printModalReport, setPrintModalReport] = useState<Report | null>(null);
  const [printModalList, setPrintModalList] = useState<Report[] | null>(null);
  const [printModalTitle, setPrintModalTitle] = useState<string>('');
  const [showDataModal, setShowDataModal] = useState<boolean>(false);

  // On initial mount: test connection, cleanup dummy data, and subscribe to reports & residents
  useEffect(() => {
    testConnection();
    // 過去のダミーデータをFirestoreおよびローカルからクリーンアップ
    cleanUpAllLegacyDummyData().catch(() => {});

    const unsubReports = subscribeReports((updated) => {
      setReports(updated);
    });

    const unsubResidents = subscribeResidents((updatedResidents) => {
      setResidents(updatedResidents);
    });

    return () => {
      unsubReports();
      unsubResidents();
    };
  }, []);

  // Save / Submit new report (現場スマホおよび管理者PC)
  const handleSaveReport = async (report: Report): Promise<boolean> => {
    // 1. ローカルStateを即時更新（画面遷移や一覧表示で即座に反映されることを保証）
    setReports((prev) => {
      const idx = prev.findIndex((r) => r.id === report.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = report;
        return next;
      }
      return [report, ...prev];
    });

    // 2. クラウド（Firestore）およびローカルストレージへ保存
    const res = await saveReport(report);
    return res.success;
  };

  // Delete report
  const handleDeleteReport = async (reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    await deleteReport(reportId);
  };

  // Admin auth gate
  const requireAdminAuth = (callback: () => void) => {
    if (isAdminAuthenticated) {
      callback();
    } else {
      setPendingAdminAction(() => callback);
      setShowAuthModal(true);
    }
  };

  const handleAdminAuthSuccess = () => {
    setIsAdminAuthenticated(true);
    sessionStorage.setItem('hiyari_admin_session', 'true');
    setShowAuthModal(false);
    if (pendingAdminAction) {
      pendingAdminAction();
      setPendingAdminAction(null);
    } else {
      setViewMode('admin');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('hiyari_admin_session');
    setViewMode('mobile');
  };

  // Open single report print
  const handleOpenPrintSingle = (rep: Report) => {
    setPrintModalReport(rep);
    setPrintModalList(null);
    setPrintModalTitle(`${rep.residentName}様のヒヤリハット報告書`);
  };

  // Open list print
  const handleOpenPrintList = (list: Report[], titleLabel: string) => {
    setPrintModalReport(null);
    setPrintModalList(list);
    setPrintModalTitle(titleLabel);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Global Navigation Header */}
      <Header
        viewMode={viewMode}
        setViewMode={(mode) => {
          if (mode === 'admin') {
            requireAdminAuth(() => setViewMode('admin'));
          } else {
            setViewMode('mobile');
          }
        }}
        isAdminAuthenticated={isAdminAuthenticated}
        onRequestAdminLogin={() => setShowAuthModal(true)}
        onAdminLogout={handleAdminLogout}
        reportsCount={reports.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 md:p-6">
        {viewMode === 'mobile' ? (
          /* ======================================================== */
          /* MOBILE MODE (現場スマホ簡単入力＆共有)                      */
          /* ======================================================== */
          <div className="max-w-xl mx-auto">
            {/* Mobile Tab Pill Switcher */}
            <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center mb-4 shadow-inner">
              <button
                type="button"
                onClick={() => setMobileTab('form')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
                  mobileTab === 'form'
                    ? 'bg-white text-orange-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>新規報告（ヒヤリ/事故）</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('list')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
                  mobileTab === 'list'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-4 h-4" />
                <span>共有一覧 ({reports.length})</span>
              </button>
            </div>

            {/* Tab content */}
            {mobileTab === 'form' ? (
              <MobileReportForm
                residents={residents}
                onSaveReport={handleSaveReport}
                onViewList={() => setMobileTab('list')}
              />
            ) : (
              <MobileReportList
                reports={reports}
                onSelectReport={(rep) => {
                  setSelectedReportForDetail(rep);
                }}
                onNewReport={() => setMobileTab('form')}
              />
            )}
          </div>
        ) : (
          /* ======================================================== */
          /* ADMIN PC MODE (集計・要因分析・一覧・PDF・利用者マスター・データ管理) */
          /* ======================================================== */
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Admin Header Bar with Sub-tabs and Backup button */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                    介護施設 管理者ダッシュボード
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    全職員の報告がリアルタイム同期・要因3分類（人・物・環境）分析
                  </p>
                </div>
              </div>

              {/* Sub-tabs and Data Backup button */}
              <div className="flex items-center gap-2">
                <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setAdminTab('dashboard')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      adminTab === 'dashboard'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>集計・要因分析</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminTab('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      adminTab === 'table'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>報告書一覧・検索</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminTab('residents')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      adminTab === 'residents'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>利用者マスター ({residents.length})</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDataModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-xs"
                >
                  <Database className="w-3.5 h-3.5 text-amber-400" />
                  <span>データ保存・復元</span>
                </button>
              </div>
            </div>

            {/* Admin Tab View */}
            {adminTab === 'dashboard' ? (
              <AdminDashboard
                reports={reports}
                onSelectPeriod={(start, end) => {
                  setAdminTab('table');
                }}
                onOpenPrintSummary={(filteredList, label) => {
                  handleOpenPrintList(filteredList, label);
                }}
              />
            ) : adminTab === 'table' ? (
              <ReportTable
                reports={reports}
                onSelectReport={(rep) => {
                  setSelectedReportForDetail(rep);
                }}
                onDeleteReport={(id) => {
                  requireAdminAuth(() => handleDeleteReport(id));
                }}
                onOpenPrintSingle={(rep) => {
                  handleOpenPrintSingle(rep);
                }}
                onOpenPrintList={(filteredList, label) => {
                  handleOpenPrintList(filteredList, label);
                }}
              />
            ) : (
              <ResidentMasterManagement
                residents={residents}
                onDataChanged={() => {
                  setResidents(getLocalResidents());
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* Detail & Supervisor Editing Modal */}
      <ReportDetailModal
        report={selectedReportForDetail}
        isOpen={!!selectedReportForDetail}
        onClose={() => setSelectedReportForDetail(null)}
        onSave={async (updated) => {
          const success = await handleSaveReport(updated);
          if (success) {
            setSelectedReportForDetail(updated);
          }
          return success;
        }}
        onDelete={(id) => {
          handleDeleteReport(id);
        }}
        onOpenPrint={(rep) => {
          handleOpenPrintSingle(rep);
        }}
      />

      {/* Print & PDF Export Modal */}
      <PrintPreviewModal
        isOpen={!!printModalReport || !!printModalList}
        onClose={() => {
          setPrintModalReport(null);
          setPrintModalList(null);
        }}
        report={printModalReport}
        reportsList={printModalList}
        titleLabel={printModalTitle}
      />

      {/* Data Management Modal (Save & Restore) */}
      <DataManagementModal
        isOpen={showDataModal}
        onClose={() => setShowDataModal(false)}
        reports={reports}
        residents={residents}
        onDataChanged={() => {
          setReports(getLocalReports());
          setResidents(getLocalResidents());
        }}
      />

      {/* Admin Password Auth Modal */}
      <AdminAuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingAdminAction(null);
        }}
        onSuccess={handleAdminAuthSuccess}
      />

      {/* Mobile Bottom Fixed Bar for quick access */}
      {viewMode === 'mobile' && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2 px-4 z-30 sm:hidden flex items-center justify-around text-[10px] font-bold text-slate-600 print:hidden">
          <button
            type="button"
            onClick={() => setMobileTab('form')}
            className={`flex flex-col items-center gap-0.5 ${
              mobileTab === 'form' ? 'text-amber-600' : 'text-slate-500'
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span>新規報告</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('list')}
            className={`flex flex-col items-center gap-0.5 relative ${
              mobileTab === 'list' ? 'text-amber-600' : 'text-slate-500'
            }`}
          >
            <ListFilter className="w-5 h-5" />
            <span>共有一覧</span>
            {reports.length > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-black">
                {reports.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              requireAdminAuth(() => setViewMode('admin'));
            }}
            className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-slate-800"
          >
            <Monitor className="w-5 h-5" />
            <span>管理者PC</span>
          </button>
        </div>
      )}
    </div>
  );
}
