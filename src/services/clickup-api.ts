/**
 * ClickUp API client service
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../logger.js';

export interface ClickUpUser {
  id: number;
  username: string;
  email: string;
  color: string;
}

export interface ClickUpWorkspace {
  id: string;
  name: string;
  color: string;
  avatar: string | null;
  members: ClickUpUser[];
}

export interface ClickUpTask {
  id: string;
  custom_id: string | null;
  name: string;
  text_content: string;
  description: string;
  status: {
    status: string;
    color: string;
    type: string;
  };
  orderindex: string;
  date_created: string;
  date_updated: string;
  date_closed: string | null;
  archived: boolean;
  creator: ClickUpUser;
  assignees: ClickUpUser[];
  watchers: ClickUpUser[];
  priority: any;
  due_date: string | null;
  start_date: string | null;
  time_estimate: number | null;
  time_spent: number;
}

export class ClickUpAPI {
  private api: AxiosInstance;

  constructor(accessToken: string) {
    this.api = axios.create({
      baseURL: 'https://api.clickup.com/api/v2',
      headers: {
        'Authorization': accessToken,
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error({
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url
        }, 'ClickUp API error');

        if (error.response?.status === 401) {
          throw new Error('ClickUp authentication failed. Token may be expired.');
        }

        if (error.response?.status === 429) {
          throw new Error('ClickUp API rate limit exceeded. Please try again later.');
        }

        throw error;
      }
    );
  }

  /**
   * Get authorized user information
   */
  async getUser(): Promise<ClickUpUser> {
    try {
      const response = await this.api.get('/user');
      logger.debug({ user: response.data.user }, 'Fetched ClickUp user');
      return response.data.user;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch user');
      throw error;
    }
  }

  /**
   * Get authorized teams (workspaces)
   */
  async getWorkspaces(): Promise<ClickUpWorkspace[]> {
    try {
      const response = await this.api.get('/team');
      logger.debug({ teams: response.data.teams }, 'Fetched ClickUp workspaces');
      return response.data.teams;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch workspaces');
      throw error;
    }
  }

  /**
   * Get spaces in a workspace
   */
  async getSpaces(workspaceId: string): Promise<any[]> {
    try {
      const response = await this.api.get(`/team/${workspaceId}/space`);
      logger.debug({ spaces: response.data.spaces }, 'Fetched ClickUp spaces');
      return response.data.spaces;
    } catch (error) {
      logger.error({ error, workspaceId }, 'Failed to fetch spaces');
      throw error;
    }
  }

  /**
   * Get folders in a space
   */
  async getFolders(spaceId: string): Promise<any[]> {
    try {
      const response = await this.api.get(`/space/${spaceId}/folder`);
      logger.debug({ folders: response.data.folders }, 'Fetched ClickUp folders');
      return response.data.folders;
    } catch (error) {
      logger.error({ error, spaceId }, 'Failed to fetch folders');
      throw error;
    }
  }

  /**
   * Get lists in a folder
   */
  async getFolderLists(folderId: string): Promise<any[]> {
    try {
      const response = await this.api.get(`/folder/${folderId}/list`);
      logger.debug({ lists: response.data.lists }, 'Fetched ClickUp folder lists');
      return response.data.lists;
    } catch (error) {
      logger.error({ error, folderId }, 'Failed to fetch folder lists');
      throw error;
    }
  }

  /**
   * Get folderless lists in a space
   */
  async getFolderlessLists(spaceId: string): Promise<any[]> {
    try {
      const response = await this.api.get(`/space/${spaceId}/list`);
      logger.debug({ lists: response.data.lists }, 'Fetched ClickUp folderless lists');
      return response.data.lists;
    } catch (error) {
      logger.error({ error, spaceId }, 'Failed to fetch folderless lists');
      throw error;
    }
  }

  /**
   * Get tasks in a list
   */
  async getTasks(listId: string): Promise<ClickUpTask[]> {
    try {
      const response = await this.api.get(`/list/${listId}/task`);
      logger.debug({ tasks: response.data.tasks }, 'Fetched ClickUp tasks');
      return response.data.tasks;
    } catch (error) {
      logger.error({ error, listId }, 'Failed to fetch tasks');
      throw error;
    }
  }

  /**
   * Get a single task
   */
  async getTask(taskId: string): Promise<ClickUpTask> {
    try {
      const response = await this.api.get(`/task/${taskId}`);
      logger.debug({ task: response.data }, 'Fetched ClickUp task');
      return response.data;
    } catch (error) {
      logger.error({ error, taskId }, 'Failed to fetch task');
      throw error;
    }
  }

  /**
   * Create a new task
   */
  async createTask(listId: string, task: Partial<ClickUpTask>): Promise<ClickUpTask> {
    try {
      const response = await this.api.post(`/list/${listId}/task`, task);
      logger.debug({ task: response.data }, 'Created ClickUp task');
      return response.data;
    } catch (error) {
      logger.error({ error, listId, task }, 'Failed to create task');
      throw error;
    }
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, updates: Partial<ClickUpTask>): Promise<ClickUpTask> {
    try {
      const response = await this.api.put(`/task/${taskId}`, updates);
      logger.debug({ task: response.data }, 'Updated ClickUp task');
      return response.data;
    } catch (error) {
      logger.error({ error, taskId, updates }, 'Failed to update task');
      throw error;
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      await this.api.delete(`/task/${taskId}`);
      logger.debug({ taskId }, 'Deleted ClickUp task');
    } catch (error) {
      logger.error({ error, taskId }, 'Failed to delete task');
      throw error;
    }
  }
}

export default ClickUpAPI;