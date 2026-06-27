import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateReadingStatus } from './monitoring-reading-evaluation.js';

test('auto-confirms numeric reading when delta is within warning threshold', () => {
  const result = evaluateReadingStatus({
    alarmValue: 10,
    autoConfirmGreen: true,
    previousValue: 100,
    valueNumeric: 104,
    warningValue: 5
  });

  assert.equal(result.delta, 4);
  assert.equal(result.thresholdStatus, 'normal');
  assert.equal(result.readingStatus, 'confirmed');
  assert.equal(result.autoConfirmed, true);
});

test('keeps reading as draft when delta is warning or alarm', () => {
  const warning = evaluateReadingStatus({
    alarmValue: 10,
    autoConfirmGreen: true,
    previousValue: 100,
    valueNumeric: 107,
    warningValue: 5
  });

  const alarm = evaluateReadingStatus({
    alarmValue: 10,
    autoConfirmGreen: true,
    previousValue: 100,
    valueNumeric: 112,
    warningValue: 5
  });

  assert.equal(warning.thresholdStatus, 'warning');
  assert.equal(warning.readingStatus, 'draft');
  assert.equal(warning.autoConfirmed, false);
  assert.equal(alarm.thresholdStatus, 'alarm');
  assert.equal(alarm.readingStatus, 'draft');
  assert.equal(alarm.autoConfirmed, false);
});

test('keeps reading as draft when project disables green auto-confirm', () => {
  const result = evaluateReadingStatus({
    alarmValue: 10,
    autoConfirmGreen: false,
    previousValue: 100,
    valueNumeric: 102,
    warningValue: 5
  });

  assert.equal(result.thresholdStatus, 'normal');
  assert.equal(result.readingStatus, 'draft');
  assert.equal(result.autoConfirmed, false);
});

test('keeps reading as draft when previous reading or threshold is missing', () => {
  const noPrevious = evaluateReadingStatus({
    alarmValue: 10,
    autoConfirmGreen: true,
    previousValue: null,
    valueNumeric: 102,
    warningValue: 5
  });

  const noThreshold = evaluateReadingStatus({
    alarmValue: null,
    autoConfirmGreen: true,
    previousValue: 100,
    valueNumeric: 102,
    warningValue: null
  });

  assert.equal(noPrevious.delta, null);
  assert.equal(noPrevious.thresholdStatus, 'unknown');
  assert.equal(noPrevious.readingStatus, 'draft');
  assert.equal(noThreshold.thresholdStatus, 'unknown');
  assert.equal(noThreshold.readingStatus, 'draft');
});
