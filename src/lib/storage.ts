import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit
} from 'firebase/firestore';
import { db, reportsCollection, initAuth } from './firebase';
import { Report, Resident } from '../types/report';
import { INITIAL_SAMPLE_REPORTS } from './mockData';
import { INITIAL_RESIDENTS } from './mockResidents';

const LOCAL_STORAGE_REPORTS_KEY = 'hiyari_reports_data_v2';
const LOCAL_STORAGE_RESIDENTS_KEY = 'hiyari_residents_data_v2';
const ADMIN_PASSWORD_KEY = 'hiyari_admin_password_v1';
const DEFAULT_PASSWORD = '1234';

export const residentsCollection = collection(db, 'residents');

// ================= REPORTS HELPERS =================
export function getLocalReports(): Report[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(INITIAL_SAMPLE_REPORTS));
      return INITIAL_SAMPLE_REPORTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse local reports', e);
    return INITIAL_SAMPLE_REPORTS;
  }
}

export function saveLocalReports(reports: Report[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(reports));
  } catch (e) {
    console.error('Failed to save to local storage', e);
  }
}

// ================= RESIDENTS (利用者マスター) HELPERS =================
export function getLocalResidents(): Resident[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RESIDENTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_RESIDENTS_KEY, JSON.stringify(INITIAL_RESIDENTS));
      return INITIAL_RESIDENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse local residents', e);
    return INITIAL_RESIDENTS;
  }
}

export function saveLocalResidents(residents: Resident[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_RESIDENTS_KEY, JSON.stringify(residents));
  } catch (e) {
    console.error('Failed to save residents to local storage', e);
  }
}

/**
 * Real-time listener for Residents collection
 */
export function subscribeResidents(callback: (residents: Resident[]) => void): () => void {
  initAuth();
  const cached = getLocalResidents();
  callback(cached);

  let unsubscribe = () => {};
  try {
    const q = query(residentsCollection, limit(200));
    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Resident[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ ...(docSnap.data() as Resident), id: docSnap.id });
          });
          saveLocalResidents(list);
          callback(list);
        } else {
          // Seed Firestore with initial residents
          cached.forEach((item) => {
            setDoc(doc(db, 'residents', item.id), item).catch((err) =>
              console.warn('Initial resident seeding note:', err)
            );
          });
          callback(cached);
        }
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
      await setDoc(doc(db, 'residents', resident.id), resident);
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
  newResidents.forEach((r) => map.set(r.name, r)); // update or add by name
  const merged = Array.from(map.values());
  saveLocalResidents(merged);

  for (const r of newResidents) {
    setDoc(doc(db, 'residents', r.id), r).catch((err) =>
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
 */
export function subscribeReports(callback: (reports: Report[]) => void): () => void {
  initAuth();
  const cached = getLocalReports();
  callback(cached);

  let unsubscribeFirestore = () => {};

  try {
    const q = query(reportsCollection, orderBy('occurrenceDate', 'desc'), limit(200));
    
    unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteReports: Report[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Report;
            remoteReports.push({ ...data, id: docSnap.id });
          });
          saveLocalReports(remoteReports);
          callback(remoteReports);
        } else {
          cached.forEach((item) => {
            setDoc(doc(db, 'reports', item.id), item).catch((err) =>
              console.warn('Initial report seeding note:', err)
            );
          });
          callback(cached);
        }
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

  return () => {
    unsubscribeFirestore();
  };
}

/**
 * Save / Add new report
 */
export async function saveReport(report: Report): Promise<{ success: boolean; error?: string }> {
  try {
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

    try {
      await setDoc(doc(db, 'reports', report.id), report);
    } catch (fsErr) {
      console.warn('Firestore write warning (saved locally):', fsErr);
    }

    return { success: true };
  } catch (err: any) {
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
          validReports = data.filter(
            (item) => item && typeof item === 'object' && item.residentName && item.occurrenceDate
          );
        } else if (data && typeof data === 'object') {
          if (Array.isArray(data.reports)) {
            validReports = data.reports.filter(
              (item: any) => item && typeof item === 'object' && item.residentName && item.occurrenceDate
            );
          }
          if (Array.isArray(data.residents)) {
            validResidents = data.residents.filter(
              (item: any) => item && typeof item === 'object' && item.name
            );
          }
        }

        if (validReports.length === 0 && validResidents.length === 0) {
          resolve({ success: false, count: 0, error: '取り込める有効なデータが見つかりませんでした。' });
          return;
        }

        if (validReports.length > 0) {
          const current = getLocalReports();
          const map = new Map<string, Report>();
          current.forEach((r) => map.set(r.id, r));
          validReports.forEach((r) => map.set(r.id, r));
          const merged = Array.from(map.values());
          saveLocalReports(merged);

          for (const item of validReports) {
            setDoc(doc(db, 'reports', item.id), item).catch((err) =>
              console.warn('Import Firestore sync note:', err)
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
            setDoc(doc(db, 'residents', item.id), item).catch((err) =>
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

/**
 * Reset to initial sample data
 */
export async function resetToSampleData(): Promise<void> {
  saveLocalReports(INITIAL_SAMPLE_REPORTS);
  saveLocalResidents(INITIAL_RESIDENTS);

  for (const item of INITIAL_SAMPLE_REPORTS) {
    try {
      await setDoc(doc(db, 'reports', item.id), item);
    } catch (e) {
      console.warn('Reset seed note:', e);
    }
  }
  for (const item of INITIAL_RESIDENTS) {
    try {
      await setDoc(doc(db, 'residents', item.id), item);
    } catch (e) {
      console.warn('Reset resident seed note:', e);
    }
  }
}
