import { Resident } from '../types/report';

/**
 * ダミーの利用者マスターは全削除とし、初期状態は空配列にします。
 */
export const INITIAL_RESIDENTS: Resident[] = [];

/**
 * 過去に登録されたダミー利用者ID一覧（自動クリーンアップ・削除用）
 */
export const LEGACY_DUMMY_RESIDENT_IDS = [
  'res-001',
  'res-002',
  'res-003',
  'res-004',
  'res-005',
  'res-006',
  'res-007',
  'res-008',
  'res-009',
  'res-010',
];
