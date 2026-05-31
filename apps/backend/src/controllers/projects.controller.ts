import type { Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { sendSuccess } from '../lib/api-response.js';
import { getProjectById, listProjects, updateProjectPhoto } from '../models/projects.model.js';
import { isValidProjectPhotoPath, validateAttachProjectPhotoInput } from '../utils/photo-validation.js';

export const listProjectsController = async (_request: Request, response: Response) => {
  try {
    const projects = await listProjects();
    sendSuccess(response, projects);
  } catch {
    response.status(500).json({
      data: null,
      error: {
        code: 'PROJECTS_LIST_FAILED',
        message: 'Unable to load projects'
      }
    });
  }
};

export const updateProjectPhotoController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const projectId = Array.isArray(request.params.projectId)
      ? request.params.projectId[0]
      : request.params.projectId;

    if (!projectId) {
      throw new AppError('Project id is required', 400, 'PROJECT_ID_REQUIRED');
    }

    const input = validateAttachProjectPhotoInput(request.body);

    if (input.storagePath && !isValidProjectPhotoPath(projectId, input.storagePath)) {
      throw new AppError('Invalid project photo path', 400, 'INVALID_PROJECT_PHOTO_PATH');
    }

    const project = await updateProjectPhoto(projectId, input.storagePath, request.user.id);

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    sendSuccess(response, project);
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
        code: 'PROJECT_PHOTO_UPDATE_FAILED',
        message: 'Unable to update project photo'
      }
    });
  }
};

export const getProjectByIdController = async (request: Request, response: Response) => {
  try {
    const projectId = Array.isArray(request.params.projectId)
      ? request.params.projectId[0]
      : request.params.projectId;
    const project = await getProjectById(projectId);

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    sendSuccess(response, project);
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
        code: 'PROJECT_DETAIL_FAILED',
        message: 'Unable to load project'
      }
    });
  }
};
