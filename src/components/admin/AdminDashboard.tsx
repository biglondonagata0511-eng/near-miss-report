import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  AlertTriangle, 
  Sparkles, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Users, 
  Layers, 
  Lightbulb, 
  Filter, 
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  FolderDown,
  Printer
} from 'lucide-react';
import { Report } from '../../types/report';

interface AdminDashboardProps {
  reports: Report[];
  onSelectPeriod: (start: string, end: string) => void;
  onOpenPrintSummary: (filteredReports: Report[], periodLabel: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  reports,
  onOpenPrintSummary,
}) => {
  // Period filter
  const [periodPreset, setPeriodPreset] = useState<'all' | 'thisMonth' | 'lastMonth' | 'last30'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Filter reports based on selected period
  const filteredReports = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return reports.filter((r) => {
      if (!r.occurrenceDate) return true;
      const rDate = new Date(r.occurrenceDate);

      if (periodPreset === 'thisMonth') {
        return rDate.getFullYear() === currentYear && rDate.getMonth() === currentMonth;
      }
      if (periodPreset === 'lastMonth') {
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        return (
          rDate.getFullYear() === lastMonthDate.getFullYear() &&
          rDate.getMonth() === lastMonthDate.getMonth()
        );
      }
      if (periodPreset === 'last30') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return rDate >= thirtyDaysAgo;
      }
      if (customStartDate && customEndDate) {
        return r.occurrenceDate >= customStartDate && r.occurrenceDate <= customEndDate;
      }
      return true;
    });
  }, [reports, periodPreset, customStartDate, customEndDate]);

  // Aggregate Metrics
  const totalCount = filteredReports.length;
  const hiyariCount = filteredReports.filter((r) => r.type === 'hiyari').length;
  const accidentCount = filteredReports.filter((r) => r.type === 'accident').length;
  const unconfirmedCount = filteredReports.filter((r) => !r.supervisorConfirmed).length;
  const resolvedCount = filteredReports.filter((r) => r.status === 'resolved').length;

  // Factor 3-Category Analysis
  const factorStats = useMemo(() => {
    let personalCount = 0;
    let materialCount = 0;
    let environmentalCount = 0;

    const personalTagMap: { [tag: string]: number } = {};
    const materialTagMap: { [tag: string]: number } = {};
    const envTagMap: { [tag: string]: number } = {};

    filteredReports.forEach((r) => {
      // Personal
      if ((r.factorsPersonalTags && r.factorsPersonalTags.length > 0) || r.factorsPersonal) {
        personalCount++;
        r.factorsPersonalTags?.forEach((t) => {
          personalTagMap[t] = (personalTagMap[t] || 0) + 1;
        });
      }
      // Material
      if ((r.factorsMaterialTags && r.factorsMaterialTags.length > 0) || r.factorsMaterial) {
        materialCount++;
        r.factorsMaterialTags?.forEach((t) => {
          materialTagMap[t] = (materialTagMap[t] || 0) + 1;
        });
      }
      // Environmental
      if ((r.factorsEnvironmentalTags && r.factorsEnvironmentalTags.length > 0) || r.factorsEnvironmental) {
        environmentalCount++;
        r.factorsEnvironmentalTags?.forEach((t) => {
          envTagMap[t] = (envTagMap[t] || 0) + 1;
        });
      }
    });

    const sortTags = (map: { [tag: string]: number }) =>
      Object.entries(map)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const totalFactorHits = personalCount + materialCount + environmentalCount || 1;

    return {
      personalCount,
      materialCount,
      environmentalCount,
      personalPercent: Math.round((personalCount / totalFactorHits) * 100),
      materialPercent: Math.round((materialCount / totalFactorHits) * 100),
      envPercent: Math.round((environmentalCount / totalFactorHits) * 100),
      topPersonalTags: sortTags(personalTagMap),
      topMaterialTags: sortTags(materialTagMap),
      topEnvTags: sortTags(envTagMap),
    };
  }, [filteredReports]);

  // Location Distribution
  const locationStats = useMemo(() => {
    const map: { [loc: string]: number } = {};
    filteredReports.forEach((r) => {
      const loc = r.location || 'その他';
      map[loc] = (map[loc] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredReports]);

  // Situation Category Distribution
  const situationStats = useMemo(() => {
    const map: { [cat: string]: number } = {};
    filteredReports.forEach((r) => {
      const cat = r.situationCategory || 'その他';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredReports]);

  // Time Slot Distribution (朝食前後、午前中、昼食前後、午後、夕方、夕食前後、就寝前、夜中、早朝)
  const timeSlotStats = useMemo(() => {
    const map: { [slot: string]: number } = {};
    filteredReports.forEach((r) => {
      const slot = r.occurrenceTimeSlot || (r.occurrenceTime?.includes('(') ? r.occurrenceTime.split('(')[1]?.replace(')', '') : r.occurrenceTime) || 'その他';
      map[slot] = (map[slot] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredReports]);

  // Period label
  const periodLabel = useMemo(() => {
    if (periodPreset === 'thisMonth') return '今月（当月分）';
    if (periodPreset === 'lastMonth') return '先月分';
    if (periodPreset === 'last30') return '直近30日間';
    if (customStartDate && customEndDate) return `${customStartDate} 〜 ${customEndDate}`;
    return '全期間';
  }, [periodPreset, customStartDate, customEndDate]);

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">集計対象期間：</span>
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'all', label: '全期間' },
              { id: 'thisMonth', label: '今月' },
              { id: 'lastMonth', label: '先月' },
              { id: 'last30', label: '直近30日' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPeriodPreset(p.id as any);
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  periodPreset === p.id && !customStartDate
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range & Print Summary Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                setPeriodPreset('all');
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-slate-50"
            />
            <span>〜</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => {
                setCustomEndDate(e.target.value);
                setPeriodPreset('all');
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-slate-50"
            />
          </div>

          <button
            type="button"
            onClick={() => onOpenPrintSummary(filteredReports, periodLabel)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="集計・一覧表の保存（保存先指定）および印刷"
          >
            <FolderDown className="w-3.5 h-3.5" />
            <span>この期間の集計・一覧を保存・印刷</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>総報告件数</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-meiryo-num">{totalCount} <span className="text-sm font-normal text-slate-500">件</span></div>
          <div className="text-[11px] text-slate-400 mt-1">{periodLabel}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-xs border border-amber-200 bg-gradient-to-br from-white to-amber-50/50">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold mb-1">
            <span>ヒヤリハット</span>
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-amber-700 font-meiryo-num">{hiyariCount} <span className="text-sm font-normal text-amber-600">件</span></div>
          <div className="text-[11px] text-amber-600/80 mt-1">未然防止の共有事例</div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-xs border border-rose-200 bg-gradient-to-br from-white to-rose-50/50">
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold mb-1">
            <span>事故報告</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-3xl font-black text-rose-700 font-meiryo-num">{accidentCount} <span className="text-sm font-normal text-rose-600">件</span></div>
          <div className="text-[11px] text-rose-600/80 mt-1">外傷・器物損害あり</div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>管理者未確認</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600 font-meiryo-num">{unconfirmedCount} <span className="text-sm font-normal text-slate-500">件</span></div>
          <div className="text-[11px] text-slate-400 mt-1">確認・対策指示待ち</div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>対策完了率</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600 font-meiryo-num">
            {totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-meiryo-num">{resolvedCount}/{totalCount} 件対策完了</div>
        </div>
      </div>

      {/* HIGHLIGHT: 要因3分類（人・物・環境）の分析セクション */}
      {/* ユーザー要件: 個人の不注意に帰属させず「環境」や設備、ルールに目を向けさせるフォーマット */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                要因3分類（人・もの・環境）分析
              </h3>
              <p className="text-xs text-slate-500">
                個人の不注意に偏らず、物的設備や環境・運用の課題を浮き彫りにする分析
              </p>
            </div>
          </div>
          <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            要因ヒット総数: {factorStats.personalCount + factorStats.materialCount + factorStats.environmentalCount} 件
          </div>
        </div>

        {/* 3-Part Ratio Bar */}
        <div>
          <div className="flex justify-between text-xs font-bold mb-1.5">
            <span className="text-blue-700">1. 本人・職員要因: {factorStats.personalPercent}%</span>
            <span className="text-emerald-700">2. 物的・設備要因: {factorStats.materialPercent}%</span>
            <span className="text-violet-700">3. 環境・運用要因: {factorStats.envPercent}%</span>
          </div>
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${factorStats.personalPercent}%` }}
              className="bg-blue-500 transition-all duration-500"
              title={`人要因: ${factorStats.personalPercent}%`}
            />
            <div
              style={{ width: `${factorStats.materialPercent}%` }}
              className="bg-emerald-500 transition-all duration-500"
              title={`物的設備要因: ${factorStats.materialPercent}%`}
            />
            <div
              style={{ width: `${factorStats.envPercent}%` }}
              className="bg-violet-500 transition-all duration-500"
              title={`環境運用要因: ${factorStats.envPercent}%`}
            />
          </div>
        </div>

        {/* 3 Columns Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
          {/* Column 1: Personal */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                本人・職員要因
              </span>
              <span className="text-xs font-black text-blue-700">{factorStats.personalCount}件</span>
            </div>
            <div className="space-y-1.5 pt-1">
              {factorStats.topPersonalTags.length === 0 ? (
                <p className="text-xs text-slate-400">データなし</p>
              ) : (
                factorStats.topPersonalTags.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-xs bg-white/80 px-2.5 py-1.5 rounded-lg border border-blue-100">
                    <span className="text-slate-700 truncate font-medium">{idx + 1}. {item.name}</span>
                    <span className="font-bold text-blue-700 shrink-0 ml-2">{item.count}件</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 2: Material */}
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                物的・設備要因
              </span>
              <span className="text-xs font-black text-emerald-700">{factorStats.materialCount}件</span>
            </div>
            <div className="space-y-1.5 pt-1">
              {factorStats.topMaterialTags.length === 0 ? (
                <p className="text-xs text-slate-400">データなし</p>
              ) : (
                factorStats.topMaterialTags.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-xs bg-white/80 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                    <span className="text-slate-700 truncate font-medium">{idx + 1}. {item.name}</span>
                    <span className="font-bold text-emerald-700 shrink-0 ml-2">{item.count}件</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 3: Environmental */}
          <div className="p-3.5 rounded-xl bg-violet-50/60 border border-violet-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-violet-900 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                環境・運用要因
              </span>
              <span className="text-xs font-black text-violet-700">{factorStats.environmentalCount}件</span>
            </div>
            <div className="space-y-1.5 pt-1">
              {factorStats.topEnvTags.length === 0 ? (
                <p className="text-xs text-slate-400">データなし</p>
              ) : (
                factorStats.topEnvTags.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-xs bg-white/80 px-2.5 py-1.5 rounded-lg border border-violet-100">
                    <span className="text-slate-700 truncate font-medium">{idx + 1}. {item.name}</span>
                    <span className="font-bold text-violet-700 shrink-0 ml-2">{item.count}件</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Location & Situation & Time Slots Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: 発生場所ランキング */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <MapPin className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-bold text-slate-800">発生・発見場所ワーストランキング</h4>
          </div>
          <div className="space-y-2.5">
            {locationStats.map((item, idx) => {
              const pct = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;
              return (
                <div key={item.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{idx + 1}. {item.name}</span>
                    <span className="text-slate-500 font-bold">{item.count}件 ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: 状況分類分布 */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-slate-800">事故・ヒヤリ状況別分類</h4>
          </div>
          <div className="space-y-2.5">
            {situationStats.map((item, idx) => {
              const pct = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;
              return (
                <div key={item.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{idx + 1}. {item.name}</span>
                    <span className="text-slate-500 font-bold">{item.count}件 ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 3: 時間帯別発生リスク */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-slate-800">時間帯別発生傾向</h4>
          </div>
          <div className="space-y-2.5">
            {timeSlotStats.map((item, idx) => {
              const pct = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;
              return (
                <div key={item.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{item.name}</span>
                    <span className="text-slate-500 font-bold">{item.count}件 ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Management Insight Summary Card */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200/80 shadow-xs flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div className="text-xs leading-relaxed space-y-1">
          <div className="font-bold text-slate-900 text-sm">
            管理者・委員会向け分析インサイト（要約）
          </div>
          <p className="text-slate-700">
            ・今期は「{locationStats[0]?.name || '食堂'}」での「{situationStats[0]?.name || '転倒・転落'}」が最多となっています。
          </p>
          <p className="text-slate-700">
            ・要因分析では、物的設備要因（車椅子のブレーキや照明など）と環境要因（動線の混雑や床の状況）が全体の
            <span className="font-bold text-amber-900 ml-1">
              {factorStats.materialPercent + factorStats.envPercent}%
            </span>
            を占めています。個人の注意喚起だけでなく、定期的な車椅子整備やフロア動線の見直しを行うことで効果的な再発防止が期待できます。
          </p>
        </div>
      </div>
    </div>
  );
};
