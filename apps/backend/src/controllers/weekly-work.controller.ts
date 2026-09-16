import type { Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { getActorProjectScope, assertProjectAccess, assertProjectWriteAccess } from '../lib/access-control.js';
import { sendSuccess } from '../lib/api-response.js';
import { requireWeeklyWorkCapability } from '../lib/weekly-work-capability.js';
import {
  createWeeklyWorkItem,
  deleteWeeklyWorkItem,
  listWeeklyWorkItems,
  updateWeeklyWorkItem
} from '../models/weekly-work.model.js';
import {
  validateCreateWeeklyWorkItemInput,
  validateDeleteWeeklyWorkItemQuery,
  validateUpdateWeeklyWorkItemInput,
  validateWeeklyWorkQuery
} from '../utils/weekly-work-validation.js';

const getParam = (request: Request, name: string) => {
  const value = request.params[name];
  return Array.isArray(value) ? value[0] : value;
};

const handleError = (response: Response, error: unknown, fallbackCode: string, fallbackMessage: string) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      data: null,
      error: { code: error.code, details: error.details, message: error.message }
    });
    return;
  }
  response.status(500).json({ data: null, error: { code: fallbackCode, message: fallbackMessage } });
};

export const listWeeklyWorkController = async (request: Request, response: Response) => {
  try {
    if (!request.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const projectId = getParam(request, 'projectId');
    assertProjectAccess(request.user, projectId);
    await requireWeeklyWorkCapability();
    const query = validateWeeklyWorkQuery(request.query);
    const items = await listWeeklyWorkItems(projectId, query.weekStart, getActorProjectScope(request.user));
    sendSuccess(response, items, 200, { weekStart: query.weekStart });
  } catch (error) {
    handleError(response, error, 'WEEKLY_WORK_LIST_FAILED', 'Unable to load weekly work');
  }
};

export const createWeeklyWorkController = async (request: Request, response: Response) => {
  try {
    if (!request.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const projectId = getParam(request, 'projectId');
    assertProjectWriteAccess(request.user, projectId);
    await requireWeeklyWorkCapability();
    const input = validateCreateWeeklyWorkItemInput(request.body);
    const result = await createWeeklyWorkItem(projectId, input, request.user.id, getActorProjectScope(request.user));
    if (!result) throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    sendSuccess(response, result.item, result.created ? 201 : 200, { replayed: !result.created });
  } catch (error) {
    handleError(response, error, 'WEEKLY_WORK_CREATE_FAILED', 'Unable to create weekly work');
  }
};

export const updateWeeklyWorkController = async (request: Request, response: Response) => {
  try {
    if (!request.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const projectId = getParam(request, 'projectId');
    const itemId = getParam(request, 'itemId');
    assertProjectWriteAccess(request.user, projectId);
    await requireWeeklyWorkCapability();
    const input = validateUpdateWeeklyWorkItemInput(request.body);
    const item = await updateWeeklyWorkItem(projectId, itemId, input, getActorProjectScope(request.user));
    if (!item) throw new AppError('Weekly work item not found', 404, 'WEEKLY_WORK_NOT_FOUND');
    sendSuccess(response, item);
  } catch (error) {
    handleError(response, error, 'WEEKLY_WORK_UPDATE_FAILED', 'Unable to update weekly work');
  }
};

export const deleteWeeklyWorkController = async (request: Request, response: Response) => {
  try {
    if (!request.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const projectId = getParam(request, 'projectId');
    const itemId = getParam(request, 'itemId');
    assertProjectWriteAccess(request.user, projectId);
    await requireWeeklyWorkCapability();
    const query = validateDeleteWeeklyWorkItemQuery(request.query);
    const deleted = await deleteWeeklyWorkItem(
      projectId,
      itemId,
      query.version,
      request.user.id,
      getActorProjectScope(request.user)
    );
    if (!deleted) throw new AppError('Weekly work item not found', 404, 'WEEKLY_WORK_NOT_FOUND');
    response.status(204).send();
  } catch (error) {
    handleError(response, error, 'WEEKLY_WORK_DELETE_FAILED', 'Unable to remove weekly work');
  }
};
