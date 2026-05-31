import type { Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { sendSuccess } from '../lib/api-response.js';
import {
  createGuideEntry,
  deleteGuideEntry,
  getGuideEntryById,
  listGuideEntries,
  updateGuideEntry
} from '../models/guide.model.js';
import {
  validateCreateGuideEntryInput,
  validateUpdateGuideEntryInput
} from '../utils/guide-validation.js';

export const listGuideEntriesController = async (request: Request, response: Response) => {
  try {
    const category = typeof request.query.category === 'string' ? request.query.category : null;
    const entries = await listGuideEntries(category);

    sendSuccess(response, entries);
  } catch {
    response.status(500).json({
      data: null,
      error: {
        code: 'GUIDE_LIST_FAILED',
        message: 'Unable to load guide entries'
      }
    });
  }
};

export const getGuideEntryByIdController = async (request: Request, response: Response) => {
  try {
    const guideEntryId = Array.isArray(request.params.guideEntryId)
      ? request.params.guideEntryId[0]
      : request.params.guideEntryId;

    if (!guideEntryId) {
      throw new AppError('Guide entry id is required', 400, 'GUIDE_ENTRY_ID_REQUIRED');
    }

    const entry = await getGuideEntryById(guideEntryId);

    if (!entry) {
      throw new AppError('Guide entry not found', 404, 'GUIDE_ENTRY_NOT_FOUND');
    }

    sendSuccess(response, entry);
  } catch (error) {
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

    response.status(500).json({
      data: null,
      error: {
        code: 'GUIDE_ENTRY_DETAIL_FAILED',
        message: 'Unable to load guide entry'
      }
    });
  }
};

export const createGuideEntryController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const input = validateCreateGuideEntryInput(request.body);
    const guideEntryId = await createGuideEntry(input, request.user.id);
    const entry = await getGuideEntryById(guideEntryId);

    sendSuccess(response, entry, 201);
  } catch (error) {
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

    response.status(500).json({
      data: null,
      error: {
        code: 'GUIDE_ENTRY_CREATE_FAILED',
        message: 'Unable to create guide entry'
      }
    });
  }
};

export const updateGuideEntryController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const guideEntryId = Array.isArray(request.params.guideEntryId)
      ? request.params.guideEntryId[0]
      : request.params.guideEntryId;

    if (!guideEntryId) {
      throw new AppError('Guide entry id is required', 400, 'GUIDE_ENTRY_ID_REQUIRED');
    }

    const input = validateUpdateGuideEntryInput(request.body);
    const entry = await updateGuideEntry(guideEntryId, input, request.user.id);

    if (!entry) {
      throw new AppError('Guide entry not found', 404, 'GUIDE_ENTRY_NOT_FOUND');
    }

    sendSuccess(response, entry);
  } catch (error) {
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

    response.status(500).json({
      data: null,
      error: {
        code: 'GUIDE_ENTRY_UPDATE_FAILED',
        message: 'Unable to update guide entry'
      }
    });
  }
};

export const deleteGuideEntryController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const guideEntryId = Array.isArray(request.params.guideEntryId)
      ? request.params.guideEntryId[0]
      : request.params.guideEntryId;

    if (!guideEntryId) {
      throw new AppError('Guide entry id is required', 400, 'GUIDE_ENTRY_ID_REQUIRED');
    }

    const deleted = await deleteGuideEntry(guideEntryId, request.user.id);

    if (!deleted) {
      throw new AppError('Guide entry not found', 404, 'GUIDE_ENTRY_NOT_FOUND');
    }

    sendSuccess(response, {
      deleted: true,
      id: guideEntryId
    });
  } catch (error) {
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

    response.status(500).json({
      data: null,
      error: {
        code: 'GUIDE_ENTRY_DELETE_FAILED',
        message: 'Unable to delete guide entry'
      }
    });
  }
};
