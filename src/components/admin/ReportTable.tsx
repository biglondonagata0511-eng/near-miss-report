import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  Filter, 
  FileDown, 
  Printer, 
  Edit3, 
  Trash2, 
  Eye, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  User,
  ArrowUpDown,
  FolderDown
} from 'lucide-react';
import { Report, LOCATION_OPTIONS } from '../../types/report';
import { exportReportsAsCSV } from '../../lib/storage';

interface ReportTableProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;
  onDeleteReport: (reportId: string) => void;
  onOpenPrintSingle: (report: Report) => void;
  onOpenPrintList: (reports: Report[], filterLabel: string) => void;
}

export const ReportTable: React.FC<ReportTableProps> = ({
  reports,
  onSelectReport,
  onDeleteReport,
  onOpenPrintSingle,
  onOpenPrintList,
}) => {
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<'occurrenceDate' | 'residentName' | 'type'>('occurrenceDate');
  const [sortAsc, setSortAsc] = useState(false);

  // Generate Year-Month options from available reports
  const yearMonthOptions = useMemo(() => {
    const ymSet = new Set<string>();
    reports.forEach((r) => {
      if (r.occurrenceDate && r.occurrenceDate.length >= 7) {
        ymSet.add(r.occurrenceDate.substring(0, 7));
      }
    });
    return Array.from(ymSet).sort().reverse();
  }, [reports]);

  // Filter logic
  const filteredReports = useMemo(() => {
    return reports
      .filter((r) => {
        // Search term
        if (searchTerm) {
          const t = searchTerm.toLowerCase();
          const match =
            r.residentName.toLowerCase().includes(t) ||
            r.situationDescription.toLowerCase().includes(t) ||
            r.location.toLowerCase().includes(t) ||
            r.reporterName.toLowerCase().includes(t) ||
            r.situationCategory.toLowerCase().includes(t);
          if (!match) return false;
        }

        // Year-Month
        if (selectedYearMonth !== 'all') {
          if (!r.occurrenceDate.startsWith(selectedYearMonth)) return false;
        }

        // Date range
        if (startDate && r.occurrenceDate < startDate) return false;
        if (endDate && r.occurrenceDate > endDate) return false;

        // Type
        if (filterType !== 'all' && r.type !== filterType) return false;

        // Location
        if (filterLocation !== 'all' && r.location !== filterLocation) return false;

        // Status
        if (filterStatus === 'unconfirmed' && r.supervisorConfirmed) return false;
        if (filterStatus === 'confirmed' && !r.supervisorConfirmed) return false;
        if (filterStatus === 'resolved' && r.status !== 'resolved') return false;

        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [
    reports,
    searchTerm,
    selectedYearMonth,
    startDate,
    endDate,
    filterType,
    filterLocation,
    filterStatus,
    sortField,
    sortAsc,
  ]);

  const filterSummaryLabel = useMemo(() => {
    const parts = [];
    if (selectedYearMonth !== 'all') parts.push(`${selectedYearMonth}`);
    if (startDate || endDate) parts.push(`${startDate || '〜'} 〜 ${endDate || '本日'}`);
    if (searchTerm) parts.push(`検索「${searchTerm}」`);
    return parts.length > 0 ? parts.join(' / ') : '全報告一覧';
  }, [selectedYearMonth, startDate, endDate, searchTerm]);

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden space-y-4 p-4 sm:p-5">
      {/* Top Filter and Search Controls */}
      <div className="space-y-3 pb-3 border-b border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          {/* Search Bar */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="利用者名・キーワード・状況で検索..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          {/* Year-Month Dropdown */}
          <div className="md:col-span-2">
            <select
              value={selectedYearMonth}
              onChange={(e) => {
                setSelectedYearMonth(e.target.value);
                setStartDate('');
                setEndDate('');
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
            >
              <option value="all">すべての年月</option>
              {yearMonthOptions.map((ym) => (
                <option key={ym} value={ym}>
                  {ym.replace('-', '年')}月
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Picker (任意期間) */}
          <div className="md:col-span-3 flex items-center gap-1">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedYearMonth('all');
              }}
              className="w-full px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              placeholder="開始日"
            />
            <span className="text-slate-400 text-xs">〜</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSelectedYearMonth('all');
              }}
              className="w-full px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              placeholder="終了日"
            />
          </div>

          {/* Type Filter */}
          <div className="md:col-span-3 flex gap-1">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-1/2 px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
            >
              <option value="all">種別: すべて</option>
              <option value="hiyari">ヒヤリハット</option>
              <option value="accident">事故報告</option>
            </select>

            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-1/2 px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
            >
              <option value="all">場所: すべて</option>
              {LOCATION_OPTIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Bar: Print PDF, Export CSV */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-semibold">
            <span>該当件数: <strong className="text-slate-900 font-meiryo-num text-sm font-bold">{filteredReports.length}</strong> 件</span>
            {(searchTerm || selectedYearMonth !== 'all' || startDate || endDate || filterType !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedYearMonth('all');
                  setStartDate('');
                  setEndDate('');
                  setFilterType('all');
                  setFilterLocation('all');
                  setFilterStatus('all');
                }}
                className="text-amber-600 hover:underline font-bold"
              >
                フィルター解除
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenPrintList(filteredReports, filterSummaryLabel)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold transition-all shadow-xs cursor-pointer"
              title="一覧表の保存（保存先指定）および印刷"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>一覧を保存・印刷</span>
            </button>

            <button
              type="button"
              onClick={() => exportReportsAsCSV(filteredReports)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-all border border-slate-200"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>CSV出力</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-left text-xs text-slate-700 border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3">種別</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-slate-900"
                onClick={() => {
                  if (sortField === 'occurrenceDate') setSortAsc(!sortAsc);
                  else {
                    setSortField('occurrenceDate');
                    setSortAsc(false);
                  }
                }}
              >
                <div className="flex items-center gap-1">
                  <span>発生日時</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3">利用者氏名</th>
              <th className="py-2.5 px-3">場所</th>
              <th className="py-2.5 px-3">状況分類 / 詳細</th>
              <th className="py-2.5 px-3">要因（人・物・環境）</th>
              <th className="py-2.5 px-3">報告者</th>
              <th className="py-2.5 px-3">管理者確認</th>
              <th className="py-2.5 px-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  条件に該当する報告書は見つかりませんでした
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => {
                const isHiyari = report.type === 'hiyari';
                return (
                  <tr
                    key={report.id}
                    className="hover:bg-amber-50/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectReport(report)}
                  >
                    {/* 種別 */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-black ${
                          isHiyari
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {isHiyari ? 'ヒヤリ' : '事故'}
                      </span>
                    </td>

                    {/* 発生日時 */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-700">
                      <div className="font-bold font-meiryo-num text-xs sm:text-sm">{report.occurrenceDate} ({report.dayOfWeek})</div>
                      <div className="text-[11px] text-slate-500 font-meiryo-num">{report.occurrenceTime}</div>
                    </td>

                    {/* 利用者氏名 & 年齢 */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{report.residentName} 様</div>
                      <div className="text-xs text-slate-500 font-meiryo-num font-semibold">
                        {report.age !== null && report.age !== undefined ? `${report.age}歳 ` : ''}
                        {report.careLevel || ''}
                      </div>
                    </td>

                    {/* 場所 */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{report.location}</span>
                      {report.locationDetail && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {report.locationDetail}
                        </div>
                      )}
                    </td>

                    {/* 状況分類 / 詳細 */}
                    <td className="py-3 px-3 max-w-xs">
                      <div className="font-semibold text-slate-800 truncate mb-0.5">
                        {report.situationCategory}
                      </div>
                      <div className="text-slate-500 text-[11px] line-clamp-1">
                        {report.situationDescription}
                      </div>
                    </td>

                    {/* 要因3分類バッジ */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-0.5 text-[10px]">
                        {report.factorsPersonalTags?.length > 0 && (
                          <span className="text-blue-700 truncate max-w-[140px]">
                            人: {report.factorsPersonalTags.slice(0, 2).join(', ')}
                          </span>
                        )}
                        {report.factorsMaterialTags?.length > 0 && (
                          <span className="text-emerald-700 truncate max-w-[140px]">
                            物: {report.factorsMaterialTags.slice(0, 2).join(', ')}
                          </span>
                        )}
                        {report.factorsEnvironmentalTags?.length > 0 && (
                          <span className="text-violet-700 truncate max-w-[140px]">
                            環: {report.factorsEnvironmentalTags.slice(0, 2).join(', ')}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 報告者 */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                      {report.reporterName || '未記入'}
                    </td>

                    {/* 管理者確認フラグ */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {report.supervisorConfirmed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" /> 確認済
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          未確認
                        </span>
                      )}
                    </td>

                    {/* 操作ボタン */}
                    <td className="py-3 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectReport(report)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-slate-100"
                          title="詳細閲覧・管理者修正"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenPrintSingle(report)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100"
                          title="公式様式で保存（保存先指定）・印刷"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`${report.residentName}様の報告書を削除しますか？`)) {
                              onDeleteReport(report.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
