import type { Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { getActorProjectScope } from '../lib/access-control.js';
import { sendSuccess } from '../lib/api-response.js';
import { createProject, getProjectById, listProjects, updateProjectPhoto } from '../models/projects.model.js';
import { isValidProjectPhotoPath, validateAttachProjectPhotoInput } from '../utils/photo-validation.js';
import { validateCreateProjectInput } from '../utils/project-validation.js';

const isUniqueViolation = (error: unknown) => {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
};

export const listProjectsController = async (request: Request, response: Response) => {
  try {
    const projectScope = getActorProjectScope(request.user);
    const projects = await listProjects(projectScope);
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

export const createProjectController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const input = validateCreateProjectInput(request.body);
    const project = await createProject(input, request.user.id);

    sendSuccess(response, project, 201);
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

    if (isUniqueViolation(error)) {
      response.status(409).json({
        data: null,
        error: {
          code: 'PROJECT_ALREADY_EXISTS',
          message: 'A project with that name or code already exists'
        }
      });
      return;
    }

    response.status(500).json({
      data: null,
      error: {
        code: 'PROJECT_CREATE_FAILED',
        message: 'Unable to create project'
      }
    });
  }
};

export const updateProjectPhotoController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const projectScope = getActorProjectScope(request.user);

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

    const project = await updateProjectPhoto(projectId, input.storagePath, request.user.id, projectScope);

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
    const projectScope = getActorProjectScope(request.user);
    const project = await getProjectById(projectId, projectScope);

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
