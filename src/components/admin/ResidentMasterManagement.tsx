import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit3, 
  ClipboardPaste, 
  Search, 
  Check, 
  AlertCircle, 
  HelpCircle,
  Save,
  Download
} from 'lucide-react';
import { Resident, Gender, CareLevel, CARE_LEVEL_OPTIONS } from '../../types/report';
import { calculateAgeFromBirthDate } from '../../lib/dateUtils';
import { bulkSaveResidents, saveResident, deleteResident } from '../../lib/storage';

interface ResidentMasterManagementProps {
  residents: Resident[];
  onDataChanged: () => void;
}

export const ResidentMasterManagement: React.FC<ResidentMasterManagementProps> = ({
  residents,
  onDataChanged,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingSingle, setIsAddingSingle] = useState(false);
  const [isPastingBulk, setIsPastingBulk] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);

  // Form states for single entry
  const [formName, setFormName] = useState('');
  const [formKana, setFormKana] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [formGender, setFormGender] = useState<Gender>('female');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formCareLevel, setFormCareLevel] = useState<CareLevel>('要介護2');
  const [formNotes, setFormNotes] = useState('');

  // Bulk paste text state
  const [pasteText, setPasteText] = useState('');
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Filter residents
  const filtered = residents.filter((r) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.kana && r.kana.toLowerCase().includes(q)) ||
      (r.roomNumber && r.roomNumber.toLowerCase().includes(q)) ||
      (r.careLevel && r.careLevel.toLowerCase().includes(q))
    );
  });

  // Handle single resident save
  const handleSaveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const age = formBirthDate ? calculateAgeFromBirthDate(formBirthDate) || undefined : undefined;

    const residentToSave: Resident = {
      id: editingResident ? editingResident.id : `res-${Date.now()}`,
      name: formName.trim(),
      kana: formKana.trim() || undefined,
      roomNumber: formRoom.trim() || undefined,
      gender: formGender,
      birthDate: formBirthDate.trim(),
      age,
      careLevel: formCareLevel,
      notes: formNotes.trim() || undefined,
    };

    await saveResident(residentToSave);
    onDataChanged();
    setIsAddingSingle(false);
    setEditingResident(null);
    resetForm();
  };

  const resetForm = () => {
    setFormName('');
    setFormKana('');
    setFormRoom('');
    setFormGender('female');
    setFormBirthDate('');
    setFormCareLevel('要介護2');
    setFormNotes('');
  };

  const handleEditClick = (res: Resident) => {
    setEditingResident(res);
    setFormName(res.name);
    setFormKana(res.kana || '');
    setFormRoom(res.roomNumber || '');
    setFormGender(res.gender || 'female');
    setFormBirthDate(res.birthDate || '');
    setFormCareLevel(res.careLevel || '要介護2');
    setFormNotes(res.notes || '');
    setIsAddingSingle(true);
  };

  const handleDeleteClick = async (resId: string, name: string) => {
    if (window.confirm(`「${name}」様の登録データを削除しますか？`)) {
      await deleteResident(resId);
      onDataChanged();
    }
  };

  /**
   * Handle Bulk Parse & Import from pasted Excel text
   * Format supports:
   * 氏名 [タブ or カンマ] 生年月日 [タブ or カンマ] 要介護度 [タブ or カンマ] 部屋番号 [タブ or カンマ] 性別
   * Also flexibly matches names, dates like 1938/04/15 or 1938-04-15
   */
  const handleProcessBulkPaste = async () => {
    if (!pasteText.trim()) {
      setBulkError('テキストが入力されていません。');
      return;
    }

    setBulkError(null);
    setBulkStatus(null);

    const lines = pasteText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const parsedList: Resident[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip header lines like "氏名\t生年月日\t要介護度"
      if (line.includes('氏名') && (line.includes('生年月日') || line.includes('介護'))) {
        continue;
      }

      // Split by tab or comma
      const parts = line.split(/[\t,]/).map((p) => p.trim());
      if (parts.length >= 1 && parts[0]) {
        const name = parts[0];
        let birthDate = '';
        let careLevel: CareLevel = '要介護2';
        let roomNumber = '';
        let gender: Gender = 'female';

        // Check each part
        for (let pIdx = 1; pIdx < parts.length; pIdx++) {
          const val = parts[pIdx];
          // Check for date (e.g. 1938/04/15 or 1938-04-15)
          if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(val)) {
            birthDate = val.replace(/\//g, '-').replace(/\./g, '-');
          } else if (CARE_LEVEL_OPTIONS.includes(val as any)) {
            careLevel = val as CareLevel;
          } else if (val === '男' || val === '男性' || val === 'male') {
            gender = 'male';
          } else if (val === '女' || val === '女性' || val === 'female') {
            gender = 'female';
          } else if (val.includes('号') || /^\d{3,4}$/.test(val)) {
            roomNumber = val.includes('号') ? val : `${val}号室`;
          }
        }

        const age = birthDate ? calculateAgeFromBirthDate(birthDate) || undefined : undefined;

        parsedList.push({
          id: `res-paste-${Date.now()}-${i}`,
          name,
          birthDate,
          age,
          careLevel,
          roomNumber,
          gender,
        });
      }
    }

    if (parsedList.length === 0) {
      setBulkError('解析可能なデータが見つかりませんでした。形式をご確認ください。');
      return;
    }

    const count = await bulkSaveResidents(parsedList);
    setBulkStatus(`${count}件の利用者データを正常に取り込みました！`);
    onDataChanged();
    setPasteText('');
    setTimeout(() => {
      setIsPastingBulk(false);
      setBulkStatus(null);
    }, 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 sm:p-5 space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
              登録利用者マスター（生年月日・要介護度・居室管理）
            </h3>
            <p className="text-xs text-slate-500">
              ここで登録しておくと、スマホ入力時に名前の予測表示と年齢・介護度が自動反映されます
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsPastingBulk(!isPastingBulk);
              setIsAddingSingle(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-xs"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-amber-400" />
            <span>Excelコピペ一括登録</span>
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setEditingResident(null);
              setIsAddingSingle(!isAddingSingle);
              setIsPastingBulk(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>新規個別登録</span>
          </button>
        </div>
      </div>

      {/* Excel Copy & Paste Section */}
      {isPastingBulk && (
        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
              <ClipboardPaste className="w-4 h-4 text-amber-600" />
              Excelまたはスプレッドシートからコピー＆ペーストで一括登録
            </span>
            <button
              type="button"
              onClick={() => setIsPastingBulk(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              閉じる
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Excel上のセル（氏名、生年月日、要介護度、部屋番号、性別など）を選択してコピー（Ctrl+C）し、下の枠に貼り付け（Ctrl+V）してください。タブ区切りやカンマ区切りを自動判別して取り込みます。
          </p>

          <div className="bg-white p-2 rounded-xl border border-amber-200 text-[11px] text-slate-500">
            <strong>貼り付け例（タブまたはカンマ区切り）：</strong><br />
            山田 太郎	1945-05-12	要介護2	201号室	男性<br />
            鈴木 花子	1938-11-20	要介護3	205号室	女性
          </div>

          <textarea
            rows={5}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="ここにExcelデータを貼り付けてください..."
            className="w-full p-3 bg-white rounded-xl border border-amber-300 text-xs font-mono focus:ring-2 focus:ring-amber-500"
          />

          {bulkError && (
            <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{bulkError}</span>
            </div>
          )}

          {bulkStatus && (
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-1.5 font-bold">
              <Check className="w-4 h-4 shrink-0" />
              <span>{bulkStatus}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPastingBulk(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 bg-white"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleProcessBulkPaste}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-sm"
            >
              データを取り込んで一括登録
            </button>
          </div>
        </div>
      )}

      {/* Single Add / Edit Form */}
      {isAddingSingle && (
        <form onSubmit={handleSaveSingle} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-800">
              {editingResident ? `${editingResident.name} 様の情報を編集` : '新しい利用者を個別登録'}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsAddingSingle(false);
                setEditingResident(null);
              }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              閉じる
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                氏名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例: 山田 太郎"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                フリガナ (予測検索用)
              </label>
              <input
                type="text"
                value={formKana}
                onChange={(e) => setFormKana(e.target.value)}
                placeholder="例: ヤマダ タロウ"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                居室番号
              </label>
              <input
                type="text"
                value={formRoom}
                onChange={(e) => setFormRoom(e.target.value)}
                placeholder="例: 201号室"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                性別
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormGender('female')}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    formGender === 'female'
                      ? 'bg-rose-500 text-white border-rose-600'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  女性
                </button>
                <button
                  type="button"
                  onClick={() => setFormGender('male')}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    formGender === 'male'
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  男性
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                生年月日
              </label>
              <input
                type="date"
                value={formBirthDate}
                onChange={(e) => setFormBirthDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                要介護度
              </label>
              <select
                value={formCareLevel}
                onChange={(e) => setFormCareLevel(e.target.value as CareLevel)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
              >
                {CARE_LEVEL_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAddingSingle(false);
                setEditingResident(null);
              }}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 bg-white"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs"
            >
              {editingResident ? '更新内容を保存' : '登録する'}
            </button>
          </div>
        </form>
      )}

      {/* Search and Table */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="登録利用者を検索（氏名・居室）..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="text-xs font-bold text-slate-500">
          登録件数: <span className="text-slate-900 font-black">{residents.length}</span> 名
        </div>
      </div>

      {/* Residents Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-left text-xs text-slate-700 border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px]">
              <th className="py-2.5 px-3">氏名</th>
              <th className="py-2.5 px-3">居室</th>
              <th className="py-2.5 px-3">性別</th>
              <th className="py-2.5 px-3">年齢 / 生年月日</th>
              <th className="py-2.5 px-3">要介護度</th>
              <th className="py-2.5 px-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  該当する登録利用者は見つかりませんでした
                </td>
              </tr>
            ) : (
              filtered.map((res) => (
                <tr key={res.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 text-sm">{res.name} 様</span>
                    {res.kana && (
                      <span className="block text-[10px] text-slate-400">{res.kana}</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {res.roomNumber ? (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold font-meiryo-num text-xs sm:text-sm text-slate-800">
                        {res.roomNumber}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {res.gender === 'male' ? (
                      <span className="text-blue-700 font-bold">男性</span>
                    ) : (
                      <span className="text-rose-600 font-bold">女性</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold font-meiryo-num text-sm sm:text-base text-slate-900">
                      {res.age ? `${res.age} 歳` : '-'}
                    </div>
                    <div className="text-[11px] font-meiryo-num text-slate-500">{res.birthDate || '未登録'}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {res.careLevel}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditClick(res)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-slate-100"
                        title="編集"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(res.id, res.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
