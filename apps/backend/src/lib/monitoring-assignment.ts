export type MonitoringAssignmentRole = 'admin' | 'topografo' | 'visitante';

export const hasMonitoringAssignmentFields = (input: {
  executionOrder?: number;
  operatorId?: string | null;
  roundDate?: string;
}) => input.operatorId !== undefined || input.roundDate !== undefined || input.executionOrder !== undefined;

export const canEditMonitoringAssignment = (
  role: MonitoringAssignmentRole,
  input: { executionOrder?: number; operatorId?: string | null; roundDate?: string }
) => role === 'admin' || !hasMonitoringAssignmentFields(input);
