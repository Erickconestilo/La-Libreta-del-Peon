type CalculatedThresholdStatus = 'normal' | 'warning' | 'alarm' | 'unknown';
type InstrumentReadingStatus = 'draft' | 'confirmed' | 'reviewed' | 'rejected';

type EvaluateReadingStatusInput = {
  alarmValue: number | null;
  autoConfirmGreen: boolean;
  previousValue: number | null;
  valueNumeric: number | null;
  warningValue: number | null;
};

type EvaluateReadingStatusResult = {
  autoConfirmed: boolean;
  delta: number | null;
  readingStatus: InstrumentReadingStatus;
  thresholdStatus: CalculatedThresholdStatus;
};

export const evaluateReadingStatus = ({
  alarmValue,
  autoConfirmGreen,
  previousValue,
  valueNumeric,
  warningValue
}: EvaluateReadingStatusInput): EvaluateReadingStatusResult => {
  if (
    valueNumeric === null ||
    previousValue === null ||
    warningValue === null ||
    alarmValue === null
  ) {
    return {
      autoConfirmed: false,
      delta: null,
      readingStatus: 'draft',
      thresholdStatus: 'unknown'
    };
  }

  const delta = valueNumeric - previousValue;
  const absoluteDelta = Math.abs(delta);

  if (absoluteDelta <= warningValue) {
    return {
      autoConfirmed: autoConfirmGreen,
      delta,
      readingStatus: autoConfirmGreen ? 'confirmed' : 'draft',
      thresholdStatus: 'normal'
    };
  }

  if (absoluteDelta <= alarmValue) {
    return {
      autoConfirmed: false,
      delta,
      readingStatus: 'draft',
      thresholdStatus: 'warning'
    };
  }

  return {
    autoConfirmed: false,
    delta,
    readingStatus: 'draft',
    thresholdStatus: 'alarm'
  };
};
