import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  limit,
  getDocs
} from 'firebase/firestore';
import { db, reportsCollection, initAuth } from './firebase';
import { Report, Resident } from '../types/report';
import { INITIAL_SAMPLE_REPORTS, LEGACY_DUMMY_REPORT_IDS } from './mockData';
import { INITIAL_RESIDENTS, LEGACY_DUMMY_RESIDENT_IDS } from './mockResidents';

const LOCAL_STORAGE_REPORTS_KEY = 'hiyari_reports_data_v2';
const LOCAL_STORAGE_RESIDENTS_KEY = 'hiyari_residents_data_v2';
const ADMIN_PASSWORD_KEY = 'hiyari_admin_password_v1';
const DEFAULT_PASSWORD = '1234';

// Rate limiter / Deduplication guard to protect Firestore free tier (50,000 quota limit)
const recentSaves = new Map<string, number>();

export const residentsCollection = collection(db, 'residents');

/**
 * Remove undefined values before sending to Firestore.
 * Firestore throws "Unsupported field value: undefined" if undefined is present!
 */
export function sanitizeForFirestore<T>(data: T): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item));
  }
  if (typeof data === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value === undefined) {
        clean[key] = null;
      } else if (value !== null && typeof value === 'object') {
        clean[key] = sanitizeForFirestore(value);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }
  return data;
}

/**
 * Check if a report is a legacy dummy/demo report that should be excluded and cleaned up
 */
export function isLegacyDummyReport(r: Partial<Report>): boolean {
  if (!r) return false;
  if (r.id && (
    LEGACY_DUMMY_REPORT_IDS.includes(r.id) || 
    r.id.startsWith('report-demo-') || 
    r.id.startsWith('demo-')
  )) {
    return true;
  }
  // Check for dummy seed content from initial templates
  const dummyNames = ['山田 太郎', '田中 トメ', '佐藤 治', '鈴木 花子', '高橋 誠'];
  if (r.residentName && dummyNames.includes(r.residentName)) {
    const desc = r.situationDescription || '';
    if (
      desc.includes('車椅子から立ち上がろうとしてバランスを崩しそうになった') ||
      desc.includes('食堂で食事中、むせ込みあり') ||
      desc.includes('ベッドから車椅子への移乗時に足元がもつれ') ||
      desc.includes('夜間、自室トイレに向かう際にポータブルトイレの足に躓きそうになった')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a resident is a legacy dummy/demo resident that should be excluded and cleaned up
 */
export function isLegacyDummyResident(r: Partial<Resident>): boolean {
  if (!r) return false;
  if (r.id && (
    LEGACY_DUMMY_RESIDENT_IDS.includes(r.id) ||
    r.id.startsWith('res-00') ||
    r.id === 'res-010'
  )) {
    return true;
  }
  const dummyNames = [
    '山田 太郎', '佐藤 一郎', '鈴木 花子', '田中 トメ', '渡辺 健一',
    '伊藤 照子', '中村 正', '小林 幸子', '加藤 浩', '吉田 キヨ'
  ];
  if (r.name && dummyNames.includes(r.name)) {
    if (r.notes?.includes('自力歩行可能') || r.notes?.includes('見守り要') || r.roomNumber === '201') {
      return true;
    }
  }
  return false;
}

// ================= REPORTS HELPERS =================
export function getLocalReports(): Report[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    if (!raw) {
      return [];
    }
    const parsed: Report[] = JSON.parse(raw);
    const cleaned = parsed.filter((r) => !isLegacyDummyReport(r));
    if (cleaned.length !== parsed.length) {
      saveLocalReports(cleaned);
    }
    return cleaned;
  } catch (e) {
    console.error('Failed to parse local reports', e);
    return [];
  }
}

export function saveLocalReports(reports: Report[]) {
  try {
    const filtered = reports.filter((r) => !isLegacyDummyReport(r));
    localStorage.setItem(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save to local storage', e);
  }
}

// ================= RESIDENTS (利用者マスター) HELPERS =================
export function getLocalResidents(): Resident[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RESIDENTS_KEY);
    if (!raw) {
      return [];
    }
    const parsed: Resident[] = JSON.parse(raw);
    const cleaned = parsed.filter((r) => !isLegacyDummyResident(r));
    if (cleaned.length !== parsed.length) {
      saveLocalResidents(cleaned);
    }
    return cleaned;
  } catch (e) {
    console.error('Failed to parse local residents', e);
    return [];
  }
}

export function saveLocalResidents(residents: Resident[]) {
  try {
    const filtered = residents.filter((r) => !isLegacyDummyResident(r));
    localStorage.setItem(LOCAL_STORAGE_RESIDENTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save residents to local storage', e);
  }
}

/**
 * Real-time listener for Residents collection.
 * 無料枠保護のため、自動シード書き込みループは行わず、リスナーは1つに制限します。
 */
export function subscribeResidents(callback: (residents: Resident[]) => void): () => void {
  // 1. まずローカルのキャッシュを即時反映（表示の瞬発性を確保）
  const cached = getLocalResidents();
  callback(cached);

  let unsubscribe = () => {};

  (async () => {
    try {
      await initAuth();
      const q = query(residentsCollection, limit(300));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: Resident[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Resident;
            const res = { ...data, id: docSnap.id };
            // もし過去のダミー利用者が残っていればFirestoreからも削除
            if (isLegacyDummyResident(res)) {
              deleteDoc(doc(db, 'residents', docSnap.id)).catch(() => {});
              return;
            }
            list.push(res);
          });
          list.sort((a, b) => (a.kana || a.name || '').localeCompare(b.kana || b.name || '', 'ja'));
          saveLocalResidents(list);
          callback(list);
        },
        (error) => {
          console.warn('Residents snapshot fallback to local:', error.message);
          callback(getLocalResidents());
        }
      );
    } catch (err) {
      console.warn('Residents subscription failed:', err);
      callback(getLocalResidents());
    }
  })();

  return () => {
    unsubscribe();
  };
}

/**
 * Save or update single Resident
 */
export async function saveResident(resident: Resident): Promise<boolean> {
  try {
    const current = getLocalResidents();
    const idx = current.findIndex((r) => r.id === resident.id);
    let updated: Resident[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = resident;
    } else {
      updated = [resident, ...current];
    }
    saveLocalResidents(updated);

    try {
      await initAuth();
      const sanitized = sanitizeForFirestore(resident);
      await setDoc(doc(db, 'residents', resident.id), sanitized);
    } catch (fsErr) {
      console.warn('Firestore resident write note:', fsErr);
    }
    return true;
  } catch (e) {
    console.error('Save resident failed', e);
    return false;
  }
}

/**
 * Delete a resident
 */
export async function deleteResident(residentId: string): Promise<boolean> {
  try {
    const current = getLocalResidents();
    const updated = current.filter((r) => r.id !== residentId);
    saveLocalResidents(updated);

    try {
      await initAuth();
      await deleteDoc(doc(db, 'residents', residentId));
    } catch (fsErr) {
      console.warn('Firestore delete resident note:', fsErr);
    }
    return true;
  } catch (e) {
    console.error('Delete resident failed', e);
    return false;
  }
}

/**
 * Bulk save / import residents (e.g. from pasted text or CSV)
 */
export async function bulkSaveResidents(newResidents: Resident[]): Promise<number> {
  const current = getLocalResidents();
  const map = new Map<string, Resident>();
  current.forEach((r) => map.set(r.name, r));
  newResidents.forEach((r) => map.set(r.name, r));
  const merged = Array.from(map.values());
  saveLocalResidents(merged);

  await initAuth();
  for (const r of newResidents) {
    const sanitized = sanitizeForFirestore(r);
    setDoc(doc(db, 'residents', r.id), sanitized).catch((err) =>
      console.warn('Bulk resident sync note:', err)
    );
  }
  return newResidents.length;
}

// ================= PASSWORD HELPERS =================
export function getAdminPassword(): string {
  return localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_PASSWORD;
}

export function setAdminPassword(newPass: string) {
  localStorage.setItem(ADMIN_PASSWORD_KEY, newPass);
}

export function verifyAdminPassword(input: string): boolean {
  return input === getAdminPassword();
}

/**
 * Real-time listener for reports.
 * 複数デバイス間のリアルタイム同期を実現します。
 * クライアント側で発生日時順にソートし、Firestoreの複合インデックス欠落による失敗を防止します。
 */
export function subscribeReports(callback: (reports: Report[]) => void): () => void {
  // 1. ローカルキャッシュを即時反映（通信遅延ゼロで前回のデータを即時表示）
  const cached = getLocalReports();
  callback(cached);

  let unsubscribeFirestore = () => {};

  (async () => {
    try {
      await initAuth();
      const q = query(reportsCollection, limit(300));
      
      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          const remoteReports: Report[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Report;
            const rep = { ...data, id: docSnap.id };
            // ダミー報告書がFirestoreに残っていた場合は自動消去してスキップ
            if (isLegacyDummyReport(rep)) {
              deleteDoc(doc(db, 'reports', docSnap.id)).catch(() => {});
              return;
            }
            remoteReports.push(rep);
          });

          // 発生日時・登録日時で降順（新しいものが先頭）にソート
          remoteReports.sort((a, b) => {
            const timeA = `${a.occurrenceDate || ''} ${a.occurrenceTimeOnly || ''}`.trim() || a.createdAt || '';
            const timeB = `${b.occurrenceDate || ''} ${b.occurrenceTimeOnly || ''}`.trim() || b.createdAt || '';
            return timeB.localeCompare(timeA);
          });

          saveLocalReports(remoteReports);
          callback(remoteReports);
        },
        (error) => {
          console.warn('Firestore snapshot error (using local cache mode):', error.message);
          callback(getLocalReports());
        }
      );
    } catch (err) {
      console.warn('Firestore subscription failed, falling back to local storage:', err);
      callback(getLocalReports());
    }
  })();

  return () => {
    unsubscribeFirestore();
  };
}

/**
 * Save / Add new report.
 * スマホやPCの全端末間で同期されるようFirestoreに保存します。
 * undefined項目をnullにサニタイズすることでFirestore保存エラーを確実に防ぎます。
 */
export async function saveReport(report: Report): Promise<{ success: boolean; error?: string }> {
  try {
    // 1.5秒以内の同一レポート連続保存をガード（二重タップ防止・Firestore無料枠保護）
    const now = Date.now();
    const lastSaved = recentSaves.get(report.id) || 0;
    if (now - lastSaved < 1500) {
      return { success: true };
    }
    recentSaves.set(report.id, now);

    // 1. ローカルキャッシュに即座に反映（オフライン・低速回線でもUIが即時更新）
    const current = getLocalReports();
    const existingIndex = current.findIndex((r) => r.id === report.id);
    let updated: Report[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = report;
    } else {
      updated = [report, ...current];
    }
    saveLocalReports(updated);

    // 2. 匿名認証の確認とデータの完全サニタイズ（undefinedの混入を絶対阻止）
    await initAuth();
    const sanitized = sanitizeForFirestore(report);

    // 3. Firestoreへ同期保存
    try {
      await setDoc(doc(db, 'reports', report.id), sanitized);
      console.log('[Firestore] Report successfully saved and synced across devices:', report.id);
    } catch (fsErr: any) {
      console.error('[Firestore] Error writing report to Firestore:', fsErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Save report failed:', err);
    return { success: false, error: err?.message || '保存に失敗しました' };
  }
}

/**
 * Delete report (supervisor only)
 */
export async function deleteReport(reportId: string): Promise<boolean> {
  try {
    const current = getLocalReports();
    const updated = current.filter((r) => r.id !== reportId);
    saveLocalReports(updated);

    try {
      await initAuth();
      await deleteDoc(doc(db, 'reports', reportId));
    } catch (fsErr) {
      console.warn('Firestore delete note:', fsErr);
    }
    return true;
  } catch (err) {
    console.error('Delete failed', err);
    return false;
  }
}

/**
 * 利用者マスターを完全にクリア（ダミーおよび全利用者データの削除）
 */
export async function clearAllResidents(): Promise<boolean> {
  try {
    const current = getLocalResidents();
    saveLocalResidents([]);
    await initAuth();
    for (const r of current) {
      deleteDoc(doc(db, 'residents', r.id)).catch(() => {});
    }
    for (const dummyId of LEGACY_DUMMY_RESIDENT_IDS) {
      deleteDoc(doc(db, 'residents', dummyId)).catch(() => {});
    }
    return true;
  } catch (e) {
    console.error('Failed to clear residents', e);
    return false;
  }
}

/**
 * 報告書データを全クリア（本番運用リセット用）
 */
export async function clearAllReports(): Promise<boolean> {
  try {
    const current = getLocalReports();
    saveLocalReports([]);
    await initAuth();
    for (const r of current) {
      deleteDoc(doc(db, 'reports', r.id)).catch(() => {});
    }
    return true;
  } catch (e) {
    console.error('Failed to clear reports', e);
    return false;
  }
}

/**
 * 過去のダミー報告書・ダミー利用者マスターをFirestoreおよびローカルから完全消去
 */
export async function cleanUpAllLegacyDummyData(): Promise<{ reportsRemoved: number; residentsRemoved: number }> {
  let reportsRemoved = 0;
  let residentsRemoved = 0;

  try {
    await initAuth();

    // 1. ローカルのダミー報告書・ダミー利用者を除去
    const localReps = getLocalReports();
    saveLocalReports(localReps);
    const localRes = getLocalResidents();
    saveLocalResidents(localRes);

    // 2. Firestoreのダミー利用者を削除
    try {
      const resSnapshot = await getDocs(query(residentsCollection, limit(100)));
      for (const d of resSnapshot.docs) {
        const data = d.data() as Resident;
        if (isLegacyDummyResident({ ...data, id: d.id })) {
          await deleteDoc(doc(db, 'residents', d.id));
          residentsRemoved++;
        }
      }
    } catch (e) {
      console.warn('Dummy residents cleanup note:', e);
    }

    // 3. Firestoreのダミー報告書を削除
    try {
      const repSnapshot = await getDocs(query(reportsCollection, limit(100)));
      for (const d of repSnapshot.docs) {
        const data = d.data() as Report;
        if (isLegacyDummyReport({ ...data, id: d.id })) {
          await deleteDoc(doc(db, 'reports', d.id));
          reportsRemoved++;
        }
      }
    } catch (e) {
      console.warn('Dummy reports cleanup note:', e);
    }
  } catch (err) {
    console.warn('Clean up dummy data error:', err);
  }

  return { reportsRemoved, residentsRemoved };
}

/**
 * Export data to JSON file
 */
export function exportReportsAsJSON(reports: Report[], residents?: Resident[]) {
  const payload = {
    reports,
    residents: residents || getLocalResidents(),
    exportedAt: new Date().toISOString(),
  };
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(payload, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `介護ヒヤリハット報告・利用者マスター_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Export data to CSV file
 */
export function exportReportsAsCSV(reports: Report[]) {
  const headers = [
    '管理ID',
    '種別',
    '報告日',
    '曜日',
    '発生日',
    '発生時刻',
    '時間帯',
    '利用者氏名',
    '部屋番号',
    '性別',
    '年齢',
    '要介護度',
    '発生場所',
    '詳細場所',
    '事故/ヒヤリ種別',
    '状況詳細',
    '要因1(本人職員)',
    '要因1タグ',
    '要因2(物的設備)',
    '要因2タグ',
    '要因3(環境運用)',
    '要因3タグ',
    '応急処置',
    '再発防止策',
    '報告者',
    '管理者確認',
    '管理者コメント',
    '状態',
    '重要度'
  ];

  const rows = reports.map((r) => [
    `"${r.id}"`,
    `"${r.type === 'accident' ? '事故' : 'ヒヤリハット'}"`,
    `"${r.reportDate}"`,
    `"${r.dayOfWeek}"`,
    `"${r.occurrenceDate}"`,
    `"${r.occurrenceTimeOnly || ''}"`,
    `"${r.occurrenceTimeSlot || ''}"`,
    `"${r.residentName}"`,
    `"${r.roomNumber || ''}"`,
    `"${r.gender === 'male' ? '男性' : '女性'}"`,
    `"${r.age !== null && r.age !== undefined ? r.age : ''}"`,
    `"${r.careLevel || ''}"`,
    `"${r.location}"`,
    `"${(r.locationDetail || '').replace(/"/g, '""')}"`,
    `"${r.situationCategory}"`,
    `"${(r.situationDescription || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    `"${(r.factorsPersonal || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    `"${(r.factorsPersonalTags || []).join('; ')}"`,
    `"${(r.factorsMaterial || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    `"${(r.factorsMaterialTags || []).join('; ')}"`,
    `"${(r.factorsEnvironmental || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    `"${(r.factorsEnvironmentalTags || []).join('; ')}"`,
    `"${(r.emergencyResponse || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    `"${(r.preventiveMeasures || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    `"${r.reporterName}"`,
    `"${r.supervisorConfirmed ? '確認済' : '未確認'}"`,
    `"${(r.supervisorComment || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    `"${r.status === 'resolved' ? '対策完了' : r.status === 'reviewing' ? '確認中' : '提出済'}"`,
    `"${r.severity}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', `介護ヒヤリハット一覧_${dateStr}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Import reports & residents from JSON
 */
export async function importReportsFromJSON(file: File): Promise<{ success: boolean; count: number; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        let validReports: Report[] = [];
        let validResidents: Resident[] = [];

        if (Array.isArray(data)) {
          validReports = data;
        } else if (data && typeof data === 'object') {
          if (Array.isArray(data.reports)) {
            validReports = data.reports;
          }
          if (Array.isArray(data.residents)) {
            validResidents = data.residents;
          }
        }

        if (validReports.length === 0 && validResidents.length === 0) {
          resolve({ success: false, count: 0, error: '有効な報告書または利用者データが見つかりませんでした。' });
          return;
        }

        await initAuth();

        if (validReports.length > 0) {
          const currentReps = getLocalReports();
          const map = new Map<string, Report>();
          currentReps.forEach((r) => map.set(r.id, r));
          validReports.forEach((r) => map.set(r.id, r));
          const merged = Array.from(map.values());
          saveLocalReports(merged);

          for (const item of validReports) {
            const clean = sanitizeForFirestore(item);
            setDoc(doc(db, 'reports', item.id), clean).catch((err) =>
              console.warn('Import Report sync note:', err)
            );
          }
        }

        if (validResidents.length > 0) {
          const currentRes = getLocalResidents();
          const mapRes = new Map<string, Resident>();
          currentRes.forEach((r) => mapRes.set(r.name, r));
          validResidents.forEach((r) => mapRes.set(r.name, r));
          const mergedRes = Array.from(mapRes.values());
          saveLocalResidents(mergedRes);

          for (const item of validResidents) {
            const clean = sanitizeForFirestore(item);
            setDoc(doc(db, 'residents', item.id), clean).catch((err) =>
              console.warn('Import Resident sync note:', err)
            );
          }
        }

        resolve({ success: true, count: validReports.length + validResidents.length });
      } catch (err: any) {
        resolve({ success: false, count: 0, error: err?.message || 'ファイルの読み込みに失敗しました。' });
      }
    };
    reader.onerror = () => {
      resolve({ success: false, count: 0, error: 'ファイルの読み込みエラー' });
    };
    reader.readAsText(file);
  });
}
