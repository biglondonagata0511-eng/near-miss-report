import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Send, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  ShieldAlert, 
  User, 
  HeartHandshake, 
  Sparkles, 
  Check, 
  RotateCcw,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  X
} from 'lucide-react';
import { PRESET_TEMPLATES, PresetTemplate } from '../../lib/presetTemplates';
import { 
  Report, 
  ReportType, 
  Gender, 
  CareLevel, 
  Resident,
  LOCATION_OPTIONS, 
  SITUATION_CATEGORIES, 
  TIME_SLOTS, 
  PERSONAL_FACTOR_SUGGESTIONS, 
  MATERIAL_FACTOR_SUGGESTIONS, 
  ENVIRONMENTAL_FACTOR_SUGGESTIONS, 
  CARE_LEVEL_OPTIONS 
} from '../../types/report';
import { getTodayDateString, getDayOfWeekJapanese, calculateAgeFromBirthDate } from '../../lib/dateUtils';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

interface MobileReportFormProps {
  residents: Resident[];
  onSaveReport: (report: Report) => Promise<boolean>;
  onViewList: () => void;
}

export const MobileReportForm: React.FC<MobileReportFormProps> = ({
  residents,
  onSaveReport,
  onViewList,
}) => {
  // Speech Recognition hook
  const { isListening, startListening, stopListening } = useSpeechRecognition();
  const [activeSpeechField, setActiveSpeechField] = useState<string | null>(null);

  // Form states
  const [reportType, setReportType] = useState<ReportType>('hiyari');
  
  // 利用者選択・予測表示 states
  const [residentInput, setResidentInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);

  // 利用者詳細3項目（性別、要介護度、年齢）
  const [gender, setGender] = useState<Gender>('female');
  const [birthDate, setBirthDate] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [careLevel, setCareLevel] = useState<CareLevel>('要介護2');
  const [roomNumber, setRoomNumber] = useState<string>('');

  // 報告日 (カレンダー埋め込み＋曜日インライン表示 2026/09/30（水）形式)
  const [reportDate, setReportDate] = useState(getTodayDateString());
  const [dayOfWeek, setDayOfWeek] = useState(getDayOfWeekJapanese(getTodayDateString()));
  
  // 発生・発見日 & 時刻 (手入力 HH:MM) ＋ 時間帯プルダウン
  const [occurrenceDate, setOccurrenceDate] = useState(getTodayDateString());
  const [occurrenceTimeOnly, setOccurrenceTimeOnly] = useState('10:00');
  const [occurrenceTimeSlot, setOccurrenceTimeSlot] = useState<string>('午前中');

  // 発生・発見場所 (居室内、廊下、食堂、デイサービス、屋外、トイレ、浴室、その他)
  const [location, setLocation] = useState<string>('食堂');
  const [locationDetail, setLocationDetail] = useState('');

  // 発生状況 (「意識消失・便ショック」追加)
  const [situationCategory, setSituationCategory] = useState<string>('転倒・転落');
  const [situationDescription, setSituationDescription] = useState('');

  // 要因３分類
  // 1. 本人・職員要因: 全タグ残す
  const [personalTags, setPersonalTags] = useState<string[]>([]);
  const [personalDetail, setPersonalDetail] = useState('');

  // 2. 物的要因: 手入力メイン、ボタンは「靴サイズの不適合・足踏み」「歩行器・杖の不具合」のみ
  const [materialTags, setMaterialTags] = useState<string[]>([]);
  const [materialDetail, setMaterialDetail] = useState('');

  // 3. 環境・運用要因: 手入力メイン、ボタンは「マニュアルの不備」「坂道・段差」「見守り時間外」「雨天」「導線混雑時」
  const [environmentalTags, setEnvironmentalTags] = useState<string[]>([]);
  const [environmentalDetail, setEnvironmentalDetail] = useState('');

  // 応急処置・再発防止策・報告者
  const [emergencyResponse, setEmergencyResponse] = useState('');
  const [preventiveMeasures, setPreventiveMeasures] = useState('');
  const [reporterName, setReporterName] = useState('');

  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string>('all');
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const roomPopoverRef = useRef<HTMLDivElement>(null);
  const nameMeasureRef = useRef<HTMLSpanElement>(null);
  const residentInputRef = useRef<HTMLInputElement>(null);
  const [nameWidth, setNameWidth] = useState<number | null>(null);
  const [isRoomPopoverOpen, setIsRoomPopoverOpen] = useState(false);

  // Measure resident name text width whenever residentInput changes
  useEffect(() => {
    if (nameMeasureRef.current) {
      const rect = nameMeasureRef.current.getBoundingClientRect();
      setNameWidth(rect.width);
    }
  }, [residentInput]);

  // Sync day of week when report date changes
  useEffect(() => {
    setDayOfWeek(getDayOfWeekJapanese(reportDate));
  }, [reportDate]);

  // Click outside listener for resident dropdown and room popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (roomPopoverRef.current && !roomPopoverRef.current.contains(event.target as Node)) {
        setIsRoomPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter resident suggestions based on input (matching name or kana or room)
  const matchedResidents = residents.filter((r) => {
    if (!residentInput.trim()) return false;
    const q = residentInput.trim().toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.kana && r.kana.toLowerCase().includes(q)) ||
      (r.roomNumber && r.roomNumber.toLowerCase().includes(q))
    );
  });

  // When a resident is selected from dropdown
  const handleSelectResident = (res: Resident) => {
    setSelectedResident(res);
    setResidentInput(res.name);
    setGender(res.gender);
    setCareLevel(res.careLevel);
    setRoomNumber(res.roomNumber || '');
    setBirthDate(res.birthDate || '');
    
    // Automatically calculate age
    if (res.birthDate) {
      const calculatedAge = calculateAgeFromBirthDate(res.birthDate, occurrenceDate);
      setAge(calculatedAge !== null ? calculatedAge : (res.age || null));
    } else if (res.age) {
      setAge(res.age);
    } else {
      setAge(null); // 空欄でもエラーにならない仕様
    }
    setIsDropdownOpen(false);
  };

  // Quick preset templates for fast filing
  const applyQuickTemplate = (tpl: PresetTemplate) => {
    setSituationCategory(tpl.category);
    setLocation(tpl.loc);
    setOccurrenceTimeSlot(tpl.slot);
    setSituationDescription(tpl.desc);
    setPersonalTags(tpl.pTags);
    setPersonalDetail(tpl.pDesc);
    setMaterialTags(tpl.mTags);
    setMaterialDetail(tpl.mDesc);
    setEnvironmentalTags(tpl.eTags);
    setEnvironmentalDetail(tpl.eDesc);
    setEmergencyResponse(tpl.resp);
    setPreventiveMeasures(tpl.prev);
    setTemplateNotice(`「${tpl.title}」の例文を反映しました`);
    setTimeout(() => {
      setTemplateNotice(null);
    }, 3500);
  };

  // Toggle speech input for a specific text field
  const handleToggleVoice = (fieldName: string, currentVal: string, setter: (val: string) => void) => {
    if (isListening && activeSpeechField === fieldName) {
      stopListening();
      setActiveSpeechField(null);
    } else {
      setActiveSpeechField(fieldName);
      startListening((newChunk) => {
        setter(currentVal ? `${currentVal} ${newChunk}` : newChunk);
      });
    }
  };

  const toggleTag = (list: string[], setList: (l: string[]) => void, tag: string) => {
    if (list.includes(tag)) {
      setList(list.filter((t) => t !== tag));
    } else {
      setList([...list, tag]);
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isListening) {
      stopListening();
    }

    if (!residentInput.trim()) {
      setValidationError('利用者氏名を入力してください。');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!situationDescription.trim()) {
      setValidationError('状況の詳細を入力してください。（音声入力も利用できます）');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    const formattedTime = occurrenceTimeOnly
      ? `${occurrenceTimeOnly} (${occurrenceTimeSlot})`
      : occurrenceTimeSlot;

    const newReport: Report = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: reportType,
      residentName: residentInput.trim().replace(/[\s　]*様[\s　]*$/, ''),
      gender,
      birthDate: birthDate || undefined,
      age: age, // 空欄でもOK
      careLevel,
      roomNumber: roomNumber.trim() || undefined,
      reportDate,
      dayOfWeek,
      occurrenceDate,
      occurrenceTimeOnly: occurrenceTimeOnly.trim() || undefined,
      occurrenceTimeSlot,
      occurrenceTime: formattedTime,
      location,
      locationDetail: locationDetail.trim(),
      situationCategory,
      situationDescription: situationDescription.trim(),
      factorsPersonalTags: personalTags,
      factorsPersonal: personalDetail.trim(),
      factorsMaterialTags: materialTags,
      factorsMaterial: materialDetail.trim(),
      factorsEnvironmentalTags: environmentalTags,
      factorsEnvironmental: environmentalDetail.trim(),
      emergencyResponse: emergencyResponse.trim(),
      preventiveMeasures: preventiveMeasures.trim(),
      reporterName: reporterName.trim() || '現場担当職員',
      status: 'submitted',
      severity: reportType === 'accident' ? 'level1' : 'level0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      supervisorConfirmed: false,
    };

    const success = await onSaveReport(newReport);
    setIsSubmitting(false);

    if (success) {
      setShowSuccessModal(true);
    } else {
      setValidationError('データの保存に失敗しました。もう一度お試しください。');
    }
  };

  // Reset form for next input
  const handleReset = () => {
    setResidentInput('');
    setSelectedResident(null);
    setBirthDate('');
    setAge(null);
    setRoomNumber('');
    setSituationDescription('');
    setPersonalTags([]);
    setPersonalDetail('');
    setMaterialTags([]);
    setMaterialDetail('');
    setEnvironmentalTags([]);
    setEnvironmentalDetail('');
    setEmergencyResponse('');
    setPreventiveMeasures('');
    setLocationDetail('');
    setShowSuccessModal(false);
  };

  // Date formatted display with Japanese day of week: 2026/9/30 (水)
  const formatDisplayDateWithDay = (dateStr: string) => {
    if (!dateStr) return '';
    const dow = getDayOfWeekJapanese(dateStr);
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[0]}/${Number(parts[1])}/${Number(parts[2])} (${dow})`;
    }
    return dow ? `${dateStr} (${dow})` : dateStr;
  };

  return (
    <div className="max-w-xl mx-auto pb-24 px-3 sm:px-4 pt-3 font-sans">
      {/* Top Banner / Type Selector */}
      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 mb-4">
        <div className="text-center mb-2.5">
          <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            種別を選択（ワンタップ）
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setReportType('hiyari')}
            className={`py-3 px-3 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all border-2 ${
              reportType === 'hiyari'
                ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-200 scale-[1.02]'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span>ヒヤリハット報告</span>
          </button>
          <button
            type="button"
            onClick={() => setReportType('accident')}
            className={`py-3 px-3 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all border-2 ${
              reportType === 'accident'
                ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-200 scale-[1.02]'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
            <span>事故報告書</span>
          </button>
        </div>
      </div>

      {validationError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-xl mb-4 text-xs font-semibold text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* CARD 1: 利用者・日時の基本情報 */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">
              1. 利用者・日時の基本情報
            </h2>
          </div>

          <div className="space-y-3.5">
            {/* 1. 利用者氏名 (約2/3) & 部屋番号 (約1/3弱) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                利用者氏名 <span className="text-red-500">*必須</span>
              </label>

              {/* 氏名幅計測用の非表示スパン (報告日と同じ大きさ・1pt調整済みフォントサイズで正確に測定) */}
              <span
                ref={nameMeasureRef}
                className="absolute -left-[9999px] top-0 invisible whitespace-pre text-[15px] sm:text-base font-bold pointer-events-none select-none font-meiryo-num"
                aria-hidden="true"
              >
                {residentInput || ''}
              </span>

              <div className="flex items-center gap-2">
                {/* 氏名入力ボックス (約2/3スペース) ＋ 予測ドロップダウン */}
                <div className="relative flex-[6.5] min-w-0" ref={dropdownRef}>
                  <div
                    className="relative h-11 flex items-center bg-white rounded-xl border border-slate-300 px-3 focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500 transition-all cursor-text overflow-hidden"
                    onClick={() => residentInputRef.current?.focus()}
                  >
                    <div className="flex items-center flex-1 min-w-0 pr-12">
                      <input
                        ref={residentInputRef}
                        type="text"
                        value={residentInput}
                        onChange={(e) => {
                          // 末尾の「様」や余分な空白を除去して安全に入力
                          const clean = e.target.value.replace(/[\s　]*様[\s　]*$/, '');
                          setResidentInput(clean);
                          setIsDropdownOpen(true);
                          setSelectedResident(null);
                        }}
                        onFocus={() => {
                          if (residentInput.trim()) setIsDropdownOpen(true);
                        }}
                        placeholder="例：山田（名字で検索）"
                        required
                        style={{
                          width: residentInput
                            ? `${nameWidth ? nameWidth + 6 : residentInput.length * 18 + 6}px`
                            : '100%',
                          maxWidth: 'calc(100% - 2.6rem)',
                        }}
                        className="h-full bg-transparent border-none outline-none text-[15px] sm:text-base font-bold text-slate-950 placeholder:text-slate-400 placeholder:font-normal placeholder:text-xs shrink-0"
                      />
                      {/* 名前入力ボックス内で、名前の後ろに約3文字分空けて「様」を自動表示 */}
                      {residentInput.trim() && (
                        <span className="text-[15px] sm:text-base font-bold text-slate-800 pl-3.5 select-none pointer-events-none shrink-0 tracking-wider">
                          様
                        </span>
                      )}
                    </div>

                    {/* 手入力ボックスのクリアボタン (小さく目立たない設計) */}
                    {residentInput ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setResidentInput('');
                          setSelectedResident(null);
                        }}
                        className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 p-1 transition-colors cursor-pointer"
                        title="氏名を消去"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDropdownOpen(!isDropdownOpen);
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 p-1 hover:text-slate-600 cursor-pointer"
                      title="候補一覧を表示"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 予測ドロップダウンメニュー（プルダウン内は「様」不要のご要望により敬称なしで表示） */}
                  {isDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {matchedResidents.length > 0 ? (
                        matchedResidents.map((res) => (
                          <div
                            key={res.id}
                            onClick={() => handleSelectResident(res)}
                            className="p-2.5 hover:bg-amber-50 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                                <span>{res.name}</span>
                                {res.roomNumber && (
                                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-meiryo-num">
                                    {res.roomNumber}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-meiryo-num">
                                {res.kana && `${res.kana} | `}生年月日: {res.birthDate || '未登録'}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 font-meiryo-num">
                                {res.age ? `${res.age}歳` : '自動計算'}
                              </span>
                              <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                                {res.careLevel}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : residentInput.trim() ? (
                        <div className="p-3 text-center text-xs text-slate-500">
                          一致する登録利用者がいません（直接入力で登録可）
                        </div>
                      ) : (
                        <div className="p-2">
                          <div className="text-[10px] text-slate-400 px-2 py-1 font-semibold">
                            登録利用者から選択：
                          </div>
                          {residents.slice(0, 5).map((res) => (
                            <div
                              key={res.id}
                              onClick={() => handleSelectResident(res)}
                              className="p-1.5 hover:bg-amber-50 rounded-lg cursor-pointer flex items-center justify-between text-xs"
                            >
                              <span className="font-bold text-slate-800">{res.name}</span>
                              <span className="text-slate-500 text-[11px]">
                                {res.roomNumber || ''} {res.careLevel} / {res.age}歳
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 名前の右端に約1/3弱のスペースで部屋番号独立ボタン */}
                <div className="relative flex-[3.5] shrink-0" ref={roomPopoverRef}>
                  <button
                    type="button"
                    onClick={() => setIsRoomPopoverOpen(!isRoomPopoverOpen)}
                    className={`w-full h-11 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all shadow-2xs ${
                      roomNumber
                        ? 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100/70'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                    title="部屋番号の選択・変更"
                  >
                    <div className="flex flex-col items-start leading-tight min-w-0 pr-1">
                      <span className="text-[10px] text-slate-400 font-normal">居室番号</span>
                      <span className="font-bold font-meiryo-num text-xs sm:text-sm truncate">
                        {roomNumber || '未設定'}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>

                  {/* 部屋番号クイック設定ポップオーバー */}
                  {isRoomPopoverOpen && (
                    <div className="absolute right-0 top-full mt-1.5 z-40 w-52 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5">
                      <div className="text-xs font-bold text-slate-700 mb-1.5">部屋番号の設定</div>
                      <input
                        type="text"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        placeholder="例: 201号室"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 font-meiryo-num mb-2 focus:ring-1 focus:ring-amber-500"
                        autoFocus
                      />
                      <div className="text-[10px] text-slate-400 mb-1">クイック選択:</div>
                      <div className="grid grid-cols-2 gap-1 mb-2">
                        {['101号室', '102号室', '201号室', '202号室', '203号室', '301号室'].map((rm) => (
                          <button
                            key={rm}
                            type="button"
                            onClick={() => {
                              setRoomNumber(rm);
                              setIsRoomPopoverOpen(false);
                            }}
                            className={`px-1.5 py-1 text-xs font-bold font-meiryo-num rounded border transition-colors ${
                              roomNumber === rm
                                ? 'bg-amber-500 text-white border-amber-600 font-bold'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-900'
                            }`}
                          >
                            {rm}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setRoomNumber('');
                            setIsRoomPopoverOpen(false);
                          }}
                          className="flex-1 py-1 text-xs bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200"
                        >
                          クリア
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsRoomPopoverOpen(false)}
                          className="flex-1 py-1 text-xs bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700"
                        >
                          確定
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. 性別 / 介護度 / 年齢: シンプルに説明（自動反映など）は一切なくして1行で整列 */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {/* 性別 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  性別
                </label>
                <div className="h-11 grid grid-cols-2 p-0.5 bg-slate-100 rounded-xl border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`h-full rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                      gender === 'female'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    女性
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`h-full rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                      gender === 'male'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    男性
                  </button>
                </div>
              </div>

              {/* 介護度 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  介護度
                </label>
                <select
                  value={careLevel}
                  onChange={(e) => setCareLevel(e.target.value as CareLevel)}
                  className="w-full h-11 px-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  {CARE_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* 年齢 (数字はMeiryo UIで2pt大きめ、ボックス中央揃え) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  年齢
                </label>
                <div className="relative h-11">
                  <input
                    type="number"
                    value={age !== null && age !== undefined ? age : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      setAge(val);
                    }}
                    placeholder="未入力可"
                    className="w-full h-11 px-3 text-center rounded-xl border border-slate-300 bg-white text-[15px] sm:text-base font-bold text-slate-950 font-meiryo-num focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-slate-400 placeholder:font-normal placeholder:text-xs placeholder:text-center"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs sm:text-sm font-bold text-slate-500 pointer-events-none">
                    歳
                  </span>
                </div>
              </div>
            </div>

            {/* 3. 報告日 と 発生日: 同じ行の高さ・同じスタイルで配置し、どちらも曜日を表示 (数字サイズ1PT調整) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 報告日 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>報告日</span>
                </label>
                <div className="relative h-11 flex items-center bg-white rounded-xl border border-slate-300 px-3 hover:border-slate-400 transition-colors">
                  <span className="text-[13.5px] sm:text-[14.5px] font-bold text-slate-900 flex-1 tracking-wide font-meiryo-num select-none">
                    {formatDisplayDateWithDay(reportDate)}
                  </span>
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors shrink-0">
                    <Calendar className="w-4 h-4 text-amber-600 pointer-events-none" />
                    {/* opacity-0 にすることでブラウザ固有の文字「2」などの透け見えを完全に防ぐ */}
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="報告日を変更"
                    />
                  </div>
                </div>
              </div>

              {/* 発生・発見日 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>発生・発見日</span>
                </label>
                <div className="relative h-11 flex items-center bg-white rounded-xl border border-slate-300 px-3 hover:border-slate-400 transition-colors">
                  <span className="text-[13.5px] sm:text-[14.5px] font-bold text-slate-900 flex-1 tracking-wide font-meiryo-num select-none">
                    {formatDisplayDateWithDay(occurrenceDate)}
                  </span>
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors shrink-0">
                    <Calendar className="w-4 h-4 text-amber-600 pointer-events-none" />
                    {/* opacity-0 にすることでブラウザ固有の文字などの透け見えを完全に防ぐ */}
                    <input
                      type="date"
                      value={occurrenceDate}
                      onChange={(e) => setOccurrenceDate(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="発生日を変更"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. 発生・発見時刻 & 時間帯区分 (数字サイズ1PT調整) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                発生・発見時刻 &amp; 時間帯区分
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* 時刻手入力ボックス (●:●) */}
                <div className="relative">
                  <input
                    type="text"
                    value={occurrenceTimeOnly}
                    onChange={(e) => setOccurrenceTimeOnly(e.target.value)}
                    placeholder="例: 14:25"
                    className="w-full h-11 px-3 pr-8 rounded-xl border border-slate-300 bg-white text-[13.5px] sm:text-[14.5px] font-bold text-slate-900 font-meiryo-num focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-slate-400 placeholder:font-normal placeholder:text-xs"
                  />
                  {occurrenceTimeOnly ? (
                    <button
                      type="button"
                      onClick={() => setOccurrenceTimeOnly('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 p-0.5 transition-colors cursor-pointer"
                      title="時刻を消去"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>

                {/* 時間帯プルダウン */}
                <div>
                  <select
                    value={occurrenceTimeSlot}
                    onChange={(e) => setOccurrenceTimeSlot(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 5. 発生・発見場所 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>発生・発見場所</span>
              </label>
              <div className="space-y-2">
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  {LOCATION_OPTIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <input
                    type="text"
                    value={locationDetail}
                    onChange={(e) => setLocationDetail(e.target.value)}
                    placeholder="場所の詳細（例: 201号室トイレ前、ベッド足元、便座付近など）"
                    className="w-full h-10 px-3 pr-8 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 text-xs placeholder:text-slate-400"
                  />
                  {locationDetail ? (
                    <button
                      type="button"
                      onClick={() => setLocationDetail('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 p-0.5 transition-colors cursor-pointer"
                      title="詳細を消去"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* よくある事例・例文の呼び出し (Card 1の直下に配置、ワンタップ開閉・全25件の介護現場事例) */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-3 sm:p-3.5 border border-amber-200 shadow-2xs transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-1.5 flex-wrap">
                  <span>よくある事例・例文を呼び出し</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-meiryo-num">
                    全{PRESET_TEMPLATES.length}件
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100/70 shadow-2xs flex items-center gap-1 shrink-0 transition-all"
            >
              <span>{showTemplates ? '例文を閉じる' : '例文を表示'}</span>
              {showTemplates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* 反映完了通知 */}
          {templateNotice && (
            <div className="mt-2.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-emerald-200 animate-in fade-in duration-200">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{templateNotice}</span>
            </div>
          )}

          {/* 開閉式コンテンツ */}
          {showTemplates && (
            <div className="mt-3 pt-3 border-t border-amber-200/80 space-y-2.5 animate-in fade-in-50 duration-150">
              {/* カテゴリ切り替えボタン群 */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {[
                  { id: 'all', label: `すべて (${PRESET_TEMPLATES.length})` },
                  { id: '転倒・転落', label: '転倒・転落' },
                  { id: '意識消失・便ショック', label: '便ショック・意識消失' },
                  { id: '誤嚥・むせ・誤食', label: '誤嚥・むせ・誤食' },
                  { id: '行動障害・徘徊', label: '行動障害・徘徊' },
                  { id: '服薬関連', label: '服薬トラブル' },
                  { id: '入浴・皮膚トラブル', label: '入浴・皮膚トラブル' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedTemplateFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                      selectedTemplateFilter === f.id
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* 例文カードグリッド */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-88 overflow-y-auto pr-0.5">
                {PRESET_TEMPLATES.filter(
                  (t) => selectedTemplateFilter === 'all' || t.category === selectedTemplateFilter
                ).map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyQuickTemplate(tpl)}
                    className="p-2.5 bg-white rounded-xl border border-amber-200/90 hover:border-amber-400 hover:bg-amber-50/50 text-left transition-all shadow-2xs group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          {tpl.badge}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {tpl.loc}・{tpl.slot}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-amber-800 line-clamp-1 mb-1">
                        {tpl.title}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {tpl.desc}
                      </p>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-amber-700 font-semibold">
                      <span>タップして反映</span>
                      <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CARD 2: 発生状況 (「意識消失・便ショック」追加) */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">
              2. 発生状況（まずは項目選択 ＋ 下に状況を入力）
            </h2>
          </div>

          <div className="space-y-3">
            {/* 状況カテゴリ */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                状況の分類（タップ選択）
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {SITUATION_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSituationCategory(cat)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                      situationCategory === cat
                        ? cat === '意識消失・便ショック'
                          ? 'bg-rose-600 text-white border-rose-700 shadow-xs scale-[1.02] font-black'
                          : 'bg-amber-500 text-white border-amber-600 shadow-xs scale-[1.02]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 状況の詳細入力 ＋ 音声入力 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  状況の詳細 <span className="text-red-500">*必須</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {situationDescription ? (
                    <button
                      type="button"
                      onClick={() => setSituationDescription('')}
                      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      title="内容をクリア"
                    >
                      <X className="w-3 h-3 text-slate-400" />
                      <span>クリア</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleVoice('situation', situationDescription, setSituationDescription)
                    }
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors ${
                      activeSpeechField === 'situation' && isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Mic className="w-3 h-3 text-slate-500" />
                    <span>
                      {activeSpeechField === 'situation' && isListening ? '録音中...' : '音声'}
                    </span>
                  </button>
                </div>
              </div>

              <textarea
                rows={3}
                value={situationDescription}
                onChange={(e) => setSituationDescription(e.target.value)}
                placeholder="いつ、どこで、誰が、何をしていてどうなったかを簡潔に入力（右上のマイクボタンを押すと声で入力できます）"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-xs sm:text-sm leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                ※ 音声入力ボタンを押して話すと、そのまま文章が追記されます
              </p>
            </div>
          </div>
        </div>

        {/* CARD 3: 要因３項目（人・もの・環境）分離型
            ユーザー指定：
            ①本人・職員要因は全て残す。
            ②物的要因：例だけ薄く表示し、入力boxで任意のものを入力してもらう（範囲が広く多すぎる）※「靴サイズの不適合・足踏み」と「歩行器・杖の不具合」はボタン表示する。
            ③環境：例だけ薄く表示し、入力boxで任意のものを入力してもらう（範囲が広く多すぎる）「マニュアルの不備」「坂道・段差」「見守り時間外」「雨天」「導線混雑時」
        */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm sm:text-base">
                3. 要因の3分類（チェック ＋ 手入力）
              </h2>
              <p className="text-[11px] text-slate-500">
                個人の不注意に偏らず、物的設備や環境・ルールにも目を向けるフォーマット
              </p>
            </div>
          </div>

          {/* ① 本人・職員要因: 全て残す */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black">
                  1
                </span>
                本人・職員要因
              </span>
              <div className="flex items-center gap-1.5">
                {personalDetail ? (
                  <button
                    type="button"
                    onClick={() => setPersonalDetail('')}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="入力内容をクリア"
                  >
                    <X className="w-3 h-3 text-slate-400" />
                    <span>クリア</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    handleToggleVoice('factorPersonal', personalDetail, setPersonalDetail)
                  }
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                    activeSpeechField === 'factorPersonal' && isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  <Mic className="w-3 h-3" />
                  <span>音声</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              例：体調不良、焦り、確認漏れ、思い込み、不穏・認知症状、コール対応中など
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {PERSONAL_FACTOR_SUGGESTIONS.map((tag) => {
                const checked = personalTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(personalTags, setPersonalTags, tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      checked
                        ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {checked && <Check className="w-3 h-3 inline mr-1" />}
                    {tag}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={personalDetail}
              onChange={(e) => setPersonalDetail(e.target.value)}
              placeholder="本人・職員要因の補足・詳細を入力"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs placeholder:text-slate-400"
            />
          </div>

          {/* ② 物的要因: 例だけ薄く表示し、入力boxで任意のものを入力してもらう
              ※「靴サイズの不適合・足踏み」と「歩行器・杖の不具合」はボタン表示する。 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black">
                  2
                </span>
                物的・設備要因
              </span>
              <div className="flex items-center gap-1.5">
                {materialDetail ? (
                  <button
                    type="button"
                    onClick={() => setMaterialDetail('')}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="入力内容をクリア"
                  >
                    <X className="w-3 h-3 text-slate-400" />
                    <span>クリア</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    handleToggleVoice('factorMaterial', materialDetail, setMaterialDetail)
                  }
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                    activeSpeechField === 'factorMaterial' && isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  <Mic className="w-3 h-3" />
                  <span>音声</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              例：車椅子の整備不良、タイヤ空気圧、ブレーキ緩み、照明の薄暗さ、手すりの高さなど
            </p>
            {/* ボタン表示（指定の2項目） */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {MATERIAL_FACTOR_SUGGESTIONS.map((tag) => {
                const checked = materialTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(materialTags, setMaterialTags, tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      checked
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {checked && <Check className="w-3 h-3 inline mr-1" />}
                    {tag}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={materialDetail}
              onChange={(e) => setMaterialDetail(e.target.value)}
              placeholder="物的・設備要因を入力（例: 車椅子のブレーキの緩み、スリッパの引っかかり等）"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs placeholder:text-slate-400"
            />
          </div>

          {/* ③ 環境・運用要因: 例だけ薄く表示し、入力boxで任意のものを入力してもらう
              「マニュアルの不備」「坂道・段差」「見守り時間外」「雨天」「導線混雑時」 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-violet-500 text-white flex items-center justify-center text-[10px] font-black">
                  3
                </span>
                環境・運用要因
              </span>
              <div className="flex items-center gap-1.5">
                {environmentalDetail ? (
                  <button
                    type="button"
                    onClick={() => setEnvironmentalDetail('')}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="入力内容をクリア"
                  >
                    <X className="w-3 h-3 text-slate-400" />
                    <span>クリア</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    handleToggleVoice('factorEnv', environmentalDetail, setEnvironmentalDetail)
                  }
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                    activeSpeechField === 'factorEnv' && isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  <Mic className="w-3 h-3" />
                  <span>音声</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              例：床の濡れ・ワックス、マットセンサー位置、ドアの死角、連絡ノート記入漏れなど
            </p>
            {/* ボタン表示（指定の5項目） */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {ENVIRONMENTAL_FACTOR_SUGGESTIONS.map((tag) => {
                const checked = environmentalTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(environmentalTags, setEnvironmentalTags, tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      checked
                        ? 'bg-violet-600 text-white border-violet-700 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {checked && <Check className="w-3 h-3 inline mr-1" />}
                    {tag}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={environmentalDetail}
              onChange={(e) => setEnvironmentalDetail(e.target.value)}
              placeholder="環境・運用要因を入力（例: 食堂中央の通路が狭い、雨天で濡れていた等）"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* CARD 4: 応急処置・再発防止策・報告者 */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3.5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">
              4. 処置・予防策・報告者
            </h2>
          </div>

          {/* 応急処置・直後の対応 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                応急処置・直後の対応
              </label>
              <div className="flex items-center gap-1.5">
                {emergencyResponse ? (
                  <button
                    type="button"
                    onClick={() => setEmergencyResponse('')}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="入力内容をクリア"
                  >
                    <X className="w-3 h-3 text-slate-400" />
                    <span>クリア</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    handleToggleVoice('response', emergencyResponse, setEmergencyResponse)
                  }
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                    activeSpeechField === 'response' && isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <Mic className="w-3 h-3" />
                  <span>音声</span>
                </button>
              </div>
            </div>
            <input
              type="text"
              value={emergencyResponse}
              onChange={(e) => setEmergencyResponse(e.target.value)}
              placeholder="例：バイタル測定（異常なし）、両脇を支えて椅子へ誘導、看護師へ報告"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          {/* 再発防止策・改善提案 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                再発防止策・現場からの改善提案
              </label>
              <div className="flex items-center gap-1.5">
                {preventiveMeasures ? (
                  <button
                    type="button"
                    onClick={() => setPreventiveMeasures('')}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="入力内容をクリア"
                  >
                    <X className="w-3 h-3 text-slate-400" />
                    <span>クリア</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    handleToggleVoice('prev', preventiveMeasures, setPreventiveMeasures)
                  }
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                    activeSpeechField === 'prev' && isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <Mic className="w-3 h-3" />
                  <span>音声</span>
                </button>
              </div>
            </div>
            <textarea
              rows={2}
              value={preventiveMeasures}
              onChange={(e) => setPreventiveMeasures(e.target.value)}
              placeholder="例：車椅子のブレーキワイヤー調整を実施、排便時の水分摂取プラン見直しなど"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs leading-relaxed"
            />
          </div>

          {/* 報告者氏名 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              報告者（職員氏名）
            </label>
            <div className="relative">
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="例：介護職員 佐藤"
                className="w-full px-3 py-2 pr-8 rounded-xl border border-slate-300 text-xs"
              />
              {reporterName ? (
                <button
                  type="button"
                  onClick={() => setReporterName('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 p-0.5 transition-colors cursor-pointer"
                  title="氏名を消去"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Floating Voice Indicator when listening */}
        {isListening && (
          <div className="sticky bottom-20 z-30 mx-auto max-w-sm bg-red-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-bounce">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 animate-pulse" />
              <div className="text-xs font-bold">
                音声を聞き取っています...（お話しください）
              </div>
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="px-3 py-1 bg-white text-red-600 rounded-lg text-xs font-bold shrink-0 hover:bg-red-50"
            >
              停止
            </button>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
              reportType === 'accident'
                ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-rose-200'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-orange-200'
            }`}
          >
            {isSubmitting ? (
              <span>送信処理中...</span>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>
                  {reportType === 'accident' ? '事故報告書を提出する' : 'ヒヤリハット報告を送信する'}
                </span>
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-slate-400 mt-2">
            ※ 送信するとクラウドへリアルタイム同期され、管理者画面で集計・印刷が可能です
          </p>
        </div>
      </form>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 border-2 border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              報告を受け付けました！
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              クラウドに即時同期されました。事故防止のための貴重な共有ありがとうございます。
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md shadow-amber-200"
              >
                続けて次の報告を入力する
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  onViewList();
                }}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                直近の報告一覧を見る
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
