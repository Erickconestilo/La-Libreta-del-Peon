import type { Request, Response } from 'express';

import { assertProjectAccess, getActorProjectScope } from '../lib/access-control.js';
import { AppError } from '../lib/app-error.js';
import { sendSuccess } from '../lib/api-response.js';
import { assertPhotoObjectExists } from '../lib/photo-storage.js';
import { parseProjectCodeCatalogCsv } from '../lib/project-code-catalog-csv.js';
import { requireScopedResourceBeforeExternalCheck } from '../lib/scoped-resource-access.js';
import {
  createControlPoint,
  createControlPointThreshold,
  createInstrumentReading,
  createReadingAttachment,
  createMonitoringRound,
  createMonitoringRoundPoint,
  getInstrumentReadingById,
  getMonitoringRoundExportRows,
  getMonitoringRoundDetail,
  getReadingHistory,
  importProjectCodeCatalog,
  listControlPoints,
  listControlPointThresholds,
  listMonitoringRounds,
  listMyJourney,
  listProjectOperators,
  listProjectCodeCatalog,
  updateControlPoint,
  updateMonitoringRound,
  updateMonitoringRoundStatus
} from '../models/monitoring.model.js';
import { roundExportRowsToCsv, roundExportRowsToXlsx } from '../lib/round-export.js';
import {
  validateCodeCatalogQuery,
  validateCreateControlPointInput,
  validateCreateControlPointThresholdInput,
  validateCreateInstrumentReadingInput,
  validateCreateReadingAttachmentInput,
  validateCreateMonitoringRoundInput,
  validateCreateRoundPointInput,
  validateListControlPointsQuery,
  validateListMonitoringRoundsQuery,
  validateJourneyQuery,
  validateReadingHistoryQuery,
  validateRoundExportQuery,
  validateUpdateMonitoringRoundStatusInput,
  validateUpdateMonitoringRoundInput,
  validateUpdateControlPointInput
} from '../utils/monitoring-validation.js';
import { isValidReadingPhotoPath } from '../utils/photo-validation.js';
import { canEditMonitoringAssignment } from '../lib/monitoring-assignment.js';

const sendControllerError = (response: Response, error: unknown, fallbackCode: string, fallbackMessage: string) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      data: null,
      error: {
        code: error.code,
        details: error.details,
        message: error.message
      }
    });
    return;
  }

  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
    response.status(409).json({
      data: null,
      error: {
        code: 'DUPLICATE_MONITORING_RECORD',
        message: 'Monitoring record already exists'
      }
    });
    return;
  }

  response.status(500).json({
    data: null,
    error: {
      code: fallbackCode,
      message: fallbackMessage
    }
  });
};

export const createRoundPointController = async (request: Request, response: Response) => {
  try {
    const roundId = Array.isArray(request.params.roundId) ? request.params.roundId[0] : request.params.roundId;
    const input = validateCreateRoundPointInput(request.body);
    const roundPoint = await createMonitoringRoundPoint(roundId, input, getActorProjectScope(request.user));

    if (!roundPoint) {
      throw new AppError('Round or control point not found', 404, 'ROUND_POINT_TARGET_NOT_FOUND');
    }

    sendSuccess(response, roundPoint, 201);
  } catch (error) {
    sendControllerError(response, error, 'ROUND_POINT_CREATE_FAILED', 'Unable to create round point');
  }
};

export const createInstrumentReadingController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const roundPointId = Array.isArray(request.params.roundPointId)
      ? request.params.roundPointId[0]
      : request.params.roundPointId;
    const input = validateCreateInstrumentReadingInput(request.body);
    const result = await createInstrumentReading(
      roundPointId,
      input,
      request.user.id,
      getActorProjectScope(request.user)
    );

    if (!result) {
      throw new AppError('Round point not found', 404, 'ROUND_POINT_NOT_FOUND');
    }

    sendSuccess(
      response,
      {
        autoConfirmed: result.autoConfirmed,
        delta: result.delta,
        reading: result.reading,
        thresholdStatus: result.thresholdStatus
      },
      result.created ? 201 : 200
    );
  } catch (error) {
    sendControllerError(response, error, 'READING_CREATE_FAILED', 'Unable to create instrument reading');
  }
};

export const createReadingAttachmentController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const roundPointId = routeParam(request, 'roundPointId');
    const readingId = routeParam(request, 'readingId');
    const input = validateCreateReadingAttachmentInput(request.body);

    if (!isValidReadingPhotoPath(readingId, input.storagePath)) {
      throw new AppError('Invalid reading photo path', 400, 'INVALID_READING_PHOTO_PATH');
    }

    const projectScope = getActorProjectScope(request.user);
    await requireScopedResourceBeforeExternalCheck({
      code: 'READING_NOT_FOUND',
      loadResource: () => getInstrumentReadingById(readingId, projectScope),
      message: 'Reading not found',
      verifyAfterAccess: () => assertPhotoObjectExists(input.storagePath)
    });

    const attachment = await createReadingAttachment(
      roundPointId,
      readingId,
      input,
      request.user.id,
      projectScope
    );

    if (!attachment) {
      throw new AppError('Reading not found', 404, 'READING_NOT_FOUND');
    }

    sendSuccess(response, attachment, 201);
  } catch (error) {
    sendControllerError(response, error, 'READING_ATTACHMENT_CREATE_FAILED', 'Unable to attach reading photo');
  }
};

export const listProjectCodeCatalogController = async (request: Request, response: Response) => {
  try {
    const projectId = Array.isArray(request.params.projectId)
      ? request.params.projectId[0]
      : request.params.projectId;

    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    assertProjectAccess(request.user, projectId);

    const query = validateCodeCatalogQuery(request.query);
    const rows = await listProjectCodeCatalog(projectId, query, getActorProjectScope(request.user));

    sendSuccess(response, rows);
  } catch (error) {
    sendControllerError(response, error, 'CODE_CATALOG_LIST_FAILED', 'Unable to load project code catalog');
  }
};

export const importProjectCodeCatalogController = async (request: Request, response: Response) => {
  try {
    const projectId = Array.isArray(request.params.projectId)
      ? request.params.projectId[0]
      : request.params.projectId;
    const csv = typeof request.body === 'string' ? request.body : '';

    if (!csv.trim()) {
      throw new AppError('CSV body is required', 400, 'CSV_BODY_REQUIRED');
    }

    let rows: ReturnType<typeof parseProjectCodeCatalogCsv>;

    try {
      rows = parseProjectCodeCatalogCsv(csv);
    } catch (error) {
      throw new AppError('Invalid code catalog CSV', 400, 'INVALID_CODE_CATALOG_CSV', {
        reason: error instanceof Error ? error.message : 'Unknown CSV parse error'
      });
    }

    const result = await importProjectCodeCatalog(projectId, rows);

    if (!result) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    sendSuccess(response, result, 201);
  } catch (error) {
    sendControllerError(response, error, 'CODE_CATALOG_IMPORT_FAILED', 'Unable to import project code catalog');
  }
};

const routeParam = (request: Request, name: string) => {
  const value = request.params[name];
  return Array.isArray(value) ? value[0] : value;
};

export const createMonitoringRoundController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const projectId = routeParam(request, 'projectId');
    assertProjectAccess(request.user, projectId);

    const input = validateCreateMonitoringRoundInput(request.body);
    if (request.user.role === 'topografo') {
      if (input.operatorId && input.operatorId !== request.user.id) {
        throw new AppError('A topographer can only create a round assigned to their own account', 403, 'ADMIN_ASSIGNMENT_REQUIRED');
      }
      input.operatorId = request.user.id;
    }
    const round = await createMonitoringRound(projectId, input, request.user.id, getActorProjectScope(request.user));

    if (!round) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    sendSuccess(response, round, 201);
  } catch (error) {
    sendControllerError(response, error, 'ROUND_CREATE_FAILED', 'Unable to create monitoring round');
  }
};

export const listMonitoringRoundsController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const projectId = routeParam(request, 'projectId');
    assertProjectAccess(request.user, projectId);

    const query = validateListMonitoringRoundsQuery(request.query);
    const rounds = await listMonitoringRounds(projectId, query, getActorProjectScope(request.user));

    sendSuccess(response, rounds);
  } catch (error) {
    sendControllerError(response, error, 'ROUNDS_LIST_FAILED', 'Unable to load monitoring rounds');
  }
};

export const getMonitoringRoundDetailController = async (request: Request, response: Response) => {
  try {
    const roundId = routeParam(request, 'roundId');
    const round = await getMonitoringRoundDetail(roundId, getActorProjectScope(request.user));

    if (!round) {
      throw new AppError('Round not found', 404, 'ROUND_NOT_FOUND');
    }

    sendSuccess(response, round);
  } catch (error) {
    sendControllerError(response, error, 'ROUND_DETAIL_FAILED', 'Unable to load monitoring round');
  }
};

export const exportMonitoringRoundController = async (request: Request, response: Response) => {
  try {
    const roundId = routeParam(request, 'roundId');
    const { format } = validateRoundExportQuery(request.query);
    const rows = await getMonitoringRoundExportRows(roundId, getActorProjectScope(request.user));

    if (!rows) {
      throw new AppError('Round not found', 404, 'ROUND_NOT_FOUND');
    }

    const filename = `topofield-ronda-${roundId}.${format}`;
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (format === 'csv') {
      response.setHeader('Content-Type', 'text/csv; charset=utf-8');
      response.send(roundExportRowsToCsv(rows));
      return;
    }

    const workbook = await roundExportRowsToXlsx(rows);
    response.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(workbook);
  } catch (error) {
    sendControllerError(response, error, 'ROUND_EXPORT_FAILED', 'Unable to export monitoring round');
  }
};

export const updateMonitoringRoundStatusController = async (request: Request, response: Response) => {
  try {
    const roundId = routeParam(request, 'roundId');
    const input = validateUpdateMonitoringRoundStatusInput(request.body);
    const round = await updateMonitoringRoundStatus(roundId, input, getActorProjectScope(request.user));

    if (!round) {
      throw new AppError('Round not found', 404, 'ROUND_NOT_FOUND');
    }

    sendSuccess(response, round);
  } catch (error) {
    sendControllerError(response, error, 'ROUND_STATUS_UPDATE_FAILED', 'Unable to update monitoring round status');
  }
};

export const updateMonitoringRoundController = async (request: Request, response: Response) => {
  try {
    if (!request.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const roundId = routeParam(request, 'roundId');
    const input = validateUpdateMonitoringRoundInput(request.body);

    if (!canEditMonitoringAssignment(request.user.role, input)) {
      throw new AppError('Only an admin can assign or order rounds', 403, 'ADMIN_ASSIGNMENT_REQUIRED');
    }

    const round = await updateMonitoringRound(roundId, input, getActorProjectScope(request.user));
    if (!round) throw new AppError('Round not found', 404, 'ROUND_NOT_FOUND');
    sendSuccess(response, round);
  } catch (error) {
    sendControllerError(response, error, 'ROUND_UPDATE_FAILED', 'Unable to update monitoring round');
  }
};

export const listProjectOperatorsController = async (request: Request, response: Response) => {
  try {
    const projectId = routeParam(request, 'projectId');
    assertProjectAccess(request.user!, projectId);
    const operators = await listProjectOperators(projectId);
    sendSuccess(response, operators);
  } catch (error) {
    sendControllerError(response, error, 'PROJECT_OPERATORS_LIST_FAILED', 'Unable to load project operators');
  }
};

export const listMyJourneyController = async (request: Request, response: Response) => {
  try {
    if (!request.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const query = validateJourneyQuery(request.query);
    const journey = await listMyJourney(request.user.id, query, getActorProjectScope(request.user));
    sendSuccess(response, journey);
  } catch (error) {
    sendControllerError(response, error, 'JOURNEY_LIST_FAILED', 'Unable to load your journey');
  }
};

export const createControlPointController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const projectId = routeParam(request, 'projectId');
    assertProjectAccess(request.user, projectId);

    const input = validateCreateControlPointInput(request.body);
    const controlPoint = await createControlPoint(projectId, input, getActorProjectScope(request.user));

    if (!controlPoint) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    sendSuccess(response, controlPoint, 201);
  } catch (error) {
    sendControllerError(response, error, 'CONTROL_POINT_CREATE_FAILED', 'Unable to create control point');
  }
};

export const listControlPointsController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const projectId = routeParam(request, 'projectId');
    assertProjectAccess(request.user, projectId);

    const query = validateListControlPointsQuery(request.query);
    const controlPoints = await listControlPoints(projectId, query, getActorProjectScope(request.user));

    sendSuccess(response, controlPoints);
  } catch (error) {
    sendControllerError(response, error, 'CONTROL_POINTS_LIST_FAILED', 'Unable to load control points');
  }
};

export const updateControlPointController = async (request: Request, response: Response) => {
  try {
    const controlPointId = routeParam(request, 'controlPointId');
    const input = validateUpdateControlPointInput(request.body);
    const controlPoint = await updateControlPoint(controlPointId, input, getActorProjectScope(request.user));

    if (!controlPoint) {
      throw new AppError('Control point not found', 404, 'CONTROL_POINT_NOT_FOUND');
    }

    sendSuccess(response, controlPoint);
  } catch (error) {
    sendControllerError(response, error, 'CONTROL_POINT_UPDATE_FAILED', 'Unable to update control point');
  }
};

export const createControlPointThresholdController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const controlPointId = routeParam(request, 'controlPointId');
    const input = validateCreateControlPointThresholdInput(request.body);
    const threshold = await createControlPointThreshold(
      controlPointId,
      input,
      request.user.id,
      getActorProjectScope(request.user)
    );

    if (!threshold) {
      throw new AppError('Control point not found', 404, 'CONTROL_POINT_NOT_FOUND');
    }

    sendSuccess(response, threshold, 201);
  } catch (error) {
    sendControllerError(response, error, 'THRESHOLD_CREATE_FAILED', 'Unable to create control point threshold');
  }
};

export const listControlPointThresholdsController = async (request: Request, response: Response) => {
  try {
    const controlPointId = routeParam(request, 'controlPointId');
    const thresholds = await listControlPointThresholds(controlPointId, getActorProjectScope(request.user));

    if (!thresholds) {
      throw new AppError('Control point not found', 404, 'CONTROL_POINT_NOT_FOUND');
    }

    sendSuccess(response, thresholds);
  } catch (error) {
    sendControllerError(response, error, 'THRESHOLDS_LIST_FAILED', 'Unable to load control point thresholds');
  }
};

export const getReadingHistoryController = async (request: Request, response: Response) => {
  try {
    const controlPointId = routeParam(request, 'controlPointId');
    const query = validateReadingHistoryQuery(request.query);
    const history = await getReadingHistory(controlPointId, query, getActorProjectScope(request.user));

    if (!history) {
      throw new AppError('Control point not found', 404, 'CONTROL_POINT_NOT_FOUND');
    }

    sendSuccess(response, history);
  } catch (error) {
    sendControllerError(response, error, 'READING_HISTORY_FAILED', 'Unable to load reading history');
  }
};
