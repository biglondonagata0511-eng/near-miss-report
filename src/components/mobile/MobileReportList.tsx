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
  ShieldAlert
} from 'lucide-react';
import { Report } from '../../types/report';

interface MobileReportListProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;
  onNewReport: () => void;
}

export const MobileReportList: React.FC<MobileReportListProps> = ({
  reports,
  onSelectReport,
  onNewReport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'hiyari' | 'accident'>('all');

  const filtered = reports.filter((r) => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.residentName.toLowerCase().includes(term) ||
      r.situationCategory.toLowerCase().includes(term) ||
      r.location.toLowerCase().includes(term) ||
      r.situationDescription.toLowerCase().includes(term) ||
      r.reporterName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-xl mx-auto pb-24 px-3 sm:px-4 pt-3">
      {/* Search and Quick Filters */}
      <div className="bg-white rounded-2xl p-3 shadow-xs border border-slate-200 mb-3 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="利用者名・場所・状況で検索..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
              filterType === 'all'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            すべて ({reports.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('hiyari')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
              filterType === 'hiyari'
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            ヒヤリ ({reports.filter((r) => r.type === 'hiyari').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('accident')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
              filterType === 'accident'
                ? 'bg-rose-500 text-white border-rose-500'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            事故 ({reports.filter((r) => r.type === 'accident').length})
          </button>
        </div>
      </div>

      {/* Reports Count and Note */}
      <div className="flex items-center justify-between px-1 mb-2.5">
        <span className="text-xs font-bold text-slate-600">
          共有中の報告（他デバイスと同期）: <span className="font-bold text-slate-900 font-meiryo-num text-sm">{filtered.length}</span>件
        </span>
        <button
          type="button"
          onClick={onNewReport}
          className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
        >
          ＋ 新規報告を作成
        </button>
      </div>

      {/* List Cards */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <p className="text-sm font-semibold text-slate-500">
              該当する報告はありません
            </p>
          </div>
        ) : (
          filtered.map((report) => {
            const isHiyari = report.type === 'hiyari';
            return (
              <div
                key={report.id}
                onClick={() => onSelectReport(report)}
                className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200 hover:border-amber-400 active:scale-[0.99] transition-all cursor-pointer relative"
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
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
                    <span className="text-xs font-extrabold text-slate-900">
                      {report.residentName} 様
                    </span>
                    {report.age !== null && report.age !== undefined && (
                      <span className="text-xs font-bold text-slate-600 font-meiryo-num">
                        ({report.age}歳)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-500 font-meiryo-num font-bold">
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
                  {report.factorsMaterialTags?.slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium"
                    >
                      物: {t}
                    </span>
                  ))}
                  {report.factorsEnvironmentalTags?.slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded text-[10px] font-medium"
                    >
                      環: {t}
                    </span>
                  ))}
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-400">
                    報告: {report.reporterName || 'スタッフ'}
                  </span>
                  <div className="flex items-center gap-1">
                    {report.supervisorConfirmed ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
                        <CheckCircle className="w-3 h-3" /> 管理者確認済
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium">未確認</span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-1" />
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
