#!/usr/bin/env node

/**
 * This is a template MCP server that implements a simple ClickUp task management system.
 * It demonstrates core MCP concepts like resources, tools, and prompts by allowing:
 * - Listing ClickUp tasks as resources
 * - Reading individual ClickUp tasks
 * - Creating new ClickUp tasks via a tool
 * - Updating existing ClickUp tasks via a tool
 * - Summarizing all ClickUp tasks via a prompt
 * - Analyzing task priorities via a prompt
 * - Generating detailed descriptions for tasks via a prompt
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ClickUpService } from "./services/clickup.js";
import config from "./config.js";
import { CreateTaskData, UpdateTaskData, ClickUpTask, CreateListData, CreateFolderData, BulkCreateTasksData } from "./types/clickup.js";

/**
 * Type alias for a note object.
 */
type Note = { title: string, content: string };

/**
 * Simple in-memory storage for notes.
 * In a real implementation, this would likely be backed by a database.
 */
const notes: { [id: string]: Note } = {
  "1": { title: "First Note", content: "This is note 1" },
  "2": { title: "Second Note", content: "This is note 2" }
};

// Initialize ClickUp service
const clickup = ClickUpService.initialize(config.clickupApiKey);

/**
 * Create an MCP server with capabilities for resources (to list/read ClickUp tasks),
 * tools (to create/update ClickUp tasks), and prompts (to summarize/analyze ClickUp tasks).
 */
const server = new Server(
  {
    name: "clickup-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

/**
 * Handler for listing available ClickUp tasks as resources.
 * Each task is exposed as a resource with:
 * - A clickup:// URI scheme
 * - JSON MIME type
 * - Human readable name and description (including the task name and description)
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    const spaces = await clickup.getSpaces(config.teamId);
    const resources = [];

    for (const space of spaces) {
      const lists = await clickup.getLists(space.id);
      for (const list of lists) {
        const { tasks } = await clickup.getTasks(list.id);
        resources.push(...tasks.map((task: ClickUpTask) => ({
          uri: `clickup://task/${task.id}`,
          mimeType: "application/json",
          name: task.name,
          description: task.description || `Task in ${list.name} (${space.name})`,
          tags: []
        })));
      }
    }

    return { resources };
  } catch (error) {
    console.error('Error listing resources:', error);
    throw error;
  }
});

/**
 * Handler for reading the contents of a specific ClickUp task.
 * Takes a clickup:// URI and returns the task content as JSON.
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  try {
    const url = new URL(request.params.uri);
    const taskId = url.pathname.replace(/^\/task\//, '');
    const task = await clickup.getTask(taskId);

    return {
      contents: [{
        uri: request.params.uri,
        mimeType: "application/json",
        text: JSON.stringify(task, null, 2),
        tags: []
      }]
    };
  } catch (error) {
    console.error('Error reading resource:', error);
    throw error;
  }
});

/**
 * Handler that lists available tools.
 * Exposes tools for listing spaces, creating tasks, and updating tasks.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_spaces",
        description: "List all spaces and their lists with IDs",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "create_task",
        description: "Create a new task in ClickUp",
        inputSchema: {
          type: "object",
          properties: {
            listId: {
              type: "string",
              description: "ID of the list to create the task in"
            },
            name: {
              type: "string",
              description: "Name of the task"
            },
            description: {
              type: "string",
              description: "Description of the task"
            },
            status: {
              type: "string",
              description: "Status of the task"
            },
            priority: {
              type: "number",
              description: "Priority of the task (1-4)"
            },
            dueDate: {
              type: "string",
              description: "Due date of the task (ISO string)"
            }
          },
          required: ["listId", "name"]
        }
      },
      {
        name: "create_bulk_tasks",
        description: "Create multiple tasks in a ClickUp list",
        inputSchema: {
          type: "object",
          properties: {
            listId: {
              type: "string",
              description: "ID of the list to create the tasks in"
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
                    description: "Description of the task"
                  },
                  status: {
                    type: "string",
                    description: "Status of the task"
                  },
                  priority: {
                    type: "number",
                    description: "Priority level (1-4)"
                  },
                  dueDate: {
                    type: "string",
                    description: "Due date of the task (ISO string)"
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
        description: "Create a new list in a ClickUp space",
        inputSchema: {
          type: "object",
          properties: {
            spaceId: {
              type: "string",
              description: "ID of the space to create the list in (optional if spaceName is provided)"
            },
            spaceName: {
              type: "string",
              description: "Name of the space to create the list in (optional if spaceId is provided)"
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
              description: "Priority of the list (1-4)"
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
        description: "Create a new folder in a ClickUp space",
        inputSchema: {
          type: "object",
          properties: {
            spaceId: {
              type: "string",
              description: "ID of the space to create the folder in (optional if spaceName is provided)"
            },
            spaceName: {
              type: "string",
              description: "Name of the space to create the folder in (optional if spaceId is provided)"
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
        description: "Create a new list in a ClickUp folder",
        inputSchema: {
          type: "object",
          properties: {
            folderId: {
              type: "string",
              description: "ID of the folder to create the list in (optional if folderName and spaceId/spaceName are provided)"
            },
            folderName: {
              type: "string",
              description: "Name of the folder to create the list in"
            },
            spaceId: {
              type: "string",
              description: "ID of the space containing the folder (required if using folderName)"
            },
            spaceName: {
              type: "string",
              description: "Name of the space containing the folder (alternative to spaceId)"
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
        description: "Move a task to a different list",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to move"
            },
            listId: {
              type: "string",
              description: "ID of the destination list"
            }
          },
          required: ["taskId", "listId"]
        }
      },
      {
        name: "duplicate_task",
        description: "Duplicate a task to a list",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to duplicate"
            },
            listId: {
              type: "string",
              description: "ID of the list to create the duplicate in"
            }
          },
          required: ["taskId", "listId"]
        }
      },
      {
        name: "update_task",
        description: "Update an existing task in ClickUp",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "ID of the task to update"
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
              description: "New priority of the task (1-4)"
            },
            dueDate: {
              type: "string",
              description: "New due date of the task (ISO string)"
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
      case "list_spaces": {
        const spaces = await clickup.getSpaces(config.teamId);
        const allLists = await clickup.getAllLists(config.teamId);
        let output = "Available Spaces and Lists:\n\n";

        for (const space of spaces) {
          output += `Space: ${space.name} (ID: ${space.id})\n`;
          const spaceLists = allLists.filter(list => list.space.id === space.id);
          
          for (const list of spaceLists) {
            const { statuses } = await clickup.getTasks(list.id);
            output += `  └─ List: ${list.name} (ID: ${list.id})\n`;
            output += `    Available Statuses: ${statuses.join(', ')}\n`;
          }
          output += "\n";
        }

        // Add lists without spaces at the end
        const listsWithoutSpace = allLists.filter(list => !list.space);
        if (listsWithoutSpace.length > 0) {
          output += "Lists without assigned spaces:\n";
          for (const list of listsWithoutSpace) {
            const { statuses } = await clickup.getTasks(list.id);
            output += `  └─ List: ${list.name} (ID: ${list.id})\n`;
            output += `    Available Statuses: ${statuses.join(', ')}\n`;
          }
        }

        return {
          content: [{
            type: "text",
            text: output
          }]
        };
      }

      case "create_task": {
        const args = request.params.arguments as unknown as CreateTaskData & { listId: string };
        if (!args.listId || !args.name) {
          throw new Error("listId and name are required");
        }
        const { listId, ...taskData } = args;
        const task = await clickup.createTask(listId, taskData);
        return {
          content: [{
            type: "text",
            text: `Created task ${task.id}: ${task.name}`
          }]
        };
      }

      case "create_bulk_tasks": {
        const args = request.params.arguments as unknown as BulkCreateTasksData & { listId: string };
        if (!args.listId || !args.tasks || !args.tasks.length) {
          throw new Error("listId and at least one task are required");
        }
        const { listId, tasks } = args;
        const createdTasks = await clickup.createBulkTasks(listId, { tasks });
        return {
          content: [{
            type: "text",
            text: `Created ${createdTasks.length} tasks:\n${createdTasks.map(task => `- ${task.id}: ${task.name}`).join('\n')}`
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
          const space = await clickup.findSpaceByName(config.teamId, args.spaceName);
          if (!space) {
            throw new Error(`Space with name "${args.spaceName}" not found`);
          }
          spaceId = space.id;
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
          const space = await clickup.findSpaceByName(config.teamId, args.spaceName);
          if (!space) {
            throw new Error(`Space with name "${args.spaceName}" not found`);
          }
          spaceId = space.id;
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
          let spaceId = args.spaceId;
          if (!spaceId && args.spaceName) {
            const space = await clickup.findSpaceByName(config.teamId, args.spaceName);
            if (!space) {
              throw new Error(`Space with name "${args.spaceName}" not found`);
            }
            spaceId = space.id;
          }
          
          if (!spaceId) {
            throw new Error("Either spaceId or spaceName must be provided when using folderName");
          }

          const folder = await clickup.findFolderByName(spaceId, args.folderName);
          if (!folder) {
            throw new Error(`Folder with name "${args.folderName}" not found`);
          }
          folderId = folder.id;
        }

        if (!folderId) {
          throw new Error("Either folderId or folderName (with space information) must be provided");
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
        const args = request.params.arguments as { taskId: string; listId: string };
        if (!args.taskId || !args.listId) {
          throw new Error("taskId and listId are required");
        }
        const task = await clickup.moveTask(args.taskId, args.listId);
        return {
          content: [{
            type: "text",
            text: `Moved task ${task.id} to list ${args.listId}`
          }]
        };
      }

      case "duplicate_task": {
        const args = request.params.arguments as { taskId: string; listId: string };
        if (!args.taskId || !args.listId) {
          throw new Error("taskId and listId are required");
        }
        const task = await clickup.duplicateTask(args.taskId, args.listId);
        return {
          content: [{
            type: "text",
            text: `Duplicated task ${args.taskId} to new task ${task.id} in list ${args.listId}`
          }]
        };
      }

      case "update_task": {
        const args = request.params.arguments as unknown as UpdateTaskData & { taskId: string };
        if (!args.taskId) {
          throw new Error("taskId is required");
        }
        const { taskId, ...updateData } = args;
        const task = await clickup.updateTask(taskId, updateData);
        return {
          content: [{
            type: "text",
            text: `Updated task ${task.id}: ${task.name}`
          }]
        };
      }

      default:
        throw new Error("Unknown tool");
    }
  } catch (error) {
    console.error('Error handling tool call:', error);
    throw error;
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
        const spaces = await clickup.getSpaces(config.teamId);
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
        const spaces = await clickup.getSpaces(config.teamId);
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
                text: "Please analyze the priorities of the following ClickUp tasks:"
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
