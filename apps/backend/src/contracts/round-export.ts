/**
 * Backend compile-time mirror of shared RoundExportRow.
 *
 * The backend compiler emits only src/; importing the root shared TypeScript
 * tree would change the dist layout used by Render and Docker. Keep this
 * shape aligned with shared/types.ts when the export contract changes.
 */
export interface RoundExportRow {
  projectCode: string;
  projectName: string;
  roundName: string;
  roundDate: string;
  roundStatus: 'draft' | 'active' | 'closed' | 'cancelled';
  controlPointCode: string;
  controlPointName: string | null;
  pk: string | null;
  zone: string | null;
  tramo: string | null;
  seccion: string | null;
  side: 'left' | 'right' | 'center' | null;
  instrumentType: 'digital_level' | 'piezometer' | 'distometer' | 'linometer' | 'inclinometer' | 'cant_rule';
  pointStatus: 'pending' | 'taken' | 'skipped';
  measuredAt: string | null;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  notes: string | null;
  operator: string | null;
  readingStatus: 'draft' | 'confirmed' | 'reviewed' | null;
  delta: number | null;
  thresholdStatus: 'normal' | 'warning' | 'alarm' | 'unknown';
  attachmentCount: number;
}
