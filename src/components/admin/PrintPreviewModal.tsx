import React, { useRef, useState } from 'react';
import { Printer, X, Download, FileText, CheckCircle, FolderDown } from 'lucide-react';
import { Report } from '../../types/report';
import { formatJapaneseDate, getDayOfWeekJapanese } from '../../lib/dateUtils';
import { SaveDestinationModal } from './SaveDestinationModal';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  report?: Report | null; // For single report mode
  reportsList?: Report[] | null; // For list mode
  titleLabel?: string;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  report,
  reportsList,
  titleLabel = 'ヒヤリハット報告書',
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const isListMode = !!reportsList && !report;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-slate-100 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col">
        {/* Modal Toolbar (hidden during print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm sm:text-base">
              {isListMode ? 'ヒヤリハット・事故一覧表（保存・印刷）' : `${report?.residentName || ''} 様の報告書（公式様式）`}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Button 1: 保存（保存先を指定） */}
            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs transition-all shadow-md shadow-blue-600/25 cursor-pointer"
              title="保存先フォルダーを指定して保管"
            >
              <FolderDown className="w-4 h-4" />
              <span>保存（保存先を指定）</span>
            </button>

            {/* Button 2: 印刷 */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              title="プリンターで印刷"
            >
              <Printer className="w-4 h-4" />
              <span>印刷</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              title="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Note on Save & Print */}
        <div className="px-5 py-2.5 bg-blue-50/90 border-b border-blue-200 text-[11px] text-blue-950 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-black px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px]">保存・保管のご案内</span>
            <span>
              事故報告・ヒヤリは<strong>「保存（保存先を指定）」</strong>ボタンから施設の保管フォルダー（共有フォルダ等）を指定して保存できます。紙に出力する場合は<strong>「印刷」</strong>を押してください。
            </span>
          </div>
        </div>

        {/* Printable Sheet Viewport */}
        <div className="overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-200/70 print:p-0 print:bg-white">
          {/* A4 Paper simulation */}
          <div 
            ref={sheetRef}
            className="bg-white w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-10 shadow-lg text-slate-900 print:shadow-none print:w-full print:p-0 text-[12px] leading-relaxed font-sans"
          >
            {isListMode && reportsList ? (
              /* ================= LIST MODE ================= */
              <div>
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900">
                      介護施設 ヒヤリハット・事故報告 集計一覧表
                    </h1>
                    <p className="text-xs text-slate-600 mt-1">
                      対象期間: {titleLabel} （出力日時: {new Date().toLocaleDateString('ja-JP')}）
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-bold">総件数: {reportsList.length} 件</span>
                    <div className="text-[11px] text-slate-500">
                      (ヒヤリ: {reportsList.filter((r) => r.type === 'hiyari').length}件 / 事故: {reportsList.filter((r) => r.type === 'accident').length}件)
                    </div>
                  </div>
                </div>

                <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                      <th className="border border-slate-300 p-1.5 w-12 text-center">種別</th>
                      <th className="border border-slate-300 p-1.5 w-24">発生日</th>
                      <th className="border border-slate-300 p-1.5 w-24">利用者名</th>
                      <th className="border border-slate-300 p-1.5 w-20">場所</th>
                      <th className="border border-slate-300 p-1.5">状況・要因の概要</th>
                      <th className="border border-slate-300 p-1.5 w-20">報告者</th>
                      <th className="border border-slate-300 p-1.5 w-16 text-center">確認</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportsList.map((r, i) => (
                      <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="border border-slate-300 p-1.5 text-center font-bold">
                          {r.type === 'accident' ? (
                            <span className="text-rose-600">事故</span>
                          ) : (
                            <span className="text-amber-600">ヒヤリ</span>
                          )}
                        </td>
                        <td className="border border-slate-300 p-1.5">
                          {r.occurrenceDate}
                          <div className="text-[10px] text-slate-500">{r.occurrenceTime.split(' ')[0]}</div>
                        </td>
                        <td className="border border-slate-300 p-1.5 font-bold">
                          {r.residentName} 様
                          <div className="text-[10px] text-slate-400">{r.careLevel || ''}</div>
                        </td>
                        <td className="border border-slate-300 p-1.5">{r.location}</td>
                        <td className="border border-slate-300 p-1.5">
                          <div className="font-semibold text-slate-800">{r.situationCategory}</div>
                          <div className="line-clamp-2 text-slate-600 text-[10px]">{r.situationDescription}</div>
                        </td>
                        <td className="border border-slate-300 p-1.5 text-slate-600">{r.reporterName}</td>
                        <td className="border border-slate-300 p-1.5 text-center">
                          {r.supervisorConfirmed ? '済' : '未'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : report ? (
              /* ================= SINGLE REPORT OFFICIAL A4 FORMAT ================= */
              <div>
                {/* Official Header with Stamp Boxes */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase block mb-1">
                      高齢者福祉施設 事故防止・リスクマネジメント様式
                    </span>
                    <h1 className="text-2xl font-black text-slate-950 tracking-tight">
                      {report.type === 'accident' ? '事 故 報 告 書' : 'ヒヤリ・ハット 報 告 書'}
                    </h1>
                    <p className="text-[11px] text-slate-500 mt-1 font-meiryo-num">
                      管理番号: {report.id} / 報告日: {formatJapaneseDate(report.reportDate)} ({report.dayOfWeek}曜日)
                    </p>
                  </div>

                  {/* Japanese Hanko / Signature Boxes */}
                  <div className="flex border border-slate-400 text-center text-[10px]">
                    <div className="border-r border-slate-400 w-16">
                      <div className="bg-slate-100 py-0.5 border-b border-slate-400 font-bold">施設長</div>
                      <div className="h-14 flex items-center justify-center text-slate-300">印</div>
                    </div>
                    <div className="border-r border-slate-400 w-16">
                      <div className="bg-slate-100 py-0.5 border-b border-slate-400 font-bold">管理者</div>
                      <div className="h-14 flex items-center justify-center font-bold text-slate-700">
                        {report.supervisorConfirmed ? '検印済' : '印'}
                      </div>
                    </div>
                    <div className="w-16">
                      <div className="bg-slate-100 py-0.5 border-b border-slate-400 font-bold">作成者</div>
                      <div className="h-14 flex items-center justify-center font-bold text-slate-700 text-[10px]">
                        {report.reporterName || '印'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table Layout */}
                <table className="w-full border-collapse border border-slate-400 mb-4 text-xs">
                  <tbody>
                    {/* Row 1: Resident basic info */}
                    <tr className="border-b border-slate-400">
                      <th className="bg-slate-100 p-2 w-24 font-bold border-r border-slate-400">利用者氏名</th>
                      <td className="p-2 font-bold text-sm border-r border-slate-400">
                        {report.residentName?.replace(/[\s　]*様[\s　]*$/, '')} 様 {report.roomNumber ? `(${report.roomNumber})` : ''}
                      </td>
                      <th className="bg-slate-100 p-2 w-20 font-bold border-r border-slate-400">性別</th>
                      <td className="p-2 border-r border-slate-400">
                        {report.gender === 'male' ? '男性' : report.gender === 'female' ? '女性' : 'その他'}
                      </td>
                      <th className="bg-slate-100 p-2 w-20 font-bold border-r border-slate-400">年齢</th>
                      <td className="p-2 font-bold font-meiryo-num text-sm">
                        {report.age !== null && report.age !== undefined ? `${report.age} 歳` : '（未記載）'}
                      </td>
                    </tr>

                    {/* Row 2: Care level and Occurrence Date */}
                    <tr className="border-b border-slate-400">
                      <th className="bg-slate-100 p-2 font-bold border-r border-slate-400">要介護度</th>
                      <td className="p-2 border-r border-slate-400">{report.careLevel || '未設定'}</td>
                      <th className="bg-slate-100 p-2 font-bold border-r border-slate-400">発生・発見日時</th>
                      <td colSpan={3} className="p-2 font-bold font-meiryo-num text-sm">
                        {formatJapaneseDate(report.occurrenceDate)} ({getDayOfWeekJapanese(report.occurrenceDate)}曜)　{report.occurrenceTime}
                      </td>
                    </tr>

                    {/* Row 3: Location */}
                    <tr className="border-b border-slate-400">
                      <th className="bg-slate-100 p-2 font-bold border-r border-slate-400">発生・発見場所</th>
                      <td colSpan={5} className="p-2">
                        <span className="font-bold text-slate-900">{report.location}</span>
                        {report.locationDetail && (
                          <span className="text-slate-600 ml-2">（詳細: {report.locationDetail}）</span>
                        )}
                      </td>
                    </tr>

                    {/* Row 4: Situation Classification & Description */}
                    <tr className="border-b border-slate-400">
                      <th className="bg-slate-100 p-2 font-bold border-r border-slate-400">事案分類</th>
                      <td colSpan={5} className="p-2 font-bold">
                        {report.situationCategory}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-400">
                      <th className="bg-slate-100 p-2 font-bold border-r border-slate-400 align-top">
                        発生状況の詳細
                      </th>
                      <td colSpan={5} className="p-2.5 whitespace-pre-wrap leading-relaxed min-h-[80px]">
                        {report.situationDescription}
                      </td>
                    </tr>

                    {/* Row 5: 3-Factor Breakdown (分離型) */}
                    <tr className="border-b border-slate-400">
                      <th className="bg-slate-200 p-2 font-bold border-r border-slate-400 text-center" colSpan={6}>
                        【要因分析（人・もの・環境の3分類）】※個人の不注意に帰属させず設備や環境にも着目
                      </th>
                    </tr>
                    <tr className="border-b border-slate-400">
                      <th className="bg-slate-50 p-2 font-bold border-r border-slate-400 align-top text-blue-900">
                        1. 本人・職員要因
                      </th>
                      <td colSpan={5} className="p-2">
                        {report.factorsPersonalTags?.length > 0 && (
                          <div className="font-bold text-[11px] text-blue-800 mb-1">
                            該当項目: {report.factorsPersonalTags.join('、')}
                          </div>
                        )}
                        <div className="text-slate-700 whitespace-pre-wrap">{report.factorsPersonal || '特記なし'}</div>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-400">
                      <th className="bg-slate-50 p-2 font-bold border-r border-slate-400 align-top text-emerald-900">
                        2. 物的・設備要因
                      </th>
                      <td colSpan={5} className="p-2">
                        {report.factorsMaterialTags?.length > 0 && (
                          <div className="font-bold text-[11px] text-emerald-800 mb-1">
                            該当項目: {report.factorsMaterialTags.join('、')}
                          </div>
                        )}
                        <div className="text-slate-700 whitespace-pre-wrap">{report.factorsMaterial || '特記なし'}</div>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-400">
                      <th className="bg-slate-50 p-2 font-bold border-r border-slate-400 align-top text-violet-900">
                        3. 環境・運用要因
                      </th>
                      <td colSpan={5} className="p-2">
                        {report.factorsEnvironmentalTags?.length > 0 && (
                          <div className="font-bold text-[11px] text-violet-800 mb-1">
                            該当項目: {report.factorsEnvironmentalTags.join('、')}
                          </div>
                        )}
                        <div className="text-slate-700 whitespace-pre-wrap">{report.factorsEnvironmental || '特記なし'}</div>
                      </td>
                    </tr>

                    {/* Row 6: Emergency Response */}
                    <tr className="border-b border-slate-400">
                      <th className="bg-slate-100 p-2 font-bold border-r border-slate-400 align-top">
                        応急処置・対応
                      </th>
                      <td colSpan={5} className="p-2 whitespace-pre-wrap">
                        {report.emergencyResponse || 'バイタル測定等の安全確認を実施'}
                      </td>
                    </tr>

                    {/* Row 7: Preventive Measures */}
                    <tr className="border-b border-slate-400">
                      <th className="bg-slate-100 p-2 font-bold border-r border-slate-400 align-top">
                        現場再発防止策
                      </th>
                      <td colSpan={5} className="p-2 whitespace-pre-wrap font-medium">
                        {report.preventiveMeasures || 'なし'}
                      </td>
                    </tr>

                    {/* Row 8: Supervisor Evaluation */}
                    <tr>
                      <th className="bg-slate-100 p-2 font-bold border-r border-slate-400 align-top text-amber-900">
                        管理者所見・指示
                      </th>
                      <td colSpan={5} className="p-2.5 bg-amber-50/20 whitespace-pre-wrap min-h-[60px]">
                        {report.supervisorComment || '（確認済・検討中）'}
                        <div className="mt-2 text-right text-[10px] text-slate-500 font-semibold">
                          確認状況: {report.supervisorConfirmed ? '【管理者承認済】' : '【未確認】'}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer notes */}
                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                  <span>介護事故防止・リスクマネジメント委員会保管用</span>
                  <span>報告者: {report.reporterName || '担当介護職員'}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Save Destination & Format Modal (保存先指定画面) */}
      <SaveDestinationModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        report={report}
        reportsList={reportsList}
        elementToCapture={sheetRef.current}
        titleLabel={titleLabel}
        onPrint={handlePrint}
      />
    </div>
  );
};
