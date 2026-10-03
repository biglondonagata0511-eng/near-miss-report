import React, { useState } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  Calendar, 
  Search, 
  User, 
  CheckCircle, 
  Filter, 
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Building2,
  ChevronDown,
  X,
  FolderDown
} from 'lucide-react';
import { 
  Report, 
  FACILITY_BRANCH_OPTIONS, 
  FacilityBranch,
  getFacilityShortName,
  getFacilityBadgeStyle
} from '../../types/report';

interface MobileReportListProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;
  onNewReport: () => void;
  onOpenPrintList?: (reports: Report[], titleLabel: string) => void;
}

export const MobileReportList: React.FC<MobileReportListProps> = ({
  reports,
  onSelectReport,
  onNewReport,
  onOpenPrintList,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFacility, setSelectedFacility] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'hiyari' | 'accident'>('all');

  // Filter by facility first
  const facilityFiltered = reports.filter((r) => {
    if (selectedFacility === 'all') return true;
    const branch = r.facilityBranch || FACILITY_BRANCH_OPTIONS[0];
    return branch === selectedFacility;
  });

  // Filter by type and search term
  const filtered = facilityFiltered.filter((r) => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const branch = (r.facilityBranch || '').toLowerCase();
    return (
      r.residentName.toLowerCase().includes(term) ||
      branch.includes(term) ||
      r.situationCategory.toLowerCase().includes(term) ||
      r.location.toLowerCase().includes(term) ||
      (r.locationDetail && r.locationDetail.toLowerCase().includes(term)) ||
      r.situationDescription.toLowerCase().includes(term) ||
      r.reporterName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-xl mx-auto pb-24 px-3 sm:px-4 pt-3">
      {/* Search and Facility / Type Filters */}
      <div className="bg-white rounded-2xl p-3 shadow-xs border border-slate-200 mb-3 space-y-2.5">
        {/* 1. 検索ボックス (利用者名など任意のワードで検索) */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="利用者名・キーワード・状況で検索..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:ring-2 focus:ring-amber-500 font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              title="検索クリア"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 2. 3事業所プルダウン選択 (「すべて」「ヒヤリ」「事故」の上に配置) */}
        <div>
          <div className="flex items-center justify-between mb-1 px-0.5">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span>事業所で絞り込み</span>
            </label>
            {selectedFacility !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedFacility('all')}
                className="text-[10px] text-indigo-600 hover:underline font-bold cursor-pointer"
              >
                全事業所を表示
              </button>
            )}
          </div>
          <div className="relative">
            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
            >
              <option value="all">すべての事業所（3事業所合同・全{reports.length}件）</option>
              {FACILITY_BRANCH_OPTIONS.map((branch) => {
                const count = reports.filter(
                  (r) => (r.facilityBranch || FACILITY_BRANCH_OPTIONS[0]) === branch
                ).length;
                return (
                  <option key={branch} value={branch}>
                    {branch} ({count}件)
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-4 h-4 text-indigo-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* 3. 現在の「すべて」「ヒヤリ」「事故」ボタン (そのまま維持) */}
        <div className="flex gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            すべて ({facilityFiltered.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('hiyari')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              filterType === 'hiyari'
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            ヒヤリ ({facilityFiltered.filter((r) => r.type === 'hiyari').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('accident')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              filterType === 'accident'
                ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            事故 ({facilityFiltered.filter((r) => r.type === 'accident').length})
          </button>
        </div>
      </div>

      {/* Reports Count, Facility Note, and Actions */}
      <div className="flex flex-wrap items-center justify-between px-1 mb-2.5 gap-2">
        <div className="text-xs font-bold text-slate-600">
          <span>表示中: </span>
          <span className="font-bold text-slate-900 font-meiryo-num text-sm">{filtered.length}</span>
          <span>件</span>
          {selectedFacility !== 'all' && (
            <span className="ml-1 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-semibold">
              {selectedFacility.replace('桃の郷京都東山', '')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpenPrintList && filtered.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const title = selectedFacility === 'all'
                  ? '桃の郷京都東山（全事業所） 事故・ヒヤリハット報告一覧'
                  : `${selectedFacility} 事故・ヒヤリハット報告一覧`;
                onOpenPrintList(filtered, title);
              }}
              className="text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              title="選択中の事業所の一覧を印刷・PDF保存"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>一覧を保存・印刷</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNewReport}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
          >
            ＋ 新規作成
          </button>
        </div>
      </div>

      {/* List Cards */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <p className="text-sm font-semibold text-slate-500">
              該当する報告はありません
            </p>
            {selectedFacility !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedFacility('all')}
                className="mt-2 text-xs text-indigo-600 font-bold hover:underline"
              >
                すべての事業所の報告を表示する
              </button>
            )}
          </div>
        ) : (
          filtered.map((report) => {
            const isHiyari = report.type === 'hiyari';
            const branchName = report.facilityBranch || FACILITY_BRANCH_OPTIONS[0];

            return (
              <div
                key={report.id}
                onClick={() => onSelectReport(report)}
                className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200 hover:border-amber-400 active:scale-[0.99] transition-all cursor-pointer relative"
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black ${
                        isHiyari
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {isHiyari ? (
                        <>
                          <Sparkles className="w-3 h-3" /> ヒヤリ
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3" /> 事故
                        </>
                      )}
                    </span>

                    {/* 事業所バッジ (黄緑・ピンク・ブルー) */}
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${getFacilityBadgeStyle(branchName)}`}>
                      <Building2 className="w-2.5 h-2.5" />
                      <span>{getFacilityShortName(branchName)}</span>
                    </span>

                    <span className="text-xs font-extrabold text-slate-900">
                      {report.residentName} 様
                    </span>
                    {report.age !== null && report.age !== undefined && (
                      <span className="text-xs font-bold text-slate-600 font-meiryo-num">
                        ({report.age}歳)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-500 font-meiryo-num font-bold shrink-0">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{report.occurrenceDate}</span>
                  </div>
                </div>

                {/* Situation category & Location */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2 text-xs">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md">
                    {report.situationCategory}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {report.location}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400 text-[11px]">
                    <Clock className="w-3 h-3" />
                    {report.occurrenceTime.split(' ')[0]}
                  </span>
                </div>

                {/* Snippet */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-2.5">
                  {report.situationDescription}
                </p>

                {/* Factor Tags Preview */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {report.factorsPersonalTags?.slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium"
                    >
                      人: {t}
                    </span>
                  ))}
                  {report.factorsMaterialTags?.slice(0, 1).map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-medium"
                    >
                      物: {t}
                    </span>
                  ))}
                  {report.factorsEnvironmentalTags?.slice(0, 1).map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium"
                    >
                      環: {t}
                    </span>
                  ))}
                </div>

                {/* Footer status row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  <div className="text-slate-500">
                    報告者: <span className="font-semibold text-slate-700">{report.reporterName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {report.supervisorConfirmed ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        管理者確認済
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">未確認</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
