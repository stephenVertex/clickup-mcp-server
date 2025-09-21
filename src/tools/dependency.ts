/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Task dependency management tools for the MCP server
 */

import { clickUpServices } from '../services/shared.js';
import { Logger } from '../logger.js';
import { DependencyType } from '../services/clickup/types.js';

const logger = new Logger('DependencyTools');

/**
 * Tool definition for adding a task dependency
 */
export const addTaskDependencyTool = {
  name: 'add_task_dependency',
  description: 'Add a dependency between two tasks. Set one task as waiting on or blocking another task.',
  inputSchema: {
    type: 'object',
    properties: {
      task_id: {
        type: 'string',
        description: 'The ID of the task to add the dependency to'
      },
      depends_on: {
        type: 'string',
        description: 'The ID of the task that this task depends on'
      },
      dependency_type: {
        type: 'string',
        enum: ['waiting_on', 'blocking'],
        description: 'Type of dependency: "waiting_on" (this task is waiting on the other) or "blocking" (this task is blocking the other). Default is "waiting_on"'
      }
    },
    required: ['task_id', 'depends_on']
  }
};

/**
 * Tool definition for removing a task dependency
 */
export const removeTaskDependencyTool = {
  name: 'remove_task_dependency',
  description: 'Remove a dependency relationship between two tasks',
  inputSchema: {
    type: 'object',
    properties: {
      task_id: {
        type: 'string',
        description: 'The ID of the task to remove the dependency from'
      },
      depends_on: {
        type: 'string',
        description: 'The ID of the task that this task depends on'
      },
      dependency_type: {
        type: 'string',
        enum: ['waiting_on', 'blocking'],
        description: 'Type of dependency to remove: "waiting_on" or "blocking". Default is "waiting_on"'
      }
    },
    required: ['task_id', 'depends_on']
  }
};

/**
 * Tool definition for getting task dependencies
 */
export const getTaskDependenciesTool = {
  name: 'get_task_dependencies',
  description: 'Get the dependencies and linked tasks for a specific task. Dependencies are returned as part of the task details.',
  inputSchema: {
    type: 'object',
    properties: {
      task_id: {
        type: 'string',
        description: 'The ID of the task to get dependencies for'
      }
    },
    required: ['task_id']
  }
};

/**
 * Handler for adding a task dependency
 */
export async function handleAddTaskDependency(params: any) {
  const { task_id, depends_on, dependency_type = 'waiting_on' } = params;

  logger.info('Adding task dependency', { task_id, depends_on, dependency_type });

  try {
    const type: DependencyType = dependency_type === 'blocking' ? 1 : 0;
    const result = await clickUpServices.task.addDependency(task_id, depends_on, type);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Successfully added dependency: Task ${task_id} is ${dependency_type === 'blocking' ? 'blocking' : 'waiting on'} task ${depends_on}`,
            dependency: result
          }, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error('Failed to add task dependency', error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            message: `Failed to add dependency: ${error.message}`
          }, null, 2)
        }
      ]
    };
  }
}

/**
 * Handler for removing a task dependency
 */
export async function handleRemoveTaskDependency(params: any) {
  const { task_id, depends_on, dependency_type = 'waiting_on' } = params;

  logger.info('Removing task dependency', { task_id, depends_on, dependency_type });

  try {
    const type: DependencyType = dependency_type === 'blocking' ? 1 : 0;
    await clickUpServices.task.removeDependency(task_id, depends_on, type);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Successfully removed dependency between task ${task_id} and task ${depends_on}`
          }, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error('Failed to remove task dependency', error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            message: `Failed to remove dependency: ${error.message}`
          }, null, 2)
        }
      ]
    };
  }
}

/**
 * Handler for getting task dependencies
 */
export async function handleGetTaskDependencies(params: any) {
  const { task_id } = params;

  logger.info('Getting task dependencies', { task_id });

  try {
    const task = await clickUpServices.task.getTask(task_id);

    const response = {
      success: true,
      task_id: task.id,
      task_name: task.name,
      dependencies: task.dependencies || [],
      linked_tasks: task.linked_tasks || [],
      parent: task.parent,
      subtasks: task.subtasks?.map(st => ({
        id: st.id,
        name: st.name,
        status: st.status
      })) || []
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error('Failed to get task dependencies', error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            message: `Failed to get task dependencies: ${error.message}`
          }, null, 2)
        }
      ]
    };
  }
}