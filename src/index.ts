#!/usr/bin/env node

/**
 * ClickUp MCP Server - A Model Context Protocol server for ClickUp integration
 * 
 * This server enables AI applications to interact with ClickUp through a standardized protocol,
 * allowing AI assistants to manage tasks, lists, and folders in ClickUp workspaces.
 * 
 * Key capabilities include:
 * 
 * Task Management:
 * - Create, update, move and duplicate tasks with rich description support
 * - Find tasks by name with smart disambiguation
 * - Bulk task creation for efficient workflow setup
 * - Comprehensive filtering and sorting options
 * 
 * Workspace Organization:
 * - Navigate and discover workspace structure with hierarchical views
 * - Create and manage lists and folders with proper nesting
 * - Smart name-based lookups that eliminate the need for IDs
 * - Support for priorities, statuses, and due dates
 * 
 * AI-Enhanced Capabilities:
 * - Task summarization and status grouping for project overviews
 * - Priority analysis and optimization for workload balancing
 * - Detailed task description generation with structured content
 * - Task relationship identification for dependency management
 * 
 * Technical Features:
 * - Full markdown support for rich text content
 * - Secure credential handling through configuration
 * - Comprehensive error reporting and validation
 * - Name-based entity resolution with fuzzy matching
 * 
 * This implementation follows the Model Context Protocol specification and
 * is designed to be used with AI assistants that support MCP.
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
  WorkspaceNode,
  TaskPriority,
  ClickUpList
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
    version: "0.4.50",
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
        description: "Retrieve the complete ClickUp workspace hierarchy, including all spaces, folders, and lists with their IDs, names, and hierarchical paths. Call this tool only when you need to discover the workspace structure and don't already have this information from recent context. Avoid using for repeated lookups of the same information.",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "create_task",
        description: "Create a single task in a ClickUp list. Use this tool for individual task creation only. For multiple tasks, use create_bulk_tasks instead. Before calling this tool, check if you already have the necessary list ID from previous responses in the conversation history, as this avoids redundant lookups. When creating a task, you must provide either a listId or listName.",
        inputSchema: {
          type: "object",
          properties: {
            listId: {
              type: "string",
              description: "ID of the list to create the task in (optional if using listName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            listName: {
              type: "string",
              description: "Name of the list to create the task in - will automatically find the list by name (optional if using listId instead). Only use this if you don't already have the list ID from previous responses."
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
              description: "Priority of the task (1-4), where 1 is urgent/highest priority and 4 is lowest priority. Only set this when the user explicitly requests a priority level."
            },
            dueDate: {
              type: "string",
              description: "Due date of the task (Unix timestamp in milliseconds). Convert dates to this format before submitting."
            }
          },
          required: ["name"],
          oneOf: [
            { required: ["listId"] },
            { required: ["listName"] }
          ]
        }
      },
      {
        name: "create_bulk_tasks",
        description: "Create multiple tasks in a ClickUp list simultaneously. Use this tool when you need to add several related tasks in one operation. Before calling, check if you already have the necessary list ID from previous responses in the conversation, as this avoids redundant lookups. More efficient than creating tasks one by one for batch operations.",
        inputSchema: {
          type: "object",
          properties: {
            listId: {
              type: "string",
              description: "ID of the list to create the tasks in (optional if using listName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            listName: {
              type: "string",
              description: "Name of the list to create the tasks in - will automatically find the list by name (optional if using listId instead). Only use this if you don't already have the list ID from previous responses."
            },
            tasks: {
              type: "array",
              description: "Array of tasks to create (at least one task required)",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Name of the task. Consider adding a relevant emoji before the name."
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
                    description: "Priority level (1-4), where 1 is urgent/highest priority and 4 is lowest priority. Only set when explicitly requested."
                  },
                  dueDate: {
                    type: "string",
                    description: "Due date (Unix timestamp in milliseconds). Convert dates to this format before submitting."
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
          required: ["tasks"],
          oneOf: [
            { required: ["listId"] },
            { required: ["listName"] }
          ]
        }
      },
      {
        name: "create_list",
        description: "Create a new list directly in a ClickUp space. Use this tool when you need a top-level list not nested inside a folder. Before calling, check if you already have the necessary space ID from previous responses in the conversation, as this avoids redundant lookups. For creating lists inside folders, use create_list_in_folder instead.",
        inputSchema: {
          type: "object",
          properties: {
            spaceId: {
              type: "string",
              description: "ID of the space to create the list in (required if not using folderId). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            folderId: {
              type: "string",
              description: "ID of the folder to create the list in (required if not using spaceId). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            name: {
              type: "string",
              description: "Name of the list"
            },
            content: {
              type: "string",
              description: "Description or content of the list"
            },
            assignee: {
              type: "number",
              description: "User ID to assign the list to"
            },
            priority: {
              type: "number",
              description: "Priority of the list (1-4), where 1 is urgent/highest priority and 4 is lowest priority. Only set when explicitly requested."
            },
            dueDate: {
              type: "string",
              description: "Due date for the list (Unix timestamp in milliseconds). Convert dates to this format before submitting."
            },
            status: {
              type: "string",
              description: "Status of the list"
            }
          },
          allOf: [
            {
              oneOf: [
                { required: ["spaceId"] },
                { required: ["folderId"] }
              ]
            },
            {
              required: ["name"]
            }
          ]
        }
      },
      {
        name: "create_folder",
        description: "Create a new folder in a ClickUp space for organizing related lists. Use this tool when you need to group multiple lists together. Before calling, check if you already have the necessary space ID from previous responses in the conversation, as this avoids redundant lookups. After creating a folder, you can add lists to it using create_list_in_folder.",
        inputSchema: {
          type: "object",
          properties: {
            spaceId: {
              type: "string",
              description: "ID of the space to create the folder in (optional if using spaceName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            spaceName: {
              type: "string",
              description: "Name of the space to create the folder in - will automatically find the space by name (optional if using spaceId instead). Only use this if you don't already have the space ID from previous responses."
            },
            name: {
              type: "string",
              description: "Name of the folder"
            },
            override_statuses: {
              type: "boolean",
              description: "Whether to override space statuses with folder-specific statuses"
            }
          },
          required: ["name"],
          oneOf: [
            { required: ["spaceId"] },
            { required: ["spaceName"] }
          ]
        }
      },
      {
        name: "create_list_in_folder",
        description: "Create a new list within a ClickUp folder. Use this tool when you need to add a list to an existing folder structure. Before calling, check if you already have the necessary folder ID and space ID from previous responses in the conversation, as this avoids redundant lookups. For top-level lists not in folders, use create_list instead.",
        inputSchema: {
          type: "object",
          properties: {
            folderId: {
              type: "string",
              description: "ID of the folder to create the list in (optional if using folderName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            folderName: {
              type: "string",
              description: "Name of the folder to create the list in - will automatically find the folder by name (optional if using folderId instead). Only use this if you don't already have the folder ID from previous responses."
            },
            spaceId: {
              type: "string",
              description: "ID of the space containing the folder (optional if using spaceName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            spaceName: {
              type: "string",
              description: "Name of the space containing the folder - will automatically find the space by name (optional if using spaceId instead). Only use this if you don't already have the space ID from previous responses."
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
              description: "Status of the list (uses folder default if not specified)"
            }
          },
          required: ["name"],
          oneOf: [
            { required: ["folderId"] },
            { required: ["folderName", "spaceId"] },
            { required: ["folderName", "spaceName"] }
          ]
        }
      },
      {
        name: "move_task",
        description: "Move an existing task from its current list to a different list. Use this tool when you need to relocate a task within your workspace hierarchy. Before calling, check if you already have the necessary task ID and list ID from previous responses in the conversation, as this avoids redundant lookups. Task statuses may be reset if the destination list uses different status options.",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to move (optional if using taskName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            taskName: {
              type: "string",
              description: "Name of the task to move - will automatically find the task by name (optional if using taskId instead). Only use this if you don't already have the task ID from previous responses."
            },
            sourceListName: {
              type: "string",
              description: "Optional: Name of the source list to narrow down task search when multiple tasks have the same name"
            },
            listId: {
              type: "string",
              description: "ID of the destination list (optional if using listName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            listName: {
              type: "string",
              description: "Name of the destination list - will automatically find the list by name (optional if using listId instead). Only use this if you don't already have the list ID from previous responses."
            }
          },
          allOf: [
            {
              oneOf: [
                { required: ["taskId"] },
                { required: ["taskName"] }
              ]
            },
            {
              oneOf: [
                { required: ["listId"] },
                { required: ["listName"] }
              ]
            }
          ]
        }
      },
      {
        name: "duplicate_task",
        description: "Create a copy of an existing task in the same or different list. Use this tool when you need to replicate a task's content and properties. Before calling, check if you already have the necessary task ID and list ID from previous responses in the conversation, as this avoids redundant lookups. The duplicate will preserve name, description, priority, and other attributes from the original task.",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to duplicate (optional if using taskName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            taskName: {
              type: "string",
              description: "Name of the task to duplicate - will automatically find the task by name (optional if using taskId instead). Only use this if you don't already have the task ID from previous responses."
            },
            sourceListName: {
              type: "string",
              description: "Optional: Name of the source list to narrow down task search when multiple tasks have the same name"
            },
            listId: {
              type: "string",
              description: "ID of the list to create the duplicate in (optional if using listName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            listName: {
              type: "string",
              description: "Name of the list to create the duplicate in - will automatically find the list by name (optional if using listId instead). Only use this if you don't already have the list ID from previous responses."
            }
          },
          allOf: [
            {
              oneOf: [
                { required: ["taskId"] },
                { required: ["taskName"] }
              ]
            },
            {
              oneOf: [
                { required: ["listId"] },
                { required: ["listName"] }
              ]
            }
          ]
        }
      },
      {
        name: "update_task",
        description: "Modify the properties of an existing task. Use this tool when you need to change a task's name, description, status, priority, or due date. Before calling, check if you already have the necessary task ID from previous responses in the conversation, as this avoids redundant lookups. Only the fields you specify will be updated; other fields will remain unchanged.",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to update (optional if using taskName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            taskName: {
              type: "string",
              description: "Name of the task to update - will automatically find the task by name (optional if using taskId instead). Only use this if you don't already have the task ID from previous responses."
            },
            listName: {
              type: "string",
              description: "Optional: Name of the list to narrow down task search when multiple tasks have the same name"
            },
            name: {
              type: "string",
              description: "New name for the task"
            },
            description: {
              type: "string",
              description: "New plain text description for the task"
            },
            markdown_description: {
              type: "string",
              description: "New markdown formatted description for the task. If provided, this takes precedence over description"
            },
            status: {
              type: "string",
              description: "New status for the task (must be a valid status in the task's list)"
            },
            priority: {
              type: ["number", "null"],
              enum: [1, 2, 3, 4, null],
              description: "New priority for the task (1-4 or null), where 1 is urgent/highest priority and 4 is lowest priority. Set to null to clear priority.",
              optional: true
            }
          },
          oneOf: [
            { required: ["taskId"] },
            { required: ["taskName"] }
          ]
        }
      },
      {
        name: "get_tasks",
        description: "Retrieve tasks from a ClickUp list with optional filtering capabilities. Use this tool when you need to see existing tasks or analyze your current workload. Before calling, check if you already have the necessary list ID from previous responses in the conversation, as this avoids redundant lookups. Results can be filtered by status, assignees, dates, and more.",
        inputSchema: {
          type: "object",
          properties: {
            listId: {
              type: "string",
              description: "ID of the list to get tasks from (optional if using listName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            listName: {
              type: "string",
              description: "Name of the list to get tasks from - will automatically find the list by name (optional if using listId instead). Only use this if you don't already have the list ID from previous responses."
            },
            archived: {
              type: "boolean",
              description: "Set to true to include archived tasks in the results"
            },
            page: {
              type: "number",
              description: "Page number for pagination when dealing with many tasks (starts at 0)"
            },
            order_by: {
              type: "string",
              description: "Field to order tasks by (e.g., 'due_date', 'created', 'updated')"
            },
            reverse: {
              type: "boolean",
              description: "Set to true to reverse the sort order (descending instead of ascending)"
            },
            subtasks: {
              type: "boolean",
              description: "Set to true to include subtasks in the results"
            },
            statuses: {
              type: "array",
              items: { type: "string" },
              description: "Array of status names to filter tasks by (e.g., ['To Do', 'In Progress'])"
            },
            include_closed: {
              type: "boolean",
              description: "Set to true to include tasks with 'Closed' status"
            },
            assignees: {
              type: "array",
              items: { type: "string" },
              description: "Array of user IDs to filter tasks by assignee"
            },
            due_date_gt: {
              type: "number",
              description: "Filter tasks due after this timestamp (Unix milliseconds)"
            },
            due_date_lt: {
              type: "number",
              description: "Filter tasks due before this timestamp (Unix milliseconds)"
            },
            date_created_gt: {
              type: "number",
              description: "Filter tasks created after this timestamp (Unix milliseconds)"
            },
            date_created_lt: {
              type: "number",
              description: "Filter tasks created before this timestamp (Unix milliseconds)"
            },
            date_updated_gt: {
              type: "number",
              description: "Filter tasks updated after this timestamp (Unix milliseconds)"
            },
            date_updated_lt: {
              type: "number",
              description: "Filter tasks updated before this timestamp (Unix milliseconds)"
            },
            custom_fields: {
              type: "object",
              description: "Object with custom field IDs as keys and desired values for filtering"
            }
          },
          oneOf: [
            { required: ["listId"] },
            { required: ["listName"] }
          ]
        }
      },
      {
        name: "get_task",
        description: "Retrieve comprehensive details about a specific ClickUp task. Use this tool when you need in-depth information about a particular task, including its description, custom fields, attachments, and other metadata. Before calling, check if you already have the necessary task ID from previous responses in the conversation, as this avoids redundant lookups.",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to retrieve (optional if using taskName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            taskName: {
              type: "string",
              description: "Name of the task to retrieve - will automatically find the task by name (optional if using taskId instead). Only use this if you don't already have the task ID from previous responses."
            },
            listName: {
              type: "string",
              description: "Optional: Name of the list to narrow down task search when multiple tasks have the same name"
            }
          },
          oneOf: [
            { required: ["taskId"] },
            { required: ["taskName"] }
          ]
        }
      },
      {
        name: "delete_task",
        description: "Permanently remove a task from your ClickUp workspace. Use this tool with caution as deletion cannot be undone. Before calling, check if you already have the necessary task ID from previous responses in the conversation, as this avoids redundant lookups. For safety, the task ID is required.",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to delete - this is required for safety to prevent accidental deletions. If you have this ID from a previous response, use it directly."
            },
            taskName: {
              type: "string",
              description: "Name of the task to delete - will automatically find the task by name (optional if using taskId instead). Only use this if you don't already have the task ID from previous responses."
            },
            listName: {
              type: "string",
              description: "Optional: Name of the list to narrow down task search when multiple tasks have the same name"
            }
          },
          required: ["taskId"]
        }
      },
      {
        name: "get_folder",
        description: "Retrieve details about a specific ClickUp folder including its name, status, and other metadata. Before calling, check if you already have the necessary folder ID from previous responses in the conversation history, as this avoids redundant lookups. Helps you understand folder structure before creating or updating lists.",
        inputSchema: {
          type: "object",
          properties: {
            folderId: {
              type: "string",
              description: "ID of the folder to retrieve (optional if using folderName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            folderName: {
              type: "string",
              description: "Name of the folder to retrieve - will automatically find the folder by name (optional if using folderId instead). Only use this if you don't already have the folder ID from previous responses."
            },
            spaceId: {
              type: "string",
              description: "ID of the space containing the folder (optional if using spaceName instead, and only needed when using folderName). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            spaceName: {
              type: "string",
              description: "Name of the space containing the folder (optional if using spaceId instead, and only needed when using folderName). Only use this if you don't already have the space ID from previous responses."
            }
          },
          oneOf: [
            { required: ["folderId"] },
            { required: ["folderName", "spaceId"] },
            { required: ["folderName", "spaceName"] }
          ]
        }
      },
      {
        name: "update_folder",
        description: "Modify an existing ClickUp folder's properties, such as name or status settings. Before calling, check if you already have the necessary folder ID from previous responses in the conversation history, as this avoids redundant lookups. Use when reorganizing or renaming workspace elements.",
        inputSchema: {
          type: "object",
          properties: {
            folderId: {
              type: "string",
              description: "ID of the folder to update (optional if using folderName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            folderName: {
              type: "string",
              description: "Name of the folder to update - will automatically find the folder by name (optional if using folderId instead). Only use this if you don't already have the folder ID from previous responses."
            },
            spaceId: {
              type: "string",
              description: "ID of the space containing the folder (optional if using spaceName instead, and only needed when using folderName). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            spaceName: {
              type: "string", 
              description: "Name of the space containing the folder (optional if using spaceId instead, and only needed when using folderName). Only use this if you don't already have the space ID from previous responses."
            },
            name: {
              type: "string",
              description: "New name for the folder"
            },
            override_statuses: {
              type: "boolean",
              description: "Whether to override space statuses with folder-specific statuses"
            }
          },
          oneOf: [
            { required: ["folderId"] },
            { required: ["folderName", "spaceId"] },
            { required: ["folderName", "spaceName"] }
          ]
        }
      },
      {
        name: "delete_folder",
        description: "Permanently remove a folder from your ClickUp workspace. Use with caution as deletion cannot be undone and will remove all lists and tasks within the folder. Before calling, check if you already have the necessary folder ID from previous responses in the conversation history, as this avoids redundant lookups.",
        inputSchema: {
          type: "object",
          properties: {
            folderId: {
              type: "string",
              description: "ID of the folder to delete (optional if using folderName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            folderName: {
              type: "string",
              description: "Name of the folder to delete - will automatically find the folder by name (optional if using folderId instead). Only use this if you don't already have the folder ID from previous responses."
            },
            spaceId: {
              type: "string",
              description: "ID of the space containing the folder (optional if using spaceName instead, and only needed when using folderName). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            spaceName: {
              type: "string",
              description: "Name of the space containing the folder (optional if using spaceId instead, and only needed when using folderName). Only use this if you don't already have the space ID from previous responses."
            }
          },
          oneOf: [
            { required: ["folderId"] },
            { required: ["folderName", "spaceId"] },
            { required: ["folderName", "spaceName"] }
          ]
        }
      },
      {
        name: "get_list",
        description: "Retrieve details about a specific ClickUp list including its name, content, status options, and other metadata. Before calling, check if you already have the necessary list ID from previous responses in the conversation history, as this avoids redundant lookups. Useful to understand list structure before creating or updating tasks.",
        inputSchema: {
          type: "object",
          properties: {
            listId: {
              type: "string",
              description: "ID of the list to retrieve (optional if using listName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            listName: {
              type: "string",
              description: "Name of the list to retrieve - will automatically find the list by name (optional if using listId instead). Only use this if you don't already have the list ID from previous responses."
            }
          },
          oneOf: [
            { required: ["listId"] },
            { required: ["listName"] }
          ]
        }
      },
      {
        name: "update_list",
        description: "Modify an existing ClickUp list's properties, such as name, content, or status options. Before calling, check if you already have the necessary list ID from previous responses in the conversation history, as this avoids redundant lookups. Use when reorganizing or renaming workspace elements.",
        inputSchema: {
          type: "object",
          properties: {
            listId: {
              type: "string",
              description: "ID of the list to update (optional if using listName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            listName: {
              type: "string",
              description: "Name of the list to update - will automatically find the list by name (optional if using listId instead). Only use this if you don't already have the list ID from previous responses."
            },
            name: {
              type: "string",
              description: "New name for the list"
            },
            content: {
              type: "string",
              description: "New description or content for the list"
            },
            status: {
              type: "string",
              description: "New status for the list"
            }
          },
          oneOf: [
            { required: ["listId"] },
            { required: ["listName"] }
          ]
        }
      },
      {
        name: "delete_list",
        description: "Permanently remove a list from your ClickUp workspace. Use with caution as deletion cannot be undone and will remove all tasks within the list. Before calling, check if you already have the necessary list ID from previous responses in the conversation history, as this avoids redundant lookups.",
        inputSchema: {
          type: "object",
          properties: {
            listId: {
              type: "string",
              description: "ID of the list to delete (optional if using listName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
            },
            listName: {
              type: "string",
              description: "Name of the list to delete - will automatically find the list by name (optional if using listId instead). Only use this if you don't already have the list ID from previous responses."
            }
          },
          oneOf: [
            { required: ["listId"] },
            { required: ["listName"] }
          ]
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
        const args = request.params.arguments as unknown as { listId?: string; listName?: string; tasks: CreateTaskData[] };
        
        // First validate tasks array
        if (!args.tasks || !Array.isArray(args.tasks) || args.tasks.length === 0) {
          throw new Error("tasks array is required and must not be empty");
        }

        // Validate each task has required fields
        args.tasks.forEach((task, index) => {
          if (!task.name) {
            throw new Error(`Task at index ${index} is missing required field 'name'`);
          }
        });

        // Get listId from name if needed
        let listId = args.listId;
        if (!listId && args.listName) {
          const result = await clickup.findListIDByName(args.listName);
          if (!result) {
            throw new Error(`List with name "${args.listName}" not found`);
          }
          listId = result.id;
        }

        // Now validate we have a listId
        if (!listId) {
          throw new Error("Either listId or listName must be provided");
        }

        const { listId: _, listName: __, tasks } = args;
        const createdTasks = await clickup.createBulkTasks(listId, { tasks });
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              message: `Created ${createdTasks.length} tasks`,
              tasks: createdTasks.map(task => ({
                id: task.id,
                name: task.name,
                url: task.url
              }))
            }, null, 2)
          }]
        };
      }

      case "create_list": {
        interface CreateListArgs {
          spaceId?: string;
          spaceName?: string;
          folderId?: string;
          folderName?: string;
          name: string;
          content?: string;
          dueDate?: number;
          priority?: TaskPriority;
          assignee?: number;
          status?: string;
        }

        const args = request.params.arguments ? request.params.arguments as unknown as CreateListArgs : { name: '' };
        
        if (!args.name) {
          throw new Error("List name is required");
        }

        // Validate that we have either spaceId/spaceName OR folderId/folderName, but not both
        const hasSpace = !!(args.spaceId || args.spaceName);
        const hasFolder = !!(args.folderId || args.folderName);
        
        if (!hasSpace && !hasFolder) {
          throw new Error("Either spaceId/spaceName or folderId/folderName must be provided");
        }
        if (hasSpace && hasFolder) {
          throw new Error("Cannot provide both space and folder identifiers. Use either spaceId/spaceName OR folderId/folderName");
        }

        // Prepare the list data
        const listData: CreateListData = {
          name: args.name,
          content: args.content,
          due_date: args.dueDate,
          priority: args.priority,
          assignee: args.assignee,
          status: args.status
        };

        let list: ClickUpList;

        if (hasSpace) {
          // Handle space-based creation
          let spaceId = args.spaceId;
          if (!spaceId && args.spaceName) {
            const teamId = await clickup.getTeamId();
            const space = await clickup.findSpaceByName(args.spaceName, teamId);
            if (!space) {
              throw new Error(`Space with name "${args.spaceName}" not found`);
            }
            spaceId = space.id;
          }
          list = await clickup.createList(spaceId!, listData);
        } else {
          // Handle folder-based creation
          let folderId = args.folderId;
          if (!folderId && args.folderName) {
            const result = await clickup.findFolderIDByName(args.folderName);
            if (!result) {
              throw new Error(`Folder with name "${args.folderName}" not found`);
            }
            folderId = result.id;
          }
          list = await clickup.createListInFolder(folderId!, listData);
        }

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
        const args = request.params.arguments as UpdateTaskData & { 
          taskId?: string;
          taskName?: string;
          listName?: string;
        };

        // Require either taskId or taskName
        if (!args.taskId && !args.taskName) {
          throw new Error("Either taskId or taskName is required");
        }

        // Get taskId from taskName if needed
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

        // Remove helper fields before updating
        const { taskId: _, taskName: __, listName: ___, ...updateData } = args;

        // Ensure priority is properly handled
        if (updateData.priority !== undefined && updateData.priority !== null) {
          const priority = Number(updateData.priority);
          if (isNaN(priority) || ![1, 2, 3, 4].includes(priority)) {
            throw new Error("Priority must be a number between 1 and 4, or null to clear priority");
          }
          updateData.priority = priority as TaskPriority;
        }

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

        // Enforce required listName field as specified in the schema
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

        // Enforce required taskName field as specified in the schema
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
          taskId: string; // Make taskId required
          taskName?: string;
          listName?: string;
        };

        // Validate the required taskId parameter
        if (!args.taskId) {
          throw new Error("taskId is required for deletion operations");
        }

        // Store the task name before deletion for the response message
        let taskName = args.taskName;
        if (!taskName) {
          try {
            const task = await clickup.getTask(args.taskId);
            taskName = task.name;
          } catch (error) {
            // If we can't get the task details, just use the ID in the response
          }
        }

        await clickup.deleteTask(args.taskId);
        return {
          content: [{
            type: "text",
            text: `Successfully deleted task ${taskName || args.taskId}`
          }]
        };
      }

      case "get_folder": {
        const args = request.params.arguments as { 
          folderId?: string;
          folderName?: string;
          spaceId?: string;
          spaceName?: string;
        };

        if (!args.folderId && !args.folderName) {
          throw new Error("Either folderId or folderName is required");
        }

        let folderId = args.folderId;
        if (!folderId && args.folderName) {
          // If we need to look up by name, we might need the space
          let spaceId = args.spaceId;
          if (!spaceId && args.spaceName) {
            const foundId = await clickup.findSpaceIDByName(args.spaceName);
            if (!foundId) {
              throw new Error(`Space with name "${args.spaceName}" not found`);
            }
            spaceId = foundId;
          }
          
          if (!spaceId) {
            // Try to find folder directly by name (will search across all spaces)
            const result = await clickup.findFolderIDByName(args.folderName);
            if (!result) {
              throw new Error(`Folder with name "${args.folderName}" not found`);
            }
            folderId = result.id;
          } else {
            // Look in a specific space
            const folder = await clickup.findFolderByName(spaceId, args.folderName);
            if (!folder) {
              throw new Error(`Folder with name "${args.folderName}" not found in specified space`);
            }
            folderId = folder.id;
          }
        }

        // Ensure folderId is defined at this point
        if (!folderId) {
          throw new Error("Failed to determine folder ID");
        }

        const folder = await clickup.getFolder(folderId);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(folder, null, 2)
          }]
        };
      }

      case "update_folder": {
        const args = request.params.arguments as { 
          folderId?: string;
          folderName?: string;
          spaceId?: string;
          spaceName?: string;
          name?: string;
          override_statuses?: boolean;
        };

        if (!args.folderId && !args.folderName) {
          throw new Error("Either folderId or folderName is required");
        }

        let folderId = args.folderId;
        if (!folderId && args.folderName) {
          // If we need to look up by name, we might need the space
          let spaceId = args.spaceId;
          if (!spaceId && args.spaceName) {
            const foundId = await clickup.findSpaceIDByName(args.spaceName);
            if (!foundId) {
              throw new Error(`Space with name "${args.spaceName}" not found`);
            }
            spaceId = foundId;
          }
          
          if (!spaceId) {
            // Try to find folder directly by name (will search across all spaces)
            const result = await clickup.findFolderIDByName(args.folderName);
            if (!result) {
              throw new Error(`Folder with name "${args.folderName}" not found`);
            }
            folderId = result.id;
          } else {
            // Look in a specific space
            const folder = await clickup.findFolderByName(spaceId, args.folderName);
            if (!folder) {
              throw new Error(`Folder with name "${args.folderName}" not found in specified space`);
            }
            folderId = folder.id;
          }
        }

        // Ensure folderId is defined at this point
        if (!folderId) {
          throw new Error("Failed to determine folder ID");
        }

        // Extract update data
        const { folderId: _, folderName: __, spaceId: ___, spaceName: ____, ...updateData } = args;
        
        // Call the updateFolder method
        const updatedFolder = await clickup.updateFolder(folderId, updateData);
        return {
          content: [{
            type: "text",
            text: `Updated folder ${updatedFolder.id}: ${updatedFolder.name}`
          }]
        };
      }

      case "delete_folder": {
        const args = request.params.arguments as { 
          folderId?: string;
          folderName?: string;
          spaceId?: string;
          spaceName?: string;
        };

        if (!args.folderId && !args.folderName) {
          throw new Error("Either folderId or folderName is required");
        }

        let folderId = args.folderId;
        if (!folderId && args.folderName) {
          // If we need to look up by name, we might need the space
          let spaceId = args.spaceId;
          if (!spaceId && args.spaceName) {
            const foundId = await clickup.findSpaceIDByName(args.spaceName);
            if (!foundId) {
              throw new Error(`Space with name "${args.spaceName}" not found`);
            }
            spaceId = foundId;
          }
          
          if (!spaceId) {
            // Try to find folder directly by name (will search across all spaces)
            const result = await clickup.findFolderIDByName(args.folderName);
            if (!result) {
              throw new Error(`Folder with name "${args.folderName}" not found`);
            }
            folderId = result.id;
          } else {
            // Look in a specific space
            const folder = await clickup.findFolderByName(spaceId, args.folderName);
            if (!folder) {
              throw new Error(`Folder with name "${args.folderName}" not found in specified space`);
            }
            folderId = folder.id;
          }
        }

        // Ensure folderId is defined at this point
        if (!folderId) {
          throw new Error("Failed to determine folder ID");
        }

        // Store the folder name before deletion for the response message
        let folderName = args.folderName;
        if (!folderName) {
          try {
            const folderDetails = await clickup.getFolder(folderId);
            folderName = folderDetails.name;
          } catch (error) {
            // If we can't get the folder details, just use the ID in the response
          }
        }

        await clickup.deleteFolder(folderId);
        return {
          content: [{
            type: "text",
            text: `Successfully deleted folder ${folderName || folderId}`
          }]
        };
      }

      case "get_list": {
        const args = request.params.arguments as { 
          listId?: string;
          listName?: string;
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

        // Ensure listId is defined at this point
        if (!listId) {
          throw new Error("Failed to determine list ID");
        }

        const listDetails = await clickup.getList(listId);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(listDetails, null, 2)
          }]
        };
      }

      case "update_list": {
        const args = request.params.arguments as { 
          listId?: string;
          listName?: string;
          name?: string;
          content?: string;
          status?: string;
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

        // Ensure listId is defined at this point
        if (!listId) {
          throw new Error("Failed to determine list ID");
        }

        // Extract update data
        const { listId: _, listName: __, ...updateData } = args;
        const updatedList = await clickup.updateList(listId, updateData);
        return {
          content: [{
            type: "text",
            text: `Updated list ${updatedList.id}: ${updatedList.name}`
          }]
        };
      }

      case "delete_list": {
        const args = request.params.arguments as { 
          listId?: string;
          listName?: string;
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

        // Ensure listId is defined at this point
        if (!listId) {
          throw new Error("Failed to determine list ID");
        }

        // Store the list name before deletion for the response message
        let listName = args.listName;
        if (!listName) {
          try {
            const listDetails = await clickup.getList(listId);
            listName = listDetails.name;
          } catch (error) {
            // If we can't get the list details, just use the ID in the response
          }
        }

        await clickup.deleteList(listId);
        return {
          content: [{
            type: "text",
            text: `Successfully deleted list ${listName || listId}`
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
        description: "Generate a comprehensive summary of tasks in a ClickUp list or workspace. The summary includes a high-level overview, groups tasks by status, highlights priority items, and identifies potential task relationships or dependencies. Useful for project status reports and team updates.",
      },
      {
        name: "analyze_priorities",
        description: "Evaluate task priority distribution across your workspace and identify optimization opportunities. The analysis examines current priority assignments, identifies misaligned priorities, suggests adjustments, and recommends task sequencing based on priorities. Helpful for workload management and project planning.",
      },
      {
        name: "generate_description",
        description: "Create a detailed, well-structured task description with clearly defined objectives, success criteria, required resources, dependencies, and risk assessments. This prompt helps ensure tasks are comprehensively documented with all necessary information for successful execution.",
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

