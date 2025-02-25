#!/usr/bin/env node

/**
 * ClickUp MCP Server - A Model Context Protocol server for ClickUp integration
 * 
 * This server enables AI applications to interact with ClickUp through a standardized protocol.
 * Key capabilities include:
 * 
 * Tools:
 * - Task Management: Create, update, move and duplicate tasks
 * - Bulk task creation and management
 * - Workspace Organization: Create lists, folders and manage hierarchy
 * - Smart lookups by name or ID with case-insensitive matching
 * 
 * Prompts:
 * - Task summarization and status grouping
 * - Priority analysis and optimization
 * - Detailed task description generation
 * - Task relationship insights
 * 
 * Features markdown support, secure credential handling, and comprehensive error reporting.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ClickUpService } from "./services/clickup.js";
import config from "./config.js";
import { 
  CreateTaskData, 
  UpdateTaskData, 
  ClickUpTask, 
  CreateListData, 
  CreateFolderData,
  WorkspaceNode
} from "./types/clickup.js";

// Initialize ClickUp service
const clickup = ClickUpService.initialize(config.clickupApiKey, config.clickupTeamId);

/**
 * Create an MCP server with capabilities for tools and prompts.
 * Resources have been removed as they are being replaced with direct tool calls.
 */
const server = new Server(
  {
    name: "clickup-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

/**
 * Handler that lists available tools.
 * Exposes tools for listing spaces, creating tasks, and updating tasks.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_workspace_hierarchy",
        description: "Get the complete hierarchy of spaces, folders, and lists in the workspace.  Important: If looking up information, first check chat history for space, folder, and list names or ID matches.  If not found, use this tool to get necessary information.",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "create_task",
        description: "Create a new task in ClickUp. Supports direct name-based lookup for lists - no need to know the list ID. Status will use ClickUp defaults if not specified.  If the specified list doesn't exist, you can create it using create_list or create_list_in_folder.",
        inputSchema: {
          type: "object",
          properties: {
            listId: {
              type: "string",
              description: "ID of the list to create the task in (optional if using listName instead)"
            },
            listName: {
              type: "string",
              description: "Name of the list to create the task in - will automatically find the list by name (optional if using listId instead)"
            },
            name: {
              type: "string",
              description: "Name of the task. Put a relevant emoji followed by a blank space before the name."
            },
            description: {
              type: "string",
              description: "Plain text description for the task"
            },
            markdown_description: {
              type: "string", 
              description: "Markdown formatted description for the task. If provided, this takes precedence over description"
            },
            status: {
              type: "string",
              description: "OPTIONAL: Override the default ClickUp status. In most cases, you should omit this to use ClickUp defaults"
            },
            priority: {
              type: "number",
              description: "Priority of the task (1-4), 1 is urgent/highest priority, 4 is lowest priority. Only set this if priority is explicitly mentioned in the user's request."
            },
            dueDate: {
              type: "string",
              description: "Due date of the task (Unix timestamp in milliseconds)"
            }
          },
          required: ["name"]
        }
      },
      {
        name: "create_bulk_tasks",
        description: "Create multiple tasks in a ClickUp list. Supports direct name-based lookup for lists - no need to know the list ID. Tasks will use ClickUp default status if not specified. If the specified list doesn't exist, you can create it using create_list or create_list_in_folder.",
        inputSchema: {
          type: "object",
          properties: {
            listId: {
              type: "string",
              description: "ID of the list to create the tasks in (optional if using listName instead)"
            },
            listName: {
              type: "string",
              description: "Name of the list to create the tasks in - will automatically find the list by name (optional if using listId instead)"
            },
            tasks: {
              type: "array",
              description: "Array of tasks to create",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Name of the task"
                  },
                  description: {
                    type: "string",
                    description: "Plain text description for the task"
                  },
                  markdown_description: {
                    type: "string",
                    description: "Markdown formatted description for the task. If provided, this takes precedence over description"
                  },
                  status: {
                    type: "string",
                    description: "OPTIONAL: Override the default ClickUp status. In most cases, you should omit this to use ClickUp defaults"
                  },
                  priority: {
                    type: "number",
                    description: "Priority level (1-4), 1 is urgent/highest priority, 4 is lowest priority. Only set this if priority is explicitly mentioned in the user's request."
                  },
                  dueDate: {
                    type: "string",
                    description: "Due date (Unix timestamp in milliseconds)"
                  },
                  assignees: {
                    type: "array",
                    items: {
                      type: "number"
                    },
                    description: "Array of user IDs to assign to the task"
                  }
                },
                required: ["name"]
              }
            }
          },
          required: ["listId", "tasks"]
        }
      },
      {
        name: "create_list",
        description: "Create a new list in a ClickUp space. Supports direct name-based lookup for spaces - no need to know the space ID. If the specified space doesn't exist, you can create it through the ClickUp web interface (space creation via API not supported).",
        inputSchema: {
          type: "object",
          properties: {
            spaceId: {
              type: "string",
              description: "ID of the space to create the list in (optional if using spaceName instead)"
            },
            spaceName: {
              type: "string",
              description: "Name of the space to create the list in - will automatically find the space by name (optional if using spaceId instead)"
            },
            name: {
              type: "string",
              description: "Name of the list"
            },
            content: {
              type: "string",
              description: "Description or content of the list"
            },
            dueDate: {
              type: "string",
              description: "Due date for the list (ISO string)"
            },
            priority: {
              type: "number",
              description: "Priority of the list (1-4). Only set this if priority is explicitly mentioned in the user's request."
            },
            assignee: {
              type: "number",
              description: "User ID to assign the list to"
            },
            status: {
              type: "string",
              description: "Status of the list"
            }
          },
          required: ["name"]
        }
      },
      {
        name: "create_folder",
        description: "Create a new folder in a ClickUp space. Supports direct name-based lookup for spaces - no need to know the space ID. If the specified space doesn't exist, you can create it through the ClickUp web interface (space creation via API not supported).",
        inputSchema: {
          type: "object",
          properties: {
            spaceId: {
              type: "string",
              description: "ID of the space to create the folder in (optional if using spaceName instead)"
            },
            spaceName: {
              type: "string",
              description: "Name of the space to create the folder in - will automatically find the space by name (optional if using spaceId instead)"
            },
            name: {
              type: "string",
              description: "Name of the folder"
            },
            override_statuses: {
              type: "boolean",
              description: "Whether to override space statuses"
            }
          },
          required: ["name"]
        }
      },
      {
        name: "create_list_in_folder",
        description: "Create a new list in a ClickUp folder. Supports direct name-based lookup for folders and spaces - no need to know IDs. If the specified folder doesn't exist, you can create it using create_folder. If the space doesn't exist, it must be created through the ClickUp web interface.",
        inputSchema: {
          type: "object",
          properties: {
            folderId: {
              type: "string",
              description: "ID of the folder to create the list in (optional if using folderName instead)"
            },
            folderName: {
              type: "string",
              description: "Name of the folder to create the list in - will automatically find the folder by name (optional if using folderId instead)"
            },
            spaceId: {
              type: "string",
              description: "ID of the space containing the folder (optional if using spaceName instead)"
            },
            spaceName: {
              type: "string",
              description: "Name of the space containing the folder - will automatically find the space by name (optional if using spaceId instead)"
            },
            name: {
              type: "string",
              description: "Name of the list"
            },
            content: {
              type: "string",
              description: "Description or content of the list"
            },
            status: {
              type: "string",
              description: "Status of the list"
            }
          },
          required: ["name"]
        }
      },
      {
        name: "move_task",
        description: "Move a task to a different list. Supports direct name-based lookup for lists and tasks - no need to know IDs.",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to move (optional if using taskName instead)"
            },
            taskName: {
              type: "string",
              description: "Name of the task to move - will automatically find the task by name (optional if using taskId instead)"
            },
            sourceListName: {
              type: "string",
              description: "Optional: Name of the list to narrow down task search"
            },
            listId: {
              type: "string",
              description: "ID of the destination list (optional if using listName instead)"
            },
            listName: {
              type: "string",
              description: "Name of the destination list - will automatically find the list by name (optional if using listId instead)"
            }
          },
          required: []
        }
      },
      {
        name: "duplicate_task",
        description: "Duplicate a task to a list. Supports direct name-based lookup for lists - no need to know the list ID. If the destination list doesn't exist, you can create it using create_list or create_list_in_folder.",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to duplicate (optional if using taskName instead)"
            },
            taskName: {
              type: "string",
              description: "Name of the task to duplicate - will automatically find the task by name (optional if using taskId instead)"
            },
            sourceListName: {
              type: "string",
              description: "Optional: Name of the list to narrow down task search"
            },
            listId: {
              type: "string",
              description: "ID of the list to create the duplicate in (optional if using listName instead)"
            },
            listName: {
              type: "string",
              description: "Name of the list to create the duplicate in - will automatically find the list by name (optional if using listId instead)"
            }
          },
          required: []
        }
      },
      {
        name: "update_task",
        description: "Update an existing task in ClickUp. Supports direct name-based lookup for tasks - no need to know the task ID.",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to update (optional if using taskName instead)"
            },
            taskName: {
              type: "string",
              description: "Name of the task to update - will automatically find the task by name (optional if using taskId instead)"
            },
            listName: {
              type: "string",
              description: "Optional: Name of the list to narrow down task search"
            },
            name: {
              type: "string",
              description: "New name of the task"
            },
            description: {
              type: "string",
              description: "New description of the task"
            },
            status: {
              type: "string",
              description: "New status of the task"
            },
            priority: {
              type: "number",
              description: "New priority of the task (1-4). Only set this if priority is explicitly mentioned in the user's request."
            },
            dueDate: {
              type: "string",
              description: "New due date of the task (ISO string)"
            }
          },
          required: []
        }
      },
      {
        name: "get_tasks",
        description: "Get tasks from a ClickUp list with optional filters. Supports direct name-based lookup for lists - no need to know the list ID. If the list doesn't exist, you can create it using create_list or create_list_in_folder. ",
        inputSchema: {
          type: "object",
          properties: {
            listId: {
              type: "string",
              description: "ID of the list to get tasks from (optional if using listName instead)"
            },
            listName: {
              type: "string",
              description: "Name of the list to get tasks from - will automatically find the list by name (optional if using listId instead)"
            },
            archived: {
              type: "boolean",
              description: "Include archived tasks"
            },
            page: {
              type: "number",
              description: "Page number for pagination"
            },
            order_by: {
              type: "string",
              description: "Field to order tasks by"
            },
            reverse: {
              type: "boolean",
              description: "Reverse the order of tasks"
            },
            subtasks: {
              type: "boolean",
              description: "Include subtasks"
            },
            statuses: {
              type: "array",
              items: { type: "string" },
              description: "Filter tasks by status"
            },
            include_closed: {
              type: "boolean",
              description: "Include closed tasks"
            },
            assignees: {
              type: "array",
              items: { type: "string" },
              description: "Filter tasks by assignee IDs"
            },
            due_date_gt: {
              type: "number",
              description: "Filter tasks due after this timestamp"
            },
            due_date_lt: {
              type: "number",
              description: "Filter tasks due before this timestamp"
            },
            date_created_gt: {
              type: "number",
              description: "Filter tasks created after this timestamp"
            },
            date_created_lt: {
              type: "number",
              description: "Filter tasks created before this timestamp"
            },
            date_updated_gt: {
              type: "number",
              description: "Filter tasks updated after this timestamp"
            },
            date_updated_lt: {
              type: "number",
              description: "Filter tasks updated before this timestamp"
            },
            custom_fields: {
              type: "object",
              description: "Filter tasks by custom field values"
            }
          },
          required: []
        }
      },
      {
        name: "get_task",
        description: "Get detailed information about a specific ClickUp task, including attachments. Supports direct name-based lookup for tasks.",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to retrieve (optional if using taskName instead)"
            },
            taskName: {
              type: "string",
              description: "Name of the task to retrieve - will automatically find the task by name (optional if using taskId instead)"
            },
            listName: {
              type: "string",
              description: "Optional: Name of the list to narrow down task search"
            }
          },
          required: []
        }
      },
      {
        name: "delete_task",
        description: "Delete a task from your workspace. This action cannot be undone.",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to delete"
            }
          },
          required: ["taskId"]
        }
      }
    ]
  };
});

/**
 * Handler for the CallToolRequestSchema.
 * Handles the execution of tools like listing spaces, creating tasks, and updating tasks.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "get_workspace_hierarchy": {
        const hierarchy = await clickup.getWorkspaceHierarchy();
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              workspace: {
                id: hierarchy.root.id,
                name: hierarchy.root.name,
                spaces: hierarchy.root.children.map((space: WorkspaceNode) => ({
                  id: space.id,
                  name: space.name,
                  lists: space.children
                    .filter((node: WorkspaceNode) => node.type === 'list')
                    .map((list: WorkspaceNode) => ({
                      id: list.id,
                      name: list.name,
                      path: `${space.name} > ${list.name}`
                    })),
                  folders: space.children
                    .filter((node: WorkspaceNode) => node.type === 'folder')
                    .map((folder: WorkspaceNode) => ({
                      id: folder.id,
                      name: folder.name,
                      path: `${space.name} > ${folder.name}`,
                      lists: folder.children.map((list: WorkspaceNode) => ({
                        id: list.id,
                        name: list.name,
                        path: `${space.name} > ${folder.name} > ${list.name}`
                      }))
                    }))
                }))
              }
            }, null, 2)
          }]
        };
      }

      case "create_task": {
        const args = request.params.arguments as unknown as CreateTaskData & { listId: string; listName?: string };
        if (!args.listId && !args.listName) {
          throw new Error("Either listId or listName is required");
        }
        if (!args.name) {
          throw new Error("name is required");
        }

        let listId = args.listId;
        if (!listId && args.listName) {
          const hierarchy = await clickup.getWorkspaceHierarchy();
          const result = clickup.findIDByNameInHierarchy(hierarchy, args.listName, 'list');
          if (!result) {
            throw new Error(`List with name "${args.listName}" not found`);
          }
          listId = result.id;
        }

        const { listId: _, listName: __, ...taskData } = args;
        const task = await clickup.createTask(listId, taskData);
        return {
          content: [{
            type: "text",
            text: `Created task ${task.id}: ${task.name}`
          }]
        };
      }

      case "create_bulk_tasks": {
        const args = request.params.arguments as unknown as { listId: string; listName?: string; tasks: CreateTaskData[] };
        if (!args.listId && !args.listName) {
          throw new Error("Either listId or listName is required");
        }
        if (!args.tasks || args.tasks.length === 0) {
          throw new Error("tasks array is required and must not be empty");
        }

        let listId = args.listId;
        if (!listId && args.listName) {
          const result = await clickup.findListIDByName(args.listName);
          if (!result) {
            throw new Error(`List with name "${args.listName}" not found`);
          }
          listId = result.id;
        }

        const { listId: _, listName: __, tasks } = args;
        const createdTasks = await clickup.createBulkTasks(listId, { tasks });
        return {
          content: [{
            type: "text",
            text: `Created ${createdTasks.length} tasks`
          }]
        };
      }

      case "create_list": {
        const args = request.params.arguments as unknown as CreateListData & { spaceId?: string; spaceName?: string };
        if (!args.name) {
          throw new Error("name is required");
        }
        
        let spaceId = args.spaceId;
        if (!spaceId && args.spaceName) {
          const foundId = await clickup.findSpaceIDByName(args.spaceName);
          if (!foundId) {
            throw new Error(`Space with name "${args.spaceName}" not found`);
          }
          spaceId = foundId;
        }
        
        if (!spaceId) {
          throw new Error("Either spaceId or spaceName must be provided");
        }

        const { spaceId: _, spaceName: __, ...listData } = args;
        const list = await clickup.createList(spaceId, listData);
        return {
          content: [{
            type: "text",
            text: `Created list ${list.id}: ${list.name}`
          }]
        };
      }

      case "create_folder": {
        const args = request.params.arguments as unknown as CreateFolderData & { spaceId?: string; spaceName?: string };
        if (!args.name) {
          throw new Error("name is required");
        }
        
        let spaceId = args.spaceId;
        if (!spaceId && args.spaceName) {
          const foundId = await clickup.findSpaceIDByName(args.spaceName);
          if (!foundId) {
            throw new Error(`Space with name "${args.spaceName}" not found`);
          }
          spaceId = foundId;
        }
        
        if (!spaceId) {
          throw new Error("Either spaceId or spaceName must be provided");
        }

        const { spaceId: _, spaceName: __, ...folderData } = args;
        const folder = await clickup.createFolder(spaceId, folderData);
        return {
          content: [{
            type: "text",
            text: `Created folder ${folder.id}: ${folder.name}`
          }]
        };
      }

      case "create_list_in_folder": {
        const args = request.params.arguments as unknown as CreateListData & {
          folderId?: string;
          folderName?: string;
          spaceId?: string;
          spaceName?: string;
        };

        if (!args.name) {
          throw new Error("name is required");
        }

        let folderId = args.folderId;
        if (!folderId && args.folderName) {
          const result = await clickup.findFolderIDByName(args.folderName);
          if (!result) {
            throw new Error(`Folder with name "${args.folderName}" not found`);
          }
          folderId = result.id;
        }

        if (!folderId) {
          throw new Error("Either folderId or folderName must be provided");
        }

        const { folderId: _, folderName: __, spaceId: ___, spaceName: ____, ...listData } = args;
        const list = await clickup.createListInFolder(folderId, listData);
        return {
          content: [{
            type: "text",
            text: `Created list ${list.id}: ${list.name} in folder`
          }]
        };
      }

      case "move_task": {
        const args = request.params.arguments as { 
          taskId?: string;
          taskName?: string;
          sourceListName?: string;
          listId?: string;
          listName?: string;
        };

        if (!args.taskId && !args.taskName) {
          throw new Error("Either taskId or taskName is required");
        }
        if (!args.listId && !args.listName) {
          throw new Error("Either listId or listName is required");
        }

        let taskId = args.taskId;
        if (!taskId && args.taskName) {
          const result = await clickup.findTaskByName(args.taskName, undefined, args.sourceListName);
          if (!result) {
            throw new Error(`Task with name "${args.taskName}" not found${
              args.sourceListName ? ` in list "${args.sourceListName}"` : ''
            }`);
          }
          taskId = result.id;
        }

        let listId = args.listId;
        if (!listId && args.listName) {
          const result = await clickup.findListIDByName(args.listName);
          if (!result) {
            throw new Error(`List with name "${args.listName}" not found`);
          }
          listId = result.id;
        }

        // Get the original task details for the response message
        const originalTask = await clickup.getTask(taskId!);
        const newTask = await clickup.moveTask(taskId!, listId!);
        
        return {
          content: [{
            type: "text",
            text: `Moved task "${originalTask.name}" from "${originalTask.list.name}" to "${newTask.list.name}"`
          }]
        };
      }

      case "duplicate_task": {
        const args = request.params.arguments as { 
          taskId?: string;
          taskName?: string;
          sourceListName?: string;
          listId?: string;
          listName?: string;
        };

        // Require either taskId or taskName
        if (!args.taskId && !args.taskName) {
          throw new Error("Either taskId or taskName is required");
        }
        // Require either listId or listName
        if (!args.listId && !args.listName) {
          throw new Error("Either listId or listName is required");
        }

        // Get taskId from taskName if needed
        let taskId = args.taskId;
        if (!taskId && args.taskName) {
          const result = await clickup.findTaskByName(args.taskName, undefined, args.sourceListName);
          if (!result) {
            throw new Error(`Task with name "${args.taskName}" not found${
              args.sourceListName ? ` in list "${args.sourceListName}"` : ''
            }`);
          }
          taskId = result.id;
        }

        // Get listId from listName if needed
        let listId = args.listId;
        if (!listId && args.listName) {
          const result = await clickup.findListIDByName(args.listName);
          if (!result) {
            throw new Error(`List with name "${args.listName}" not found`);
          }
          listId = result.id;
        }

        // Get the original task details for the response message
        const originalTask = await clickup.getTask(taskId!);
        const newTask = await clickup.duplicateTask(taskId!, listId!);
        
        return {
          content: [{
            type: "text",
            text: `Duplicated task "${originalTask.name}" from "${originalTask.list.name}" to "${newTask.list.name}"`
          }]
        };
      }

      case "update_task": {
        const args = request.params.arguments as unknown as UpdateTaskData & { 
          taskId?: string;
          taskName?: string;
          listName?: string;
        };

        if (!args.taskId && !args.taskName) {
          throw new Error("Either taskId or taskName is required");
        }

        let taskId = args.taskId;
        if (!taskId && args.taskName) {
          const result = await clickup.findTaskByName(args.taskName, undefined, args.listName);
          if (!result) {
            throw new Error(`Task with name "${args.taskName}" not found${
              args.listName ? ` in list "${args.listName}"` : ''
            }`);
          }
          taskId = result.id;
        }

        const { taskId: _, taskName: __, listName: ___, ...updateData } = args;
        const task = await clickup.updateTask(taskId!, updateData);
        return {
          content: [{
            type: "text",
            text: `Updated task ${task.id}: ${task.name}`
          }]
        };
      }

      case "get_tasks": {
        const args = request.params.arguments as { 
          listId?: string; 
          listName?: string;
          archived?: boolean;
          page?: number;
          order_by?: string;
          reverse?: boolean;
          subtasks?: boolean;
          statuses?: string[];
          include_closed?: boolean;
          assignees?: string[];
          due_date_gt?: number;
          due_date_lt?: number;
          date_created_gt?: number;
          date_created_lt?: number;
          date_updated_gt?: number;
          date_updated_lt?: number;
          custom_fields?: Record<string, any>;
        };

        if (!args.listId && !args.listName) {
          throw new Error("Either listId or listName is required");
        }

        let listId = args.listId;
        if (!listId && args.listName) {
          const result = await clickup.findListIDByName(args.listName);
          if (!result) {
            throw new Error(`List with name "${args.listName}" not found`);
          }
          listId = result.id;
        }

        // Remove listId and listName from filters
        const { listId: _, listName: __, ...filters } = args;
        const { tasks, statuses } = await clickup.getTasks(listId!, filters);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ tasks, available_statuses: statuses }, null, 2)
          }]
        };
      }

      case "get_task": {
        const args = request.params.arguments as { 
          taskId?: string;
          taskName?: string;
          listName?: string;
        };

        if (!args.taskId && !args.taskName) {
          throw new Error("Either taskId or taskName is required");
        }

        let taskId = args.taskId;
        if (!taskId && args.taskName) {
          const result = await clickup.findTaskByName(args.taskName, undefined, args.listName);
          if (!result) {
            throw new Error(`Task with name "${args.taskName}" not found${
              args.listName ? ` in list "${args.listName}"` : ''
            }`);
          }
          taskId = result.id;
        }

        const task = await clickup.getTask(taskId!);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(task, null, 2)
          }]
        };
      }

      case "delete_task": {
        const args = request.params.arguments as { 
          taskId?: string;
          taskName?: string;
          listName?: string;
        };

        if (!args.taskId && !args.taskName) {
          throw new Error("Either taskId or taskName is required");
        }

        let taskId = args.taskId;
        if (!taskId && args.taskName) {
          const result = await clickup.findTaskByName(args.taskName, undefined, args.listName);
          if (!result) {
            throw new Error(`Task with name "${args.taskName}" not found${
              args.listName ? ` in list "${args.listName}"` : ''
            }`);
          }
          taskId = result.id;
        }

        await clickup.deleteTask(taskId!);
        return {
          content: [{
            type: "text",
            text: `Successfully deleted task ${args.taskName || taskId}`
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    console.error('Error in tool call:', error);
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
});

/**
 * Add handlers for listing and getting prompts.
 * Prompts include summarizing tasks, analyzing priorities, and generating task descriptions.
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "summarize_tasks",
        description: "Summarize all tasks in a list",
      },
      {
        name: "analyze_priorities",
        description: "Analyze task priorities and suggest optimizations",
      },
      {
        name: "generate_description",
        description: "Generate a detailed description for a task",
      }
    ]
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "summarize_tasks": {
        const spaces = await clickup.getSpaces(config.clickupTeamId);
        const tasks = [];

        // Gather all tasks
        for (const space of spaces) {
          const lists = await clickup.getLists(space.id);
          for (const list of lists) {
            const { tasks: listTasks } = await clickup.getTasks(list.id);
            tasks.push(...listTasks.map((task: ClickUpTask) => ({
              type: "resource" as const,
              resource: {
                uri: `clickup://task/${task.id}`,
                mimeType: "application/json",
                text: JSON.stringify(task, null, 2)
              }
            })));
          }
        }

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Please provide a summary of the following ClickUp tasks:"
              }
            },
            ...tasks.map(task => ({
              role: "user" as const,
              content: task
            })),
            {
              role: "user",
              content: {
                type: "text",
                text: "Please provide:\n1. A high-level overview of all tasks\n2. Group them by status\n3. Highlight any urgent or high-priority items\n4. Suggest any task dependencies or relationships"
              }
            }
          ]
        };
      }

      case "analyze_priorities": {
        const spaces = await clickup.getSpaces(config.clickupTeamId);
        const tasks = [];

        for (const space of spaces) {
          const lists = await clickup.getLists(space.id);
          for (const list of lists) {
            const { tasks: listTasks } = await clickup.getTasks(list.id);
            tasks.push(...listTasks.map((task: ClickUpTask) => ({
              type: "resource" as const,
              resource: {
                uri: `clickup://task/${task.id}`,
                mimeType: "application/json",
                text: JSON.stringify(task, null, 2)
              }
            })));
          }
        }

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Analyze the priorities of the following ClickUp tasks:"
              }
            },
            ...tasks.map(task => ({
              role: "user" as const,
              content: task
            })),
            {
              role: "user",
              content: {
                type: "text",
                text: "Please provide:\n1. Analysis of current priority distribution\n2. Identify any misaligned priorities\n3. Suggest priority adjustments\n4. Recommend task sequencing based on priorities"
              }
            }
          ]
        };
      }

      case "generate_description": {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Please help me generate a detailed description for a ClickUp task. The description should include:\n1. Clear objective\n2. Success criteria\n3. Required resources\n4. Dependencies\n5. Potential risks\n\nPlease ask me about the task details."
              }
            }
          ]
        };
      }

      default:
        throw new Error("Unknown prompt");
    }
  } catch (error) {
    console.error('Error handling prompt:', error);
    throw error;
  }
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
