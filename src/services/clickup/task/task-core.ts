/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Task Service - Core Module
 * 
 * Handles core operations related to tasks in ClickUp, including:
 * - Base service initialization
 * - Core utility methods
 * - Basic CRUD operations
 */

import { BaseClickUpService, ErrorCode, ClickUpServiceError, ServiceResponse } from '../base.js';
import {
  ClickUpTask,
  CreateTaskData,
  UpdateTaskData,
  TaskFilters,
  TasksResponse,
  TaskPriority,
  ClickUpTaskTemplate,
  TaskTemplatesResponse
} from '../types.js';
import { ListService } from '../list.js';
import { WorkspaceService } from '../workspace.js';

/**
 * Core TaskService class providing basic task operations
 */
export class TaskServiceCore extends BaseClickUpService {
  protected listService: ListService;
  protected workspaceService: WorkspaceService | null = null;
  
  // Cache for validated tasks and lists
  private validationCache = {
    tasks: new Map<string, {
      validatedAt: number;
      task: ClickUpTask;
    }>(),
    lists: new Map<string, {
      validatedAt: number;
      valid: boolean;
    }>()
  };

  // Cache for task name to ID mapping
  private nameToIdCache = new Map<string, {
    taskId: string;
    validatedAt: number;
    listId?: string; // Optional list context for disambiguation
  }>();
  
  // Cache TTL in milliseconds (5 minutes)
  private readonly CACHE_TTL = 5 * 60 * 1000;

  constructor(
    apiKey: string, 
    teamId: string, 
    baseUrl?: string,
    workspaceService?: WorkspaceService
  ) {
    super(apiKey, teamId, baseUrl);
    
    if (workspaceService) {
      this.workspaceService = workspaceService;
      this.logOperation('constructor', { usingSharedWorkspaceService: true });
    }
    
    // Initialize list service for list lookups
    this.listService = new ListService(apiKey, teamId, baseUrl, this.workspaceService);
    
    this.logOperation('constructor', { initialized: true });
  }

  /**
   * Helper method to handle errors consistently
   * @param error The error that occurred
   * @param message Optional custom error message
   * @returns A ClickUpServiceError
   */
  protected handleError(error: any, message?: string): ClickUpServiceError {
    if (error instanceof ClickUpServiceError) {
      return error;
    }
    
    return new ClickUpServiceError(
      message || `Task service error: ${error.message}`,
      ErrorCode.UNKNOWN,
      error
    );
  }

  /**
   * Build URL parameters from task filters
   * @param filters Task filters to convert to URL parameters
   * @returns URLSearchParams object
   */
  protected buildTaskFilterParams(filters: TaskFilters): URLSearchParams {
    const params = new URLSearchParams();
    
    // Add all filters to the query parameters
    if (filters.include_closed) params.append('include_closed', String(filters.include_closed));
    if (filters.subtasks) params.append('subtasks', String(filters.subtasks));
    if (filters.include_subtasks) params.append('include_subtasks', String(filters.include_subtasks));
    if (filters.page) params.append('page', String(filters.page));
    if (filters.order_by) params.append('order_by', filters.order_by);
    if (filters.reverse) params.append('reverse', String(filters.reverse));
    
    // Array parameters
    if (filters.statuses && filters.statuses.length > 0) {
      filters.statuses.forEach(status => params.append('statuses[]', status));
    }
    if (filters.assignees && filters.assignees.length > 0) {
      filters.assignees.forEach(assignee => params.append('assignees[]', assignee));
    }
    
    // Team tasks endpoint specific parameters
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => params.append('tags[]', tag));
    }
    if (filters.list_ids && filters.list_ids.length > 0) {
      filters.list_ids.forEach(id => params.append('list_ids[]', id));
    }
    if (filters.folder_ids && filters.folder_ids.length > 0) {
      filters.folder_ids.forEach(id => params.append('folder_ids[]', id));
    }
    if (filters.space_ids && filters.space_ids.length > 0) {
      filters.space_ids.forEach(id => params.append('space_ids[]', id));
    }
    if (filters.archived !== undefined) params.append('archived', String(filters.archived));
    if (filters.include_closed_lists !== undefined) params.append('include_closed_lists', String(filters.include_closed_lists));
    if (filters.include_archived_lists !== undefined) params.append('include_archived_lists', String(filters.include_archived_lists));
    if (filters.include_compact_time_entries !== undefined) params.append('include_compact_time_entries', String(filters.include_compact_time_entries));
    
    // Date filters
    if (filters.due_date_gt) params.append('due_date_gt', String(filters.due_date_gt));
    if (filters.due_date_lt) params.append('due_date_lt', String(filters.due_date_lt));
    if (filters.date_created_gt) params.append('date_created_gt', String(filters.date_created_gt));
    if (filters.date_created_lt) params.append('date_created_lt', String(filters.date_created_lt));
    if (filters.date_updated_gt) params.append('date_updated_gt', String(filters.date_updated_gt));
    if (filters.date_updated_lt) params.append('date_updated_lt', String(filters.date_updated_lt));
    
    // Handle custom fields if present
    if (filters.custom_fields) {
      Object.entries(filters.custom_fields).forEach(([key, value]) => {
        params.append(`custom_fields[${key}]`, String(value));
      });
    }
    
    return params;
  }
  
  /**
   * Extract priority value from a task
   * @param task The task to extract priority from
   * @returns TaskPriority or null
   */
  protected extractPriorityValue(task: ClickUpTask): TaskPriority | null {
    if (!task.priority || !task.priority.id) {
      return null;
    }
    
    const priorityValue = parseInt(task.priority.id);
    // Ensure it's in the valid range 1-4
    if (isNaN(priorityValue) || priorityValue < 1 || priorityValue > 4) {
      return null;
    }
    
    return priorityValue as TaskPriority;
  }
  
  /**
   * Extract task data for creation/duplication
   * @param task The source task
   * @param nameOverride Optional override for the task name
   * @returns CreateTaskData object
   */
  protected extractTaskData(task: ClickUpTask, nameOverride?: string): CreateTaskData {
    return {
      name: nameOverride || task.name,
      description: task.description || '',
      status: task.status?.status,
      priority: this.extractPriorityValue(task),
      due_date: task.due_date ? Number(task.due_date) : undefined,
      assignees: task.assignees?.map(a => a.id) || []
    };
  }

  /**
   * Create a new task in the specified list
   * @param listId The ID of the list to create the task in
   * @param taskData The data for the new task
   * @returns The created task
   */
  async createTask(listId: string, taskData: CreateTaskData): Promise<ClickUpTask> {
    this.logOperation('createTask', { listId, ...taskData });

    try {
      return await this.makeRequest(async () => {
        const response = await this.client.post<ClickUpTask | string>(
          `/list/${listId}/task`,
          taskData
        );

        // Handle both JSON and text responses
        const data = response.data;
        if (typeof data === 'string') {
          // If we got a text response, try to extract task ID from common patterns
          const idMatch = data.match(/task.*?(\w{9})/i);
          if (idMatch) {
            // If we found an ID, fetch the full task details
            return await this.getTask(idMatch[1]);
          }
          throw new ClickUpServiceError(
            'Received unexpected text response from API',
            ErrorCode.UNKNOWN,
            data
          );
        }

        return data;
      });
    } catch (error) {
      throw this.handleError(error, 'Failed to create task');
    }
  }

  /**
   * Create a new task from a template in the specified list
   * @param listId The ID of the list to create the task in
   * @param templateId The ID of the template to use
   * @param taskName Optional name for the task (if not provided, template default is used)
   * @returns The created task
   */
  async createTaskFromTemplate(listId: string, templateId: string, taskName?: string): Promise<ClickUpTask> {
    this.logOperation('createTaskFromTemplate', { listId, templateId, taskName });

    try {
      return await this.makeRequest(async () => {
        const payload: { name?: string } = {};
        if (taskName) {
          payload.name = taskName;
        }

        const response = await this.client.post<ClickUpTask | string>(
          `/list/${listId}/taskTemplate/${templateId}`,
          payload
        );

        // Handle both JSON and text responses
        const data = response.data;
        if (typeof data === 'string') {
          // If we got a text response, try to extract task ID from common patterns
          const idMatch = data.match(/task.*?(\w{9})/i);
          if (idMatch) {
            // If we found an ID, fetch the full task details
            return await this.getTask(idMatch[1]);
          }
          throw new ClickUpServiceError(
            'Received unexpected text response from API',
            ErrorCode.UNKNOWN,
            data
          );
        }

        return data;
      });
    } catch (error) {
      throw this.handleError(error, 'Failed to create task from template');
    }
  }

  /**
   * Get all task templates for the team/workspace
   * @returns Array of task templates
   */
  async getTaskTemplates(): Promise<ClickUpTaskTemplate[]> {
    this.logOperation('getTaskTemplates', { teamId: this.teamId });

    try {
      return await this.makeRequest(async () => {
        const response = await this.client.get<TaskTemplatesResponse | string>(
          `/team/${this.teamId}/taskTemplate`
        );

        // Handle both JSON and text responses
        const data = response.data;
        if (typeof data === 'string') {
          throw new ClickUpServiceError(
            'Received unexpected text response from API',
            ErrorCode.UNKNOWN,
            data
          );
        }

        // The API returns an object with templates array
        return data.templates || [];
      });
    } catch (error) {
      throw this.handleError(error, 'Failed to get task templates');
    }
  }

  /**
   * Get a task by its ID
   * Automatically detects custom task IDs and routes them appropriately
   * @param taskId The ID of the task to retrieve (regular or custom)
   * @returns The task
   */
  async getTask(taskId: string): Promise<ClickUpTask> {
    this.logOperation('getTask', { taskId });

    // Import the detection function here to avoid circular dependencies
    const { isCustomTaskId } = await import('../../../tools/task/utilities.js');

    // Test the detection function
    const isCustom = isCustomTaskId(taskId);
    this.logger.debug('Custom task ID detection result', {
      taskId,
      isCustom,
      taskIdLength: taskId.length,
      containsHyphen: taskId.includes('-'),
      containsUnderscore: taskId.includes('_')
    });

    // Automatically detect custom task IDs and route to appropriate method
    if (isCustom) {
      this.logger.debug('Detected custom task ID, routing to getTaskByCustomId', { taskId });
      return this.getTaskByCustomId(taskId);
    }

    this.logger.debug('Detected regular task ID, using standard getTask flow', { taskId });

    try {
      return await this.makeRequest(async () => {
        const response = await this.client.get<ClickUpTask>(`/task/${taskId}`);

        // Handle both JSON and text responses
        const data = response.data;
        if (typeof data === 'string') {
          throw new ClickUpServiceError(
            'Received unexpected text response from API',
            ErrorCode.UNKNOWN,
            data
          );
        }

        return data;
      });
    } catch (error) {
      // If this was detected as a regular task ID but failed, provide helpful error message
      // suggesting it might be a custom ID that wasn't properly detected
      if (error instanceof ClickUpServiceError && error.code === ErrorCode.NOT_FOUND) {
        const { isCustomTaskId } = await import('../../../tools/task/utilities.js');
        if (!isCustomTaskId(taskId) && (taskId.includes('-') || taskId.includes('_'))) {
          throw new ClickUpServiceError(
            `Task ${taskId} not found. If this is a custom task ID, ensure your workspace has custom task IDs enabled and you have access to the task.`,
            ErrorCode.NOT_FOUND,
            error.data
          );
        }
      }
      throw this.handleError(error, `Failed to get task ${taskId}`);
    }
  }

  /**
   * Get all tasks in a list
   * @param listId The ID of the list to get tasks from
   * @param filters Optional filters to apply
   * @returns Array of tasks
   */
  async getTasks(listId: string, filters: TaskFilters = {}): Promise<ClickUpTask[]> {
    this.logOperation('getTasks', { listId, filters });
    
    try {
      return await this.makeRequest(async () => {
        const params = this.buildTaskFilterParams(filters);
        const response = await this.client.get<TasksResponse>(
          `/list/${listId}/task`,
          { params }
        );
        
        // Handle both JSON and text responses
        const data = response.data;
        if (typeof data === 'string') {
          throw new ClickUpServiceError(
            'Received unexpected text response from API',
            ErrorCode.UNKNOWN,
            data
          );
        }
        
        return Array.isArray(data) ? data : data.tasks || [];
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get tasks for list ${listId}`);
    }
  }

  /**
   * Get subtasks of a specific task
   * @param taskId The ID of the parent task
   * @returns Array of subtask details
   */
  async getSubtasks(taskId: string): Promise<ClickUpTask[]> {
    this.logOperation('getSubtasks', { taskId });

    try {
      return await this.makeRequest(async () => {
        const response = await this.client.get<ClickUpTask>(
          `/task/${taskId}?subtasks=true&include_subtasks=true`
        );

        // Return subtasks if present, otherwise empty array
        return response.data.subtasks || [];
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get subtasks for task ${taskId}`);
    }
  }

  /**
   * Get a task by its custom ID
   * @param customTaskId The custom ID of the task (e.g., "ABC-123")
   * @param listId Optional list ID to limit the search (Note: ClickUp API might not filter by list_id when using custom_task_id)
   * @returns The task details
   */
  async getTaskByCustomId(customTaskId: string, listId?: string): Promise<ClickUpTask> {
    // Log the operation, including listId even if the API might ignore it for this specific lookup type
    this.logOperation('getTaskByCustomId', { customTaskId, listId });

    try {
      return await this.makeRequest(async () => {
        // Use the standard task endpoint with the custom task ID
        const url = `/task/${encodeURIComponent(customTaskId)}`;

        // Add required query parameters for custom ID lookup
        const params = new URLSearchParams({
          custom_task_ids: 'true',
          team_id: this.teamId // team_id is required when custom_task_ids is true
        });

        // Debug logging for troubleshooting
        this.logger.debug('Making custom task ID API request', {
          customTaskId,
          url,
          teamId: this.teamId,
          params: params.toString(),
          fullUrl: `${url}?${params.toString()}`
        });

        // Note: The ClickUp API documentation for GET /task/{task_id} doesn't explicitly mention
        // filtering by list_id when custom_task_ids=true. This parameter might be ignored.
        if (listId) {
          this.logger.warn('listId provided to getTaskByCustomId, but the ClickUp API endpoint might not support it directly for custom ID lookups.', { customTaskId, listId });
          // If ClickUp API were to support it, you would add it like this:
          // params.append('list_id', listId);
        }

        const response = await this.client.get<ClickUpTask>(url, { params });

        // Handle potential non-JSON responses (though less likely with GET)
        const data = response.data;
        if (typeof data === 'string') {
          throw new ClickUpServiceError(
            'Received unexpected text response from API when fetching by custom ID',
            ErrorCode.UNKNOWN,
            data
          );
        }

        return data;
      });
    } catch (error) {
      // Enhanced error logging for debugging
      this.logger.error('Custom task ID request failed', {
        customTaskId,
        teamId: this.teamId,
        error: error instanceof Error ? error.message : String(error),
        errorDetails: error
      });

      // Provide more specific error context if possible
      if (error instanceof ClickUpServiceError && error.code === ErrorCode.NOT_FOUND) {
        throw new ClickUpServiceError(
          `Task with custom ID ${customTaskId} not found or not accessible for team ${this.teamId}.`,
          ErrorCode.NOT_FOUND,
          error.data
        );
      }
      throw this.handleError(error, `Failed to get task with custom ID ${customTaskId}`);
    }
  }

  /**
   * Update an existing task
   * @param taskId The ID of the task to update
   * @param updateData The data to update
   * @returns The updated task
   */
  async updateTask(taskId: string, updateData: UpdateTaskData): Promise<ClickUpTask> {
    this.logOperation('updateTask', { taskId, ...updateData });

    try {
      // Extract custom fields and assignees from updateData
      const { custom_fields, assignees, ...standardFields } = updateData;

      // Prepare the fields to send to API
      let fieldsToSend: any = { ...standardFields };

      // Handle assignees separately if provided
      if (assignees !== undefined) {
        // Get current task to compare assignees
        const currentTask = await this.getTask(taskId);
        const currentAssigneeIds = currentTask.assignees.map(a => a.id);

        let assigneesToProcess: { add: number[]; rem: number[] };

        if (Array.isArray(assignees)) {
          // If assignees is an array, calculate add/rem based on current vs new
          const newAssigneeIds = assignees as number[];
          assigneesToProcess = {
            add: newAssigneeIds.filter(id => !currentAssigneeIds.includes(id)),
            rem: currentAssigneeIds.filter(id => !newAssigneeIds.includes(id))
          };
        } else {
          // If assignees is already in add/rem format, use it directly
          assigneesToProcess = assignees as { add: number[]; rem: number[] };
        }

        // Add assignees to the fields in the correct format
        fieldsToSend.assignees = assigneesToProcess;
      }

      // First update the standard fields
      const updatedTask = await this.makeRequest(async () => {
        const response = await this.client.put<ClickUpTask | string>(
          `/task/${taskId}`,
          fieldsToSend
        );

        // Handle both JSON and text responses
        const data = response.data;
        if (typeof data === 'string') {
          // If we got a text response, try to extract task ID from common patterns
          const idMatch = data.match(/task.*?(\w{9})/i);
          if (idMatch) {
            // If we found an ID, fetch the full task details
            return await this.getTask(idMatch[1]);
          }
          throw new ClickUpServiceError(
            'Received unexpected text response from API',
            ErrorCode.UNKNOWN,
            data
          );
        }

        return data;
      });

      // Then update custom fields if provided
      if (custom_fields && Array.isArray(custom_fields) && custom_fields.length > 0) {
        // Use the setCustomFieldValues method from the inherited class
        // This will be available in TaskServiceCustomFields which extends this class
        await (this as any).setCustomFieldValues(taskId, custom_fields);

        // Fetch the task again to get the updated version with custom fields
        return await this.getTask(taskId);
      }

      // Auto-remove dependencies when task is marked as done/closed
      if (updateData.status) {
        const statusLower = updateData.status.toLowerCase();
        if (statusLower === 'done' || statusLower === 'closed' || statusLower === 'complete') {
          this.logOperation('auto-remove-dependencies', { taskId, status: updateData.status });

          try {
            const taskWithDeps = await this.getTask(taskId);

            const depsToRemove: Array<{ fromTaskId: string; dependsOn: string }> = [];

            if (taskWithDeps.dependencies) {
              for (const dep of taskWithDeps.dependencies) {
                if (dep.type === 1 && dep.depends_on === taskId && dep.task_id) {
                  depsToRemove.push({ fromTaskId: dep.task_id, dependsOn: taskId });
                }
              }
            }

            if (depsToRemove.length > 0) {
              this.logOperation('removing-dependencies', {
                completedTaskId: taskId,
                count: depsToRemove.length,
                dependencies: depsToRemove
              });

              for (const dep of depsToRemove) {
                try {
                  await this.makeRequest(async () => {
                    const queryParams = new URLSearchParams({
                      depends_on: dep.dependsOn,
                      dependency_of: dep.fromTaskId
                    });

                    await this.client.delete(
                      `/task/${dep.fromTaskId}/dependency?${queryParams.toString()}`
                    );
                  });

                  this.logOperation('removed-dependency', {
                    fromTaskId: dep.fromTaskId,
                    dependsOn: dep.dependsOn
                  });
                } catch (depError) {
                  this.logOperation('failed-to-remove-dependency', {
                    fromTaskId: dep.fromTaskId,
                    dependsOn: dep.dependsOn,
                    error: depError
                  });
                }
              }
            }
          } catch (depsError) {
            this.logOperation('dependency-removal-error', {
              taskId,
              error: depsError
            });
          }
        }
      }

      return updatedTask;
    } catch (error) {
      throw this.handleError(error, `Failed to update task ${taskId}`);
    }
  }

  /**
   * Delete a task
   * @param taskId The ID of the task to delete
   * @returns A ServiceResponse indicating success
   */
  async deleteTask(taskId: string): Promise<ServiceResponse<void>> {
    this.logOperation('deleteTask', { taskId });
    
    try {
      await this.makeRequest(async () => {
        await this.client.delete(`/task/${taskId}`);
      });
      
      return {
        success: true,
        data: undefined,
        error: undefined
      };
    } catch (error) {
      throw this.handleError(error, `Failed to delete task ${taskId}`);
    }
  }

  /**
   * Move a task to another list
   * @param taskId The ID of the task to move
   * @param destinationListId The ID of the list to move the task to
   * @returns The updated task
   */
  async moveTask(taskId: string, destinationListId: string): Promise<ClickUpTask> {
    const startTime = Date.now();
    this.logOperation('moveTask', { taskId, destinationListId, operation: 'start' });
    
    try {
      // First, get task and validate destination list
      const [sourceTask, _] = await Promise.all([
        this.validateTaskExists(taskId),
        this.validateListExists(destinationListId)
      ]);

      // Extract task data for creating the new task
      const taskData = this.extractTaskData(sourceTask);
      
      // Create the task in the new list
      const newTask = await this.createTask(destinationListId, taskData);
      
      // Delete the original task
      await this.deleteTask(taskId);
      
      // Update the cache
      this.validationCache.tasks.delete(taskId);
      this.validationCache.tasks.set(newTask.id, {
        validatedAt: Date.now(),
        task: newTask
      });

      const totalTime = Date.now() - startTime;
      this.logOperation('moveTask', { 
        taskId, 
        destinationListId, 
        operation: 'complete',
        timing: { totalTime },
        newTaskId: newTask.id
      });

      return newTask;
    } catch (error) {
      // Log failure
      this.logOperation('moveTask', { 
        taskId, 
        destinationListId, 
        operation: 'failed',
        error: error instanceof Error ? error.message : String(error),
        timing: { totalTime: Date.now() - startTime }
      });
      throw this.handleError(error, 'Failed to move task');
    }
  }

  /**
   * Duplicate a task, optionally to a different list
   * @param taskId The ID of the task to duplicate
   * @param listId Optional ID of list to create duplicate in (defaults to same list)
   * @returns The duplicated task
   */
  async duplicateTask(taskId: string, listId?: string): Promise<ClickUpTask> {
    this.logOperation('duplicateTask', { taskId, listId });
    
    try {
      // Get source task and validate destination list if provided
      const [sourceTask, _] = await Promise.all([
        this.validateTaskExists(taskId),
        listId ? this.validateListExists(listId) : Promise.resolve()
      ]);

      // Create duplicate in specified list or original list
      const targetListId = listId || sourceTask.list.id;
      const taskData = this.extractTaskData(sourceTask);
      
      return await this.createTask(targetListId, taskData);
    } catch (error) {
      throw this.handleError(error, `Failed to duplicate task ${taskId}`);
    }
  }

  /**
   * Validate a task exists and cache the result
   * @param taskId The ID of the task to validate
   * @returns The validated task
   */
  protected async validateTaskExists(taskId: string): Promise<ClickUpTask> {
    // Check cache first
    const cached = this.validationCache.tasks.get(taskId);
    if (cached && Date.now() - cached.validatedAt < this.CACHE_TTL) {
      this.logger.debug('Using cached task validation', { taskId });
      return cached.task;
    }

    // Not in cache or expired, fetch task
    const task = await this.getTask(taskId);
    
    // Cache the validation result
    this.validationCache.tasks.set(taskId, {
      validatedAt: Date.now(),
      task
    });

    return task;
  }

  /**
   * Validate that multiple tasks exist
   * @param taskIds Array of task IDs to validate
   * @returns Map of task IDs to task objects
   */
  public async validateTasksExist(taskIds: string[]): Promise<Map<string, ClickUpTask>> {
    const results = new Map<string, ClickUpTask>();
    const toFetch: string[] = [];

    // Check cache first
    for (const taskId of taskIds) {
      const cached = this.validationCache.tasks.get(taskId);
      if (cached && Date.now() - cached.validatedAt < this.CACHE_TTL) {
        results.set(taskId, cached.task);
      } else {
        toFetch.push(taskId);
      }
    }

    if (toFetch.length > 0) {
      // Fetch uncached tasks in parallel batches
      const batchSize = 5;
      for (let i = 0; i < toFetch.length; i += batchSize) {
        const batch = toFetch.slice(i, i + batchSize);
        const tasks = await Promise.all(
          batch.map(id => this.getTask(id))
        );

        // Cache and store results
        tasks.forEach((task, index) => {
          const taskId = batch[index];
          this.validationCache.tasks.set(taskId, {
            validatedAt: Date.now(),
            task
          });
          results.set(taskId, task);
        });
      }
    }

    return results;
  }

  /**
   * Validate a list exists and cache the result
   * @param listId The ID of the list to validate
   */
  async validateListExists(listId: string): Promise<void> {
    // Check cache first
    const cached = this.validationCache.lists.get(listId);
    if (cached && Date.now() - cached.validatedAt < this.CACHE_TTL) {
      this.logger.debug('Using cached list validation', { listId });
      if (!cached.valid) {
        throw new ClickUpServiceError(
          `List ${listId} does not exist`,
          ErrorCode.NOT_FOUND
        );
      }
      return;
    }

    try {
      await this.listService.getList(listId);
      
      // Cache the successful validation
      this.validationCache.lists.set(listId, {
        validatedAt: Date.now(),
        valid: true
      });
    } catch (error) {
      // Cache the failed validation
      this.validationCache.lists.set(listId, {
        validatedAt: Date.now(),
        valid: false
      });
      throw error;
    }
  }

  /**
   * Try to get a task ID from the name cache
   * @param taskName The name of the task
   * @param listId Optional list ID for context
   * @returns The cached task ID if found and not expired, otherwise null
   */
  protected getCachedTaskId(taskName: string, listId?: string): string | null {
    const cached = this.nameToIdCache.get(taskName);
    if (cached && Date.now() - cached.validatedAt < this.CACHE_TTL) {
      // If listId is provided, ensure it matches the cached context
      if (!listId || cached.listId === listId) {
        this.logger.debug('Using cached task ID for name', { taskName, cachedId: cached.taskId });
        return cached.taskId;
      }
    }
    return null;
  }

  /**
   * Cache a task name to ID mapping
   * @param taskName The name of the task
   * @param taskId The ID of the task
   * @param listId Optional list ID for context
   */
  protected cacheTaskNameToId(taskName: string, taskId: string, listId?: string): void {
    this.nameToIdCache.set(taskName, {
      taskId,
      validatedAt: Date.now(),
      listId
    });
    this.logger.debug('Cached task name to ID mapping', { taskName, taskId, listId });
  }
}

