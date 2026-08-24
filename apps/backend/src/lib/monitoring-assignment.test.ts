import assert from 'node:assert/strict';
import test from 'node:test';

import { canEditMonitoringAssignment, hasMonitoringAssignmentFields } from './monitoring-assignment.js';

test('topographers can update status but cannot alter assignment fields', () => {
  assert.equal(canEditMonitoringAssignment('topografo', {}), true);
  assert.equal(canEditMonitoringAssignment('topografo', { status: 'active' } as never), true);
  assert.equal(canEditMonitoringAssignment('topografo', { operatorId: null }), false);
  assert.equal(canEditMonitoringAssignment('topografo', { executionOrder: 2 }), false);
  assert.equal(canEditMonitoringAssignment('admin', { executionOrder: 2 }), true);
  assert.equal(hasMonitoringAssignmentFields({ roundDate: '2026-08-24' }), true);
});
