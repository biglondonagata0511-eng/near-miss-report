export type ReportType = 'hiyari' | 'accident';

export type Gender = 'male' | 'female';

export type CareLevel = 
  | '自立' 
  | '要支援1' 
  | '要支援2' 
  | '要介護1' 
  | '要介護2' 
  | '要介護3' 
  | '要介護4' 
  | '要介護5' 
  | '未設定';

export type ReportStatus = 'submitted' | 'reviewing' | 'resolved';

export type SeverityLevel = 'level0' | 'level1' | 'level2' | 'level3';

// 登録利用者マスター (Resident Profile)
export interface Resident {
  id: string;
  name: string; // 氏名 (例: 山田 太郎)
  kana?: string; // フリガナ (例: ヤマダ タロウ)
  roomNumber?: string; // 居室番号 (例: 201号室)
  gender: Gender; // 性別 (女性/男性)
  birthDate: string; // 生年月日 (YYYY-MM-DD)
  age?: number; // 計算された年齢
  careLevel: CareLevel; // 要介護度
  notes?: string; // 備考
}

export interface Report {
  id: string;
  type: ReportType; // ヒヤリハット or 事故
  residentName: string; // 利用者氏名
  gender?: Gender; // 性別 (女性/男性)
  birthDate?: string; // 生年月日 (YYYY-MM-DD)
  age?: number | null; // 年齢 (空欄可)
  careLevel?: CareLevel; // 要介護度
  roomNumber?: string; // 居室番号 (任意)
  reportDate: string; // 報告日 (YYYY-MM-DD)
  dayOfWeek: string; // 曜日 (月, 火, 水, 木, 金, 土, 日)
  occurrenceDate: string; // 発生・発見日 (YYYY-MM-DD)
  occurrenceTimeOnly?: string; // 手入力の時刻 (例: 14:25)
  occurrenceTimeSlot: string; // 時間帯 (朝食前後、午前中、昼食前後、午後、夕方、夕食前後、就寝前、夜中、早朝)
  occurrenceTime: string; // 全体表示用 (例: 14:25 [昼食前後])
  location: string; // 居室内、廊下、食堂、デイサービス、屋外、トイレ、浴室、その他
  locationDetail?: string; // 場所の詳細
  situationCategory: string; // 転倒・転落、誤嚥・むせ、意識消失・便ショック等
  situationDescription: string; // 発生状況（詳細）
  
  // 要因3項目（人・もの・環境）分離型
  factorsPersonalTags: string[]; // 1. 本人・職員要因タグ
  factorsPersonal: string; // 1. 本人・職員要因詳細
  factorsMaterialTags: string[]; // 2. 物的・設備要因タグ (ボタン表示用)
  factorsMaterial: string; // 2. 物的・設備要因詳細 (手入力box)
  factorsEnvironmentalTags: string[]; // 3. 環境・運用要因タグ (ボタン表示用)
  factorsEnvironmental: string; // 3. 環境・運用要因詳細 (手入力box)
  
  emergencyResponse: string; // 応急処置・直後の対応
  preventiveMeasures: string; // 再発防止策・改善提案
  reporterName: string; // 報告者氏名
  supervisorComment?: string; // 管理者・責任者コメント
  supervisorConfirmed?: boolean; // 管理者確認済フラグ
  status: ReportStatus; // 提出済, 確認中, 対策完了
  severity: SeverityLevel; // 重大度レベル
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// 発生場所: トイレ・脱衣所→トイレのみへ、機能訓練室・送迎車は削除
export const LOCATION_OPTIONS = [
  '居室内',
  '廊下',
  '食堂',
  'デイサービスフロア',
  '屋外',
  'トイレ',
  '浴室',
  'その他',
] as const;

// 発生状況より：「意識消失・便ショック」を追加
export const SITUATION_CATEGORIES = [
  '転倒・転落',
  '誤嚥・むせ・誤食',
  '服薬トラブル',
  '離設・徘徊・無断外出',
  '皮膚剥離・打撲・外傷',
  '意識消失・便ショック',
  '器物破損',
  '介助動作・移乗時',
  '利用者間トラブル',
  'その他',
] as const;

// 時間帯の選択肢: 朝食前後、午前中、昼食前後、午後、夕方、夕食前後、就寝前、夜中、早朝
export const TIME_SLOTS = [
  '朝食前後',
  '午前中',
  '昼食前後',
  '午後',
  '夕方',
  '夕食前後',
  '就寝前',
  '夜中',
  '早朝',
] as const;

// ① 本人・職員要因: 全て残す
export const PERSONAL_FACTOR_SUGGESTIONS = [
  '体調不良・倦怠感',
  '焦り・慌ただしさ',
  '確認漏れ・思い込み',
  '不穏・認知症状',
  'コール対応中',
  '人手不足・見守り困難',
  '身体機能の急変・ふらつき',
  '介助手順の自己流化',
  '職員間の申し送り不足',
] as const;

// ② 物的要因: 例だけ薄く表示し、手入力メイン。ボタン表示は「靴サイズの不適合・足踏み」「歩行器・杖の不具合」のみ
export const MATERIAL_FACTOR_SUGGESTIONS = [
  '靴サイズの不適合・足踏み',
  '歩行器・杖の不具合',
] as const;

// ③ 環境・運用要因: 例だけ薄く表示し、手入力メイン。ボタン表示は指定された5項目のみ
export const ENVIRONMENTAL_FACTOR_SUGGESTIONS = [
  'マニュアルの不備',
  '坂道・段差',
  '見守り時間外',
  '雨天',
  '導線混雑時',
] as const;

export const CARE_LEVEL_OPTIONS: CareLevel[] = [
  '未設定',
  '自立',
  '要支援1',
  '要支援2',
  '要介護1',
  '要介護2',
  '要介護3',
  '要介護4',
  '要介護5',
];
