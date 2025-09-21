/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Task dependency operations for the ClickUp API
 */

import { Logger } from '../../../logger.js';
import { AxiosInstance } from 'axios';
import { ClickUpDependency, DependencyType } from '../types.js';

/**
 * Service for managing task dependencies in ClickUp
 */
export class TaskDependenciesService {
  private logger: Logger;

  constructor(private apiClient: AxiosInstance) {
    this.logger = new Logger('TaskDependenciesService');
  }

  /**
   * Add a dependency between two tasks
   *
   * @param taskId - The ID of the task to add the dependency to
   * @param dependsOn - The ID of the task that this task depends on
   * @param type - The dependency type (0 = waiting on, 1 = blocking)
   * @returns The created dependency
   */
  async addDependency(
    taskId: string,
    dependsOn: string,
    type: DependencyType = 0
  ): Promise<ClickUpDependency> {
    this.logger.info(`Adding dependency: ${taskId} ${type === 0 ? 'waiting on' : 'blocking'} ${dependsOn}`);

    const body = {
      depends_on: dependsOn,
      dependency_of: taskId
    };

    const response = await this.apiClient.post<any>(
      `/task/${taskId}/dependency`,
      body
    );

    this.logger.info(`Successfully added dependency between tasks`);
    return response.data;
  }

  /**
   * Remove a dependency between two tasks
   *
   * @param taskId - The ID of the task to remove the dependency from
   * @param dependsOn - The ID of the task that this task depends on
   * @param type - The dependency type (0 = waiting on, 1 = blocking)
   */
  async removeDependency(
    taskId: string,
    dependsOn: string,
    type: DependencyType = 0
  ): Promise<void> {
    this.logger.info(`Removing dependency: ${taskId} ${type === 0 ? 'waiting on' : 'blocking'} ${dependsOn}`);

    // ClickUp API requires query parameters for DELETE
    const queryParams = new URLSearchParams({
      depends_on: dependsOn,
      dependency_of: taskId
    });

    await this.apiClient.delete(
      `/task/${taskId}/dependency?${queryParams.toString()}`
    );

    this.logger.info(`Successfully removed dependency between tasks`);
  }

  /**
   * Add a linked task relationship
   *
   * @param taskId - The ID of the task to add the link to
   * @param linkedTaskId - The ID of the task to link
   */
  async addLinkedTask(
    taskId: string,
    linkedTaskId: string
  ): Promise<any> {
    this.logger.info(`Linking tasks: ${taskId} <-> ${linkedTaskId}`);

    const response = await this.apiClient.post<any>(
      `/task/${taskId}/link/${linkedTaskId}`,
      {}
    );

    this.logger.info(`Successfully linked tasks`);
    return response.data;
  }

  /**
   * Remove a linked task relationship
   *
   * @param taskId - The ID of the task to remove the link from
   * @param linkedTaskId - The ID of the linked task
   */
  async removeLinkedTask(
    taskId: string,
    linkedTaskId: string
  ): Promise<void> {
    this.logger.info(`Unlinking tasks: ${taskId} <-> ${linkedTaskId}`);

    await this.apiClient.delete(
      `/task/${taskId}/link/${linkedTaskId}`
    );

    this.logger.info(`Successfully unlinked tasks`);
  }
}