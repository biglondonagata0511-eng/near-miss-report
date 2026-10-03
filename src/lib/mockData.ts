import { Report } from '../types/report';

/**
 * 本番公開運用の為、初期ダミー報告書は全てクリアし空配列とします。
 */
export const INITIAL_SAMPLE_REPORTS: Report[] = [];

/**
 * 過去に登録されたダミー報告書ID一覧（自動クリーンアップ・削除用）
 */
export const LEGACY_DUMMY_REPORT_IDS = [
  'report-demo-1',
  'report-demo-2',
  'report-demo-3',
  'report-demo-4',
];
